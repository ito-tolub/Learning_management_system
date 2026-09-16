import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { Line } from "rc-progress";
import Footer from "../../components/student/Footer";
import { toast } from "react-toastify";
import axios from "axios";

const HYBRID_WEIGHT = {
  vark: 0.7,
  instructional: 0.3,
};

const MAX_ADDITIONAL_LECTURES = 4;
const MENTAL_REFERENCE_VALUE = 84;

const MAIN_LECTURE_IDS_BY_CHAPTER = {
  pertemuan1: ["op1.1", "op1.2"],
  pertemuan2: ["op2.1", "op2.2"],
  pertemuan3: ["op3.29", "op3.30", "op3.31"],
  pertemuan4: ["op4.25", "op4.24"],
  pertemuan5: ["op5.25", "op5.24"],
  pertemuan6: ["op6.25", "op6.24"],
  pertemuan7: ["op7.22", "op7.21"],
};

// Menyamakan format VARK:
// V / Visual, A / Auditory, R / Read-Write, K / Kinesthetic
const normalizeVark = (value) => {
  if (!value) return null;

  const normalizedValue = String(value).toLowerCase().trim();

  if (normalizedValue === "v" || normalizedValue.startsWith("vis")) {
    return "V";
  }

  if (normalizedValue === "a" || normalizedValue.startsWith("aud")) {
    return "A";
  }

  if (normalizedValue === "r" || normalizedValue.startsWith("read")) {
    return "R";
  }

  if (normalizedValue === "k" || normalizedValue.startsWith("kine")) {
    return "K";
  }

  return String(value).toUpperCase().charAt(0);
};

const cosineSimilarity = (userVector, objectVector) => {
  if (!userVector || !objectVector) return 0;

  const keys = ["V", "A", "R", "K"];
  const user = keys.map((key) => Number(userVector[key] || 0));
  const object = keys.map((key) => Number(objectVector[key] || 0));

  const dot = user.reduce(
    (sum, value, index) => sum + value * object[index],
    0,
  );

  const userNorm = Math.sqrt(
    user.reduce((sum, value) => sum + value ** 2, 0),
  );
  const objectNorm = Math.sqrt(
    object.reduce((sum, value) => sum + value ** 2, 0),
  );

  if (userNorm === 0 || objectNorm === 0) return 0;

  return dot / (userNorm * objectNorm);
};

const getInstructionalProfile = (mentalKepribadian) => {
  const score = Number(mentalKepribadian);

  if (!Number.isFinite(score)) return null;

  return {
    contentGranularity: score >= MENTAL_REFERENCE_VALUE ? "utuh" : "tersegmentasi",
    cognitiveLevel: score >= MENTAL_REFERENCE_VALUE ? "C4-C6" : "C1-C3",
  };
};

const getInstructionalCompatibility = (lecture, profile) => {
  if (!lecture || !profile) return 0;

  const modality = normalizeVark(lecture.tags);

  if (modality === "K") {
    return lecture.cognitiveLevel === profile.cognitiveLevel ? 1 : 0;
  }

  if (["V", "A", "R"].includes(modality)) {
    return lecture.contentGranularity === profile.contentGranularity ? 1 : 0;
  }

  return 0;
};

// Memilih materi utama dengan aturan yang sama seperti Player.jsx.
// Jika lectureId muncul lebih dari sekali, gunakan lectureOrder terkecil.
const getChapterLectureGroups = (chapter) => {
  const lectures = Array.isArray(chapter?.chapterContent)
    ? chapter.chapterContent
    : [];

  const lecturesWithIndex = lectures.map((lecture, index) => ({
    ...lecture,
    _sourceIndex: index,
  }));

  const mainLectureIds = MAIN_LECTURE_IDS_BY_CHAPTER[chapter?.chapterId] || [];

  const mainLectures = mainLectureIds
    .map((lectureId) => {
      const matchingLectures = lecturesWithIndex
        .filter((lecture) => lecture?.lectureId === lectureId)
        .sort((a, b) => {
          const orderA = Number(a?.lectureOrder);
          const orderB = Number(b?.lectureOrder);
          const normalizedOrderA = Number.isFinite(orderA)
            ? orderA
            : Number.POSITIVE_INFINITY;
          const normalizedOrderB = Number.isFinite(orderB)
            ? orderB
            : Number.POSITIVE_INFINITY;

          if (normalizedOrderA !== normalizedOrderB) {
            return normalizedOrderA - normalizedOrderB;
          }

          return a._sourceIndex - b._sourceIndex;
        });

      return matchingLectures[0];
    })
    .filter(Boolean);

  const mainLectureIndexes = new Set(
    mainLectures.map((lecture) => lecture._sourceIndex),
  );

  const additionalLectures = lecturesWithIndex.filter(
    (lecture) => !mainLectureIndexes.has(lecture._sourceIndex),
  );

  return { mainLectures, additionalLectures };
};

// G1 = materi utama + maksimal 4 materi tambahan bebas per pertemuan.
const calculateG1EnrollmentProgress = (
  course,
  completedLectureIds = [],
) => {
  if (!Array.isArray(course?.courseContent)) {
    return { totalLectures: 0, lectureCompleted: 0 };
  }

  const completedSet = new Set(completedLectureIds.filter(Boolean));

  return Object.keys(MAIN_LECTURE_IDS_BY_CHAPTER).reduce(
    (progress, chapterId) => {
      const chapter = course.courseContent.find(
        (item) => item?.chapterId === chapterId,
      );

      if (!chapter) return progress;

      const { mainLectures, additionalLectures } =
        getChapterLectureGroups(chapter);

      const completedMainCount = mainLectures.filter((lecture) =>
        completedSet.has(lecture?.lectureId),
      ).length;

      // Progress backend disimpan berdasarkan lectureId, jadi tambahan dihitung
      // berdasarkan lectureId unik agar satu ID duplikat tidak dihitung dua kali.
      const additionalLectureIds = [
        ...new Set(
          additionalLectures
            .map((lecture) => lecture?.lectureId)
            .filter(Boolean),
        ),
      ];

      const additionalTarget = Math.min(
        MAX_ADDITIONAL_LECTURES,
        additionalLectureIds.length,
      );

      const completedAdditionalCount = Math.min(
        MAX_ADDITIONAL_LECTURES,
        additionalLectureIds.filter((lectureId) =>
          completedSet.has(lectureId),
        ).length,
      );

      progress.totalLectures += mainLectures.length + additionalTarget;
      progress.lectureCompleted +=
        completedMainCount + completedAdditionalCount;

      return progress;
    },
    { totalLectures: 0, lectureCompleted: 0 },
  );
};

// G2 = materi utama + maksimal 4 objek rekomendasi hybrid per pertemuan.
// Formula ranking disamakan dengan Player.jsx: 0.7 VARK + 0.3 instructional.
const calculateG2EnrollmentProgress = (
  course,
  completedLectureIds = [],
  userVarkVector = null,
  mentalKepribadian = null,
) => {
  if (!Array.isArray(course?.courseContent)) {
    return { totalLectures: 0, lectureCompleted: 0 };
  }

  const completedSet = new Set(completedLectureIds.filter(Boolean));
  const instructionalProfile = getInstructionalProfile(mentalKepribadian);

  return Object.keys(MAIN_LECTURE_IDS_BY_CHAPTER).reduce(
    (progress, chapterId) => {
      const chapter = course.courseContent.find(
        (item) => item?.chapterId === chapterId,
      );

      if (!chapter) return progress;

      const { mainLectures, additionalLectures } =
        getChapterLectureGroups(chapter);

      const completedMainCount = mainLectures.filter((lecture) =>
        completedSet.has(lecture?.lectureId),
      ).length;

      const recommendedLectures = userVarkVector
        ? additionalLectures
            .filter((lecture) => lecture?.lectureId && lecture?.varkvektor)
            .map((lecture) => {
              const varkSimilarity = cosineSimilarity(
                userVarkVector,
                lecture.varkvektor,
              );

              const instructionalCompatibility =
                getInstructionalCompatibility(
                  lecture,
                  instructionalProfile,
                );

              const hybridScore =
                HYBRID_WEIGHT.vark * varkSimilarity +
                HYBRID_WEIGHT.instructional * instructionalCompatibility;

              return {
                ...lecture,
                _hybridScore: hybridScore,
              };
            })
            .sort((a, b) => {
              if (b._hybridScore !== a._hybridScore) {
                return b._hybridScore - a._hybridScore;
              }

              return a._sourceIndex - b._sourceIndex;
            })
            .slice(0, MAX_ADDITIONAL_LECTURES)
        : [];

      const completedRecommendedCount = recommendedLectures.filter((lecture) =>
        completedSet.has(lecture?.lectureId),
      ).length;

      progress.totalLectures += mainLectures.length + recommendedLectures.length;
      progress.lectureCompleted +=
        completedMainCount + completedRecommendedCount;

      return progress;
    },
    { totalLectures: 0, lectureCompleted: 0 },
  );
};

// Fallback untuk kelas lain: mempertahankan perilaku lama berbasis VARK dominan.
const getAllLectures = (course) => {
  if (!Array.isArray(course?.courseContent)) {
    return [];
  }

  return course.courseContent
    .filter((chapter) => {
      const chapterOrder = Number(chapter?.chapterOrder);

      return (
        chapterOrder > 2 &&
        chapter?.chapterId !== "pertemuan1" &&
        chapter?.chapterId !== "pertemuan2"
      );
    })
    .flatMap((chapter) =>
      Array.isArray(chapter?.chapterContent)
        ? chapter.chapterContent
        : [],
    );
};

const getDominantLectures = (course, dominant) => {
  const normalizedDominant = normalizeVark(dominant);

  if (!normalizedDominant) {
    return [];
  }

  return getAllLectures(course).filter((lecture) => {
    return normalizeVark(lecture?.tags) === normalizedDominant;
  });
};

const MyEnrollment = () => {
  const {
    enrolledCourses,
    calculateCourseDuration,
    navigate,
    userData,
    fetUserEnrolledCourses,
    backendUrl,
    getToken,
  } = useContext(AppContext);

  const [progressArray, setProgressArray] = useState([]);

  const dominant =
    userData?.varkResult?.dominant ||
    userData?.vark?.dominant ||
    userData?.dominantVark ||
    null;

  const userVarkVector = userData?.varkResult?.scores || null;

  const userClass = String(userData?.kelas || "")
    .trim()
    .toUpperCase();

  const getCourseProgress = async () => {
    try {
      const token = await getToken();

      const tempProgressArray = await Promise.all(
        enrolledCourses.map(async (course) => {
          const { data } = await axios.post(
            `${backendUrl}/api/user/get-course-progress`,
            {
              courseId: course._id,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!data.success) {
            throw new Error(
              data.message || "Gagal mengambil progress course"
            );
          }

          // Semua lecture yang pernah diselesaikan user
          const completedLectureIds =
            data.progressData?.lectureCompleted || [];

          // G1: materi utama + maksimal 4 materi tambahan bebas
          // pada setiap pertemuan 1 sampai 7.
          if (userClass === "G1") {
            const g1Progress = calculateG1EnrollmentProgress(
              course,
              completedLectureIds,
            );

            return {
              ...g1Progress,
              classGroup: userClass,
            };
          }

          // G2: materi utama + maksimal 4 objek hasil hybrid recommendation
          // pada setiap pertemuan 1 sampai 7.
          if (userClass === "G2") {
            const g2Progress = calculateG2EnrollmentProgress(
              course,
              completedLectureIds,
              userVarkVector,
              userData?.mentalKepribadian,
            );

            return {
              ...g2Progress,
              classGroup: userClass,
            };
          }

          // Kelas lain tetap memakai perilaku lama berbasis VARK dominan.
          const dominantLectures = getDominantLectures(
            course,
            dominant
          );

          // ID lecture yang termasuk modalitas dominan
          const dominantLectureIds = new Set(
            dominantLectures
              .map((lecture) => lecture?.lectureId)
              .filter(Boolean)
          );

          // Hanya hitung completed lecture yang sesuai modalitas dominan
          const lectureCompleted = completedLectureIds.filter(
            (lectureId) => dominantLectureIds.has(lectureId)
          ).length;

          return {
            totalLectures: dominantLectures.length,
            lectureCompleted,
            dominant: normalizeVark(dominant),
          };
        })
      );

      setProgressArray(tempProgressArray);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (userData) {
      fetUserEnrolledCourses();
    }
  }, [userData]);

  useEffect(() => {
    if (userData && enrolledCourses.length > 0) {
      getCourseProgress();
    } else {
      setProgressArray([]);
    }
  }, [enrolledCourses, userData]);

  return (
    <>
      <div className="md:px-36 px-8 pt-10">
        <h1 className="text-2xl font-semibold">My Enrollment</h1>

        <table className="md:table-auto table-fixed w-full overflow-hidden mt-10">
          <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left max-sm:hidden">
            <tr>
              <th className="px-4 py-3 font-semibold truncate">
                Course
              </th>
              <th className="px-4 py-3 font-semibold truncate">
                Completed
              </th>

              <th className="px-4 py-3 font-semibold truncate">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="text-gray-700">
            {enrolledCourses.map((course, index) => {
              const progress = progressArray[index];

              const totalLectures = progress?.totalLectures || 0;
              const lectureCompleted =
                progress?.lectureCompleted || 0;

              const progressPercent =
                totalLectures > 0
                  ? (lectureCompleted * 100) / totalLectures
                  : 0;

              const isCompleted =
                totalLectures > 0 &&
                lectureCompleted === totalLectures;

              return (
                <tr
                  key={course._id}
                  className="border-b border-gray-500/20"
                >
                  <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3">
                    <img
                      src={course.courseThumbnail}
                      alt={course.courseTitle}
                      className="w-14 sm:w-24 md:w-28"
                    />

                    <div className="flex-1">
                      <p className="mb-1 max-sm:text-sm">
                        {course.courseTitle}
                      </p>

                      <Line
                        strokeWidth={2}
                        percent={progressPercent}
                        className="bg-gray-300 rounded-full"
                      />
                    </div>
                  </td>

                  {/* <td className="px-4 py-3 max-sm:hidden">
                    {calculateCourseDuration(course)}
                  </td> */}

                  <td className="px-4 py-3 max-sm:hidden">
                    {progress ? (
                      <>
                        {lectureCompleted} / {totalLectures}{" "}
                        <span>Materi</span>
                      </>
                    ) : (
                      <span>Loading...</span>
                    )}
                  </td>

                  <td className="px-4 py-3 max-sm:text-right">
                    <button
                      onClick={() =>
                        navigate("/Player/" + course._id)
                      }
                      className={`px-3 sm:px-5 py-1.5 sm:py-2 max-sm:text-xs text-white cursor-pointer ${
                        isCompleted
                          ? "bg-green-600"
                          : "bg-blue-600"
                      }`}
                    >
                      {isCompleted ? "Completed" : "On Going"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Footer />
    </>
  );
};

export default MyEnrollment;
