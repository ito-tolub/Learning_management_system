import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/student/Loading.jsx";
import { assets } from "../../assets/assets";
import humanizeDuration from "humanize-duration";
import Footer from "../../components/student/Footer";
import YouTube from "react-youtube";
import axios from "axios";
import { toast } from "react-toastify";

const CourseDetail = () => {
  const { id } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [openSection, setOpenSection] = useState({});
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(true);
  const [playerData, setPlayerData] = useState(null);

  const {
    allCourses,
    calculateRating,
    calculateChapterTime,
    calculateCourseDuration,
    calculateNoofLectures,
    currency,
    backendUrl,
    userData,
    getToken,
  } = useContext(AppContext);

  const fetchCourseData = async () => {
    // const findCourse = allCourses.find(course => course._id === id)
    // setCourseData(findCourse);
    try {
      const { data } = await axios.get(backendUrl + "/api/course/" + id);

      if (data.success) {
        setCourseData(data.courseData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const checkEnrollment = async () => {
    try {
      const res = await axios.get("/api/user/enrolled-courses");

      if (res.data.success) {
        const enrolledIds = res.data.enrolledCourses.map((c) => c._id);
        setIsAlreadyEnrolled(enrolledIds.includes(id));
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleEnroll = async () => {
    try {
      const res = await axios.post("/api/user/enroll-course", {
        courseId: id,
      });

      if (res.data.success) {
        setIsAlreadyEnrolled(true);
        alert("Berhasil enroll course 🎉");
      } else {
        alert(res.data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Gagal enroll course");
    }
  };

  const enrollCourse = async () => {
    try {
      if (!userData) {
        return toast.warn("Login terlebih dahulu untuk mendaftar kursus ini");
      }
      if (isAlreadyEnrolled) {
        return toast.warn("Kamu sudah terdaftar di kursus ini");
      }
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/enroll-free",
        { courseId: courseData._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (data.success) {
        toast.success("Berhasil mendaftar kursus!");
        setIsAlreadyEnrolled(true);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchCourseData();
    checkEnrollment();
  }, []);

  useEffect(() => {
    if (userData && courseData) {
      setIsAlreadyEnrolled(userData.enrolledCourses.includes(courseData._id));
    }
  }, [userData, courseData]);

  const toggleSection = (index) => {
    setOpenSection((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return courseData ? (
    <>
      <div className="flex md:flex-row flex-col-reverse gap-10 relative items-start justify-between md:px-36 px-8 md:pt-30 pt-20 text-left">
        <div className="absolute top-0 left-0 w-full h-section-height -z-10 bg-gradient-to-b from-cyan-100/70"></div>

        {/*left columns*/}
        <div className="w-full max-w-2xl z-10 text-gray-500">
          <h1 className="text-2xl md:text-3xl lg:text-4xl  leading-tight font-semibold text-gray-800">
            {courseData.courseTitle}
          </h1>
          {/*review and rating*/}
          <div className="flex items-center space-x-2 pt-3 pb-1 text-sm ">
            {/* <p>{calculateRating(courseData)}</p>
            <div className='flex'>
              {[...Array(5)].map((_, i) => (
                <img key={i} src={i < Math.floor(calculateRating(courseData)) ? assets.star : assets.star_blank} alt='' className='w-3.5 h-3.5' />
              ))}
            </div> */}
            {/* <p className='text-grey-600'>({courseData.courseRatings.length} {courseData.courseRatings.length > 1 ? 'ratings' : 'ratings'})</p> */}

            {/* <p>{courseData.enrolledStudents.length} {courseData.enrolledStudents.length > 1 ? 'students' : 'students'}</p> */}
          </div>

          {/* <p>Course by <span className='text-blue-600 underline'>{courseData.educator.name}</span></p> */}

          <div className="pt-8 text-gray-800 w-full max-w-3xl">
            <h2 className="text-xl font-semibold">Struktur Mata Kuliah</h2>

            <div className="pt-5">
              {courseData.courseContent.map((chapter, index) => (
                <div
                  key={index}
                  className="border border-gray-300 bg-white mb-2 rounded w-full"
                >
                  <div
                    className="flex items-center justify-between px-4 py-4 cursor-pointer select-none gap-4"
                    onClick={() => toggleSection(index)}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={assets.down_arrow_icon}
                        alt="arrow icon"
                        className={`transition-transform duration-300 ${openSection[index] ? "rotate-180" : ""}`}
                      />
                      <p className="font-medium md:text-base text-sm">
                        {chapter.chapterTitle}
                      </p>
                    </div>
                    <p className="text-sm md:text-default whitespace-nowrap ml-4">
                      {chapter.chapterContent.length} objek pembelajaran -{" "}
                      {calculateChapterTime(chapter)}
                    </p>
                  </div>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${openSection[index] ? "max-h-96" : "max-h-0"}`}
                  >
                    <ul className="list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                      {chapter.chapterContent?.map((lecture, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <img
                            src={assets.play_icon}
                            alt="play"
                            className="w-4 h-4 mt-1"
                          />
                          <div className="flex items-center justify-between w-full text-gray-800 text-xs md:text-default">
                            <p>{lecture.lectureTitle}</p>
                            <div className="flex gap-2">
                              {lecture.isPreviewFree && (
                                <p
                                  onClick={() =>
                                    setPlayerData({
                                      videoId: lecture.lectureUrl
                                        .split("/")
                                        .pop(),
                                    })
                                  }
                                  className="text-blue-500 hover:underline cursor-pointer"
                                >
                                  Preview
                                </p>
                              )}
                              <p>
                                {humanizeDuration(
                                  lecture.lectureDuration * 60 * 1000,
                                  {
                                    units: ["h", "m"],
                                  },
                                )}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="py-20 text-sm md:text-default">
            <h3 className="text-xl font-semibold text-gray-800">
              Deskripsi Singkat Mata Kuliah
            </h3>
            <p
              className="pt-3 rich-text"
              dangerouslySetInnerHTML={{ __html: courseData.courseDescription }}
            ></p>
          </div>
        </div>

        {/*Right columns*/}
        <div
          className="max-w-course-card z-10 
shadow-lg shadow-black/10 
rounded-xl overflow-hidden bg-white w-full md:w-[400px] lg:w-[420px]"
        >
          {playerData ? (
            <YouTube
              videoId={playerData.videoId}
              opts={{ playerVars: { autoplay: 1 } }}
              iframeClassName="w-full aspect-video"
            />
          ) : (
            <img
              src={courseData.courseThumbnail}
              alt=""
              className="w-full aspect-video object-cover"
            />
          )}

          <div className="p-5 ">
            {/* <div className='flex gap-3 items-center pt-2'>
              <p className='text-gray-800 md:text-4x1 text-2xl font-semibold'>{currency} {(courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2)}</p>
              <p className='md:text-lg text-gray-500 line-through'>{currency}{courseData.coursePrice}</p>
              <p className='md:text-lg text-gray-500'>{courseData.discount}% off</p>
            </div> */}
            <div className="flex items-center text-sm md:text-default gap-4 pt-2 md:pt-4 text-gray-500">
              {/* <div className='flex items-center gap-1'>
                <img src={assets.star} alt="star icon" className="" />
                <p>{calculateRating(courseData)}</p>
              </div> */}

              <div className="h-4 w-px bg-gray-500/40"></div>

              <div className="flex items-center gap-1">
                <img
                  src={assets.time_clock_icon}
                  alt="clock icon"
                  className=""
                />
                <p>{calculateCourseDuration(courseData)}</p>
              </div>

              <div className="h-4 w-px bg-gray-500/40"></div>

              <div className="flex items-center gap-1">
                <img src={assets.lesson_icon} alt="clock icon" className="" />
                <p>{calculateNoofLectures(courseData)} objek pembelajaran</p>
              </div>
            </div>
            <button
              onClick={enrollCourse}
              disabled={isAlreadyEnrolled}
              className={`md:mt-6 mt-4 w-full py-3 rounded font-medium
    ${
      isAlreadyEnrolled
        ? "bg-gray-400 cursor-not-allowed text-white"
        : "bg-blue-600 hover:bg-blue-700 text-white"
    }`}
            >
              {isAlreadyEnrolled ? "Already Enrolled" : "Enroll Now"}
            </button>

            <div className="pt-6">
              <p className="md:text-xl text-lg font-medium text-gray-800">
                Yang akan kamu dapatkan
              </p>
              <ul className="ml-4 pt-2 text-sm md:text-default list-disc text-gray-500 space-y-1">
                <li>
                  Objek pembelajaran disesuaikan dengan{" "}
                  <strong>gaya belajar</strong> kamu
                </li>
                <li>
                  Sistem rekomendasi memilihkan materi yang paling cocok untukmu
                  di setiap pertemuan
                </li>
                <li>
                  Durasi konten disesuaikan dengan{" "}
                  <strong>profil keprajaan</strong> kamu
                </li>
                <li>
                  Materi tersedia dalam berbagai format: video, audio, teks, dan
                  quizz
                </li>
                <li>Progress pembelajaran tercatat otomatis di setiap sesi</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  ) : (
    <Loading />
  );
};

export default CourseDetail;
