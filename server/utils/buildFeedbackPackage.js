const HYBRID_WEIGHT = {
  vark: 0.7,
  instructional: 0.3,
};

// const MENTAL_REFERENCE_VALUE = 84.87;
const VARK_KEYS = ["V", "A", "R", "K"];

const normalizeVark = (value) => {
  if (!value) return null;

  const normalized = String(value).toLowerCase().trim();

  if (normalized === "v" || normalized.startsWith("vis")) {
    return "V";
  }

  if (normalized === "a" || normalized.startsWith("aud")) {
    return "A";
  }

  if (normalized === "r" || normalized.startsWith("read")) {
    return "R";
  }

  if (normalized === "k" || normalized.startsWith("kine")) {
    return "K";
  }

  return null;
};

const cosineSimilarity = (userVector, objectVector) => {
  if (!userVector || !objectVector) return 0;

  const userValues = VARK_KEYS.map(
    (key) => Number(userVector[key]) || 0,
  );

  const objectValues = VARK_KEYS.map(
    (key) => Number(objectVector[key]) || 0,
  );

  const dotProduct = userValues.reduce(
    (total, value, index) =>
      total + value * objectValues[index],
    0,
  );

  const userNorm = Math.sqrt(
    userValues.reduce(
      (total, value) => total + value ** 2,
      0,
    ),
  );

  const objectNorm = Math.sqrt(
    objectValues.reduce(
      (total, value) => total + value ** 2,
      0,
    ),
  );

  if (userNorm === 0 || objectNorm === 0) return 0;

  return dotProduct / (userNorm * objectNorm);
};

const getInstructionalProfile = (mentalKepribadian) => {
  const score = Number(mentalKepribadian);

  if (!Number.isFinite(score) || !Number.isFinite(mentalReference)) {
    return null;
  }

  return {
    contentGranularity:
      score >= mentalReference ? "utuh" : "tersegmentasi",

    cognitiveLevel:
      score >= mentalReference ? "C4-C6" : "C1-C3",
  };
};

const getInstructionalCompatibility = (
  lecture,
  instructionalProfile,
) => {
  if (!lecture || !instructionalProfile) return 0;

  const modality = normalizeVark(lecture.tags);

  if (modality === "K") {
    return lecture.cognitiveLevel ===
      instructionalProfile.cognitiveLevel
      ? 1
      : 0;
  }

  if (["V", "A", "R"].includes(modality)) {
    return lecture.contentGranularity ===
      instructionalProfile.contentGranularity
      ? 1
      : 0;
  }

  return 0;
};

const getDominantModalities = (userVarkResult) => {
  const storedDominant = userVarkResult?.dominant || [];

  if (storedDominant.length > 0) {
    return [
      ...new Set(
        storedDominant
          .map(normalizeVark)
          .filter(Boolean),
      ),
    ];
  }

  const scores = userVarkResult?.scores || {};

  const scoreEntries = VARK_KEYS.map((key) => [
    key,
    Number(scores[key]) || 0,
  ]);

  const highestScore = Math.max(
    ...scoreEntries.map(([, value]) => value),
  );

  if (highestScore <= 0) return [];

  return scoreEntries
    .filter(([, value]) => value === highestScore)
    .map(([key]) => key);
};

export const buildFeedbackPackage = ({
  course,
  userVarkResult,
  mentalKepribadian,
  mentalReference,
}) => {
  const userVarkVector = userVarkResult?.scores || null;

  const dominantModalities =
    getDominantModalities(userVarkResult);

  const instructionalProfile =
    getInstructionalProfile(mentalKepribadian, mentalReference);

  if (
    !course ||
    !userVarkVector ||
    !instructionalProfile
  ) {
    return [];
  }

  const courseAssignedIds = new Set();

  for (const chapter of course.courseContent || []) {
    const lectures = chapter.chapterContent || [];

    /*
     * 1. Materi utama dosen.
     * mainLectureIds disimpan pada tingkat chapter.
     */
    const mainLectureIds = new Set(
      (chapter.mainLectureIds || []).map(String),
    );

    for (const lectureId of mainLectureIds) {
      courseAssignedIds.add(lectureId);
    }

    const dominantLectures = lectures.filter((lecture) => {
      const modality = normalizeVark(lecture.tags);

      return (
        dominantModalities.includes(modality) &&
        getInstructionalCompatibility(
          lecture,
          instructionalProfile,
        ) === 1
      );
    });

    for (const lecture of dominantLectures) {
      courseAssignedIds.add(String(lecture.lectureId));
    }

    /*
     * 3. Top-4 berdasarkan hybrid score.
     */
    const top4Recommendations = lectures
      .filter((lecture) => lecture.varkvektor)
      .map((lecture, index) => {
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
          HYBRID_WEIGHT.instructional *
            instructionalCompatibility;

        return {
          lectureId: String(lecture.lectureId),
          hybridScore,
          originalIndex: index,
        };
      })
      .sort((a, b) => {
        if (b.hybridScore !== a.hybridScore) {
          return b.hybridScore - a.hybridScore;
        }

        return a.originalIndex - b.originalIndex;
      })
      .slice(0, 4);

    for (const recommendation of top4Recommendations) {
      courseAssignedIds.add(recommendation.lectureId);
    }
  }

  return [...courseAssignedIds];
};