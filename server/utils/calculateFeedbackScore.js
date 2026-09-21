const HYBRID_WEIGHT = {
  vark: 0.7,
  instructional: 0.3,
};

const RECOMMENDATION_LIMIT = 4;
// const MENTAL_REFERENCE_VALUE = 84.87;

export const MAIN_LECTURE_IDS_BY_CHAPTER = {
  pertemuan1: ["op1.1", "op1.2"],
  pertemuan2: ["op2.1", "op2.2"],
  pertemuan3: ["op3.29", "op3.30", "op3.31"],
  pertemuan4: ["op4.25", "op4.24"],
  pertemuan5: ["op5.25", "op5.24"],
  pertemuan6: ["op6.25", "op6.24"],
  pertemuan7: ["op7.22", "op7.21"],
};

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

  return String(value).toUpperCase().charAt(0);
};

const cosineSimilarity = (userVector, objectVector) => {
  if (!userVector || !objectVector) {
    return 0;
  }

  const keys = ["V", "A", "R", "K"];

  const user = keys.map((key) => Number(userVector[key] || 0));

  const object = keys.map((key) => Number(objectVector[key] || 0));

  const dot = user.reduce(
    (sum, value, index) => sum + value * object[index],
    0,
  );

  const userNorm = Math.sqrt(user.reduce((sum, value) => sum + value ** 2, 0));

  const objectNorm = Math.sqrt(
    object.reduce((sum, value) => sum + value ** 2, 0),
  );

  if (userNorm === 0 || objectNorm === 0) {
    return 0;
  }
  return dot / (userNorm * objectNorm);
};

const getInstructionalProfile = (mentalKepribadian, mentalReference) => {
  const score = Number(mentalKepribadian);

  if (!Number.isFinite(score) || !Number.isFinite(mentalReference)) {
    return null;
  }

  return {
    contentGranularity:
      score >= mentalReference ? "utuh" : "tersegmentasi",

    cognitiveLevel: score >= mentalReference ? "C4-C6" : "C1-C3",
  };
};

const getInstructionalCompatibility = (lecture, profile) => {
  if (!lecture || !profile) {
    return 0;
  }

  const modality = normalizeVark(lecture.tags);

  if (modality === "K") {
    return lecture.cognitiveLevel === profile.cognitiveLevel ? 1 : 0;
  }

  if (["V", "A", "R"].includes(modality)) {
    return lecture.contentGranularity === profile.contentGranularity ? 1 : 0;
  }

  return 0;
};

const scoreLecture = ({ lecture, userVarkVector, instructionalProfile }) => {
  const varkSimilarity = cosineSimilarity(userVarkVector, lecture?.varkvektor);

  const instructionalCompatibility = getInstructionalCompatibility(
    lecture,
    instructionalProfile,
  );

  const hybridScore =
    HYBRID_WEIGHT.vark * varkSimilarity +
    HYBRID_WEIGHT.instructional * instructionalCompatibility;

  return {
    varkSimilarity,
    instructionalCompatibility,
    hybridScore,

    hybridPercentage: Number((hybridScore * 100).toFixed(2)),
  };
};

const numberOrInfinity = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
};

const getConfiguredMainIds = (chapter) => {
  const configured = MAIN_LECTURE_IDS_BY_CHAPTER[chapter?.chapterId];

  if (Array.isArray(configured) && configured.length > 0) {
    return configured.map(String);
  }

  if (Array.isArray(chapter?.mainLectureIds)) {
    return chapter.mainLectureIds.map(String);
  }

  return [];
};

const getChapterLecturesWithIndex = (chapter) =>
  (Array.isArray(chapter?.chapterContent) ? chapter.chapterContent : []).map(
    (lecture, index) => ({
      ...lecture,
      _sourceIndex: index,
    }),
  );

const getMainLectures = (chapter) => {
  const lectures = getChapterLecturesWithIndex(chapter);

  const mainIds = getConfiguredMainIds(chapter);

  return mainIds
    .map((lectureId) => {
      const matchingLectures = lectures
        .filter((lecture) => String(lecture?.lectureId || "") === lectureId)
        .sort((a, b) => {
          const orderDiff =
            numberOrInfinity(a.lectureOrder) - numberOrInfinity(b.lectureOrder);

          if (orderDiff !== 0) {
            return orderDiff;
          }

          return a._sourceIndex - b._sourceIndex;
        });

      return matchingLectures[0];
    })
    .filter(Boolean);
};

/*
 * G1 menggunakan lectureId unik.
 * ID materi utama tidak boleh
 * dihitung lagi sebagai tambahan.
 */
const getUniqueNonMainLectures = (chapter, mainLectures) => {
  const lectures = getChapterLecturesWithIndex(chapter);

  const mainIndexes = new Set(
    mainLectures.map((lecture) => lecture._sourceIndex),
  );

  const mainIds = new Set(
    mainLectures.map((lecture) => String(lecture.lectureId)),
  );

  const byId = new Map();

  for (const lecture of lectures) {
    if (!lecture?.lectureId) {
      continue;
    }

    if (mainIndexes.has(lecture._sourceIndex)) {
      continue;
    }

    const lectureId = String(lecture.lectureId);

    if (mainIds.has(lectureId)) {
      continue;
    }

    const existing = byId.get(lectureId);

    if (!existing) {
      byId.set(lectureId, lecture);

      continue;
    }

    const currentOrder = numberOrInfinity(lecture.lectureOrder);

    const existingOrder = numberOrInfinity(existing.lectureOrder);

    if (
      currentOrder < existingOrder ||
      (currentOrder === existingOrder &&
        lecture._sourceIndex < existing._sourceIndex)
    ) {
      byId.set(lectureId, lecture);
    }
  }

  return [...byId.values()];
};

/*
 * Kandidat G2 mengikuti Player.jsx:
 * yang dikeluarkan hanya sourceIndex
 * materi utama.
 */
const getG2RecommendationCandidates = (chapter, mainLectures) => {
  const lectures = getChapterLecturesWithIndex(chapter);

  const mainIndexes = new Set(
    mainLectures.map((lecture) => lecture._sourceIndex),
  );

  return lectures.filter(
    (lecture) => lecture?.lectureId && !mainIndexes.has(lecture._sourceIndex),
  );
};

export const getG2Recommendations = ({
  chapter,
  mainLectures,
  userVarkVector,
  mentalKepribadian,
  mentalReference,
}) => {
  if (!userVarkVector) {
    return [];
  }

  const instructionalProfile = getInstructionalProfile(mentalKepribadian, mentalReference);

  const candidates = getG2RecommendationCandidates(chapter, mainLectures);

  return candidates
    .filter((lecture) => lecture?.varkvektor)
    .map((lecture) => {
      const score = scoreLecture({
        lecture,
        userVarkVector,
        instructionalProfile,
      });

      return {
        ...lecture,

        _varkSimilarity: score.varkSimilarity,

        _instructionalCompatibility: score.instructionalCompatibility,

        _hybridScore: score.hybridScore,

        _hybridPercentage: score.hybridPercentage,
      };
    })
    .sort((a, b) => {
      if (b._hybridScore !== a._hybridScore) {
        return b._hybridScore - a._hybridScore;
      }

      return a._sourceIndex - b._sourceIndex;
    })
    .slice(0, RECOMMENDATION_LIMIT)
    .map((lecture, index) => ({
      ...lecture,
      rank: index + 1,
    }));
};

const activityMapFrom = (activities = []) => {
  const activityMap = new Map();

  for (const activity of activities || []) {
    if (!activity?.lectureId) {
      continue;
    }

    const lectureId = String(activity.lectureId);

    const existing = activityMap.get(lectureId);

    if (!existing) {
      activityMap.set(lectureId, activity);

      continue;
    }

    activityMap.set(lectureId, {
      ...existing,

      accessCount:
        Number(existing.accessCount || 0) + Number(activity.accessCount || 0),

      totalDuration:
        Number(existing.totalDuration || 0) +
        Number(activity.totalDuration || 0),

      createdAt:
        new Date(existing.createdAt || 8640000000000000) <=
        new Date(activity.createdAt || 8640000000000000)
          ? existing.createdAt
          : activity.createdAt,
    });
  }

  return activityMap;
};

const interactionMetrics = (lecture, activity) => {
  const expectedDurSec = Math.max(
    Number(lecture?.lectureDuration || 0) * 60,
    0,
  );

  const rawActualDurSec = Math.max(Number(activity?.totalDuration || 0), 0);

  const effectiveActualDurSec =
    expectedDurSec > 0 ? Math.min(rawActualDurSec, expectedDurSec) : 0;

  const ratio =
    expectedDurSec > 0 ? effectiveActualDurSec / expectedDurSec : null;

  return {
    expectedDurSec,
    rawActualDurSec,
    effectiveActualDurSec,
    ratio,

    accessCount: Math.max(Number(activity?.accessCount || 0), 0),

    firstAccessAt: activity?.createdAt || null,
  };
};

const hasActualAccess = (activity) =>
  Math.max(Number(activity?.accessCount || 0), 0) > 0 ||
  Math.max(Number(activity?.totalDuration || 0), 0) > 0;

const makeTargetDetail = ({
  lecture,
  chapter,
  role,
  completedSet,
  activityMap,
  recommendation = null,
}) => {
  const lectureId = String(lecture.lectureId);

  const activity = activityMap.get(lectureId);

  const metrics = interactionMetrics(lecture, activity);

  return {
    chapterId: chapter.chapterId,

    chapterOrder: Number(chapter.chapterOrder || 0),

    lectureId,

    lectureTitle: lecture.lectureTitle || lectureId,

    role,

    selesai: completedSet.has(lectureId) ? 1 : 0,

    accessCount: metrics.accessCount,

    rawActualDurSec: metrics.rawActualDurSec,

    actualDurSec: metrics.effectiveActualDurSec,

    expectedDurSec: metrics.expectedDurSec,

    interactionRatio: metrics.ratio,

    interactionPercent:
      metrics.ratio == null ? null : Number((metrics.ratio * 100).toFixed(1)),

    firstAccessAt: metrics.firstAccessAt,

    recommendationRank: recommendation?.rank ?? null,

    hybridScore: recommendation?._hybridScore ?? null,

    hybridPercentage: recommendation?._hybridPercentage ?? null,
  };
};

/*
 * G1:
 * hanya objek yang benar-benar pernah
 * diakses yang dapat menjadi pilihan.
 *
 * Empat yang pertama berdasarkan
 * LectureActivity.createdAt menjadi
 * target SES.
 */
const chooseG1AdditionalTargets = ({ chapter, mainLectures, activityMap }) => {
  const candidates = getUniqueNonMainLectures(chapter, mainLectures);

  return candidates
    .map((lecture) => {
      const lectureId = String(lecture.lectureId);

      const activity = activityMap.get(lectureId);

      return {
        ...lecture,
        _activity: activity,

        _firstAccessAt: activity?.createdAt || null,
      };
    })
    .filter((lecture) => hasActualAccess(lecture._activity))
    .sort((a, b) => {
      const timeA = a._firstAccessAt
        ? new Date(a._firstAccessAt).getTime()
        : Number.POSITIVE_INFINITY;

      const timeB = b._firstAccessAt
        ? new Date(b._firstAccessAt).getTime()
        : Number.POSITIVE_INFINITY;

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      const orderDiff =
        numberOrInfinity(a.lectureOrder) - numberOrInfinity(b.lectureOrder);

      if (orderDiff !== 0) {
        return orderDiff;
      }

      return a._sourceIndex - b._sourceIndex;
    })
    .slice(0, RECOMMENDATION_LIMIT);
};

const isExperimentChapter = (chapter) =>
  Boolean(MAIN_LECTURE_IDS_BY_CHAPTER[chapter?.chapterId]);

const sortExplorationTop4 = (details) =>
  [...details]
    .sort((a, b) => {
      const interactionA = Number.isFinite(Number(a.interactionPercent))
        ? Number(a.interactionPercent)
        : -1;

      const interactionB = Number.isFinite(Number(b.interactionPercent))
        ? Number(b.interactionPercent)
        : -1;

      if (interactionB !== interactionA) {
        return interactionB - interactionA;
      }

      if (b.effectiveDurationSec !== a.effectiveDurationSec) {
        return b.effectiveDurationSec - a.effectiveDurationSec;
      }

      if (b.accessCount !== a.accessCount) {
        return b.accessCount - a.accessCount;
      }

      return String(a.lectureId).localeCompare(String(b.lectureId));
    })
    .slice(0, RECOMMENDATION_LIMIT);

export const calculateTargetEngagement = ({
  course,
  kelas,
  lectureCompleted = [],
  userVarkVector = null,
  mentalKepribadian,
  activities = [],
  frozenByChapter = null,
    mentalReference = null,
}) => {
  const normalizedClass = String(kelas || "")
    .trim()
    .toUpperCase();

  const completedSet = new Set((lectureCompleted || []).map(String));

  const activityMap = activityMapFrom(activities);

  let completionEarned = 0;
  let completionPossible = 0;

  let interactionEarned = 0;
  let interactionPossible = 0;

  const targetDetails = [];
  const recommendationDetails = [];
  const chapterDetails = [];

  const allExperimentLectureIds = new Set();

  const targetLectureIds = new Set();

  const experimentLectureLookup = new Map();

  const chapters = (course?.courseContent || []).filter(isExperimentChapter);

  for (const chapter of chapters) {
    const mainLectures = getMainLectures(chapter);

    const g1NonMainLectures = getUniqueNonMainLectures(chapter, mainLectures);

    const allChapterLectures = getChapterLecturesWithIndex(chapter);

    for (const lecture of allChapterLectures) {
      if (!lecture?.lectureId) {
        continue;
      }

      const lectureId = String(lecture.lectureId);

      allExperimentLectureIds.add(lectureId);

      if (!experimentLectureLookup.has(lectureId)) {
        experimentLectureLookup.set(lectureId, {
          lecture,
          chapter,
        });
      }
    }

    const mainDetails = mainLectures.map((lecture) =>
      makeTargetDetail({
        lecture,
        chapter,
        role: "main",
        completedSet,
        activityMap,
      }),
    );

    let additionalTargets = [];
    let additionalQuota = 0;

    if (normalizedClass === "G2") {
      const beku = frozenByChapter?.get(chapter.chapterId);

      if (beku && beku.length > 0) {
        // Daftar BEKU: urutan dipertahankan sesuai peringkat saat dibekukan
        const byId = new Map(
          (chapter.chapterContent || []).map((l) => [l.lectureId, l]),
        );

        additionalTargets = beku.map((id) => byId.get(id)).filter(Boolean);
      } else {
        // Belum dibekukan (mis. pertemuan belum berjalan)
        additionalTargets = getG2Recommendations({
          chapter,
          mainLectures,
          userVarkVector,
          mentalKepribadian,
          mentalReference 
        });
      }

      additionalQuota = additionalTargets.length;
    } else {
      additionalTargets = chooseG1AdditionalTargets({
        chapter,
        mainLectures,
        activityMap,
      });

      additionalQuota = Math.min(
        RECOMMENDATION_LIMIT,
        g1NonMainLectures.length,
      );
    }

    const additionalDetails = additionalTargets.map((lecture) => {
      const detail = makeTargetDetail({
        lecture,
        chapter,

        role: normalizedClass === "G2" ? "recommended" : "free-choice",

        completedSet,
        activityMap,

        recommendation: normalizedClass === "G2" ? lecture : null,
      });

      if (normalizedClass === "G2") {
        recommendationDetails.push(detail);
      }

      return detail;
    });

    for (const detail of [...mainDetails, ...additionalDetails]) {
      targetDetails.push(detail);

      targetLectureIds.add(detail.lectureId);
    }

    const mainCompleted = mainDetails.filter((detail) => detail.selesai).length;

    const additionalCompleted = additionalDetails.filter(
      (detail) => detail.selesai,
    ).length;

    completionEarned +=
      // mainCompleted +
      additionalCompleted;

    completionPossible +=
      // mainDetails.length +
      additionalQuota;

    interactionPossible += additionalQuota;

    for (const detail of additionalDetails) {
      interactionEarned += detail.interactionRatio ?? 0;
    }

    chapterDetails.push({
      chapterId: chapter.chapterId,

      chapterOrder: Number(chapter.chapterOrder || 0),

      mainPossible: mainDetails.length,

      mainEarned: mainCompleted,

      additionalType:
        normalizedClass === "G2" ? "hybrid-top-4" : "free-choice-first-4",

      additionalQuota,

      additionalUsed: additionalDetails.length,

      additionalPossible: additionalQuota,

      additionalEarned: additionalCompleted,

      recommendedDurationSec:
        normalizedClass === "G2"
          ? additionalDetails.reduce(
              (sum, detail) => sum + Number(detail.actualDurSec || 0),
              0,
            )
          : 0,

      targetLectureIds: [...mainDetails, ...additionalDetails].map(
        (detail) => detail.lectureId,
      ),
    });
  }

  /*
   * ==========================
   * EXPLORATION
   * ==========================
   */

  const explorationDetails = [];

  for (const [lectureId, activity] of activityMap.entries()) {
    if (!allExperimentLectureIds.has(lectureId)) {
      continue;
    }

    if (targetLectureIds.has(lectureId)) {
      continue;
    }

    if (!hasActualAccess(activity)) {
      continue;
    }

    const lookup = experimentLectureLookup.get(lectureId);

    const lecture = lookup?.lecture;

    const chapter = lookup?.chapter;

    if (!lecture || !chapter) {
      continue;
    }

    const metrics = interactionMetrics(lecture, activity);

    explorationDetails.push({
      chapterId: chapter.chapterId,

      chapterOrder: Number(chapter.chapterOrder || 0),

      lectureId,

      lectureTitle: lecture.lectureTitle || lectureId,

      accessCount: metrics.accessCount,

      rawDurationSec: metrics.rawActualDurSec,

      /*
       * Durasi nyata untuk laporan.
       */
      durationSec: metrics.rawActualDurSec,

      /*
       * Durasi capped untuk analitik
       * engagement/adherence.
       */
      effectiveDurationSec: metrics.effectiveActualDurSec,

      expectedDurSec: metrics.expectedDurSec,

      interactionRatio: metrics.ratio,

      interactionPercent:
        metrics.ratio == null ? null : Number((metrics.ratio * 100).toFixed(1)),

      selesai: completedSet.has(lectureId) ? 1 : 0,

      firstAccessAt: metrics.firstAccessAt,
    });
  }

  const explorationInteractionDetails = explorationDetails.filter(
    (detail) => detail.interactionRatio != null,
  );

  const explorationInteractionEarned = explorationInteractionDetails.reduce(
    (sum, detail) => sum + Number(detail.interactionRatio || 0),
    0,
  );

  const explorationInteractionPossible = explorationInteractionDetails.length;

  const explorationAverageInteractionPercent =
    explorationInteractionPossible > 0
      ? (explorationInteractionEarned / explorationInteractionPossible) * 100
      : 0;

  const explorationEffectiveDurationSec = explorationDetails.reduce(
    (sum, detail) => sum + Number(detail.effectiveDurationSec || 0),
    0,
  );

  /*
   * ==========================
   * RECOMMENDATION ADHERENCE
   * hanya G2
   * ==========================
   */

  const recommendedDurationSec =
    normalizedClass === "G2"
      ? recommendationDetails.reduce(
          (sum, detail) => sum + Number(detail.actualDurSec || 0),
          0,
        )
      : 0;

  const outsideRecommendationDurationSec =
    normalizedClass === "G2" ? explorationEffectiveDurationSec : 0;

  const totalAdditionalDurationSec =
    recommendedDurationSec + outsideRecommendationDurationSec;

  const recommendationAdherence =
    normalizedClass === "G2"
      ? {
          durationPercent:
            totalAdditionalDurationSec > 0
              ? Number(
                  (
                    (recommendedDurationSec / totalAdditionalDurationSec) *
                    100
                  ).toFixed(1),
                )
              : null,

          recommendedDurationSec,

          outsideRecommendationDurationSec,

          totalAdditionalDurationSec,
        }
      : null;

  /*
   * ==========================
   * ADHERENCE PER PERTEMUAN
   * Objek dikelompokkan menurut keanggotaan pertemuannya,
   * bukan menurut waktu aksesnya.
   * ==========================
   */

  const adherenceByChapter =
    normalizedClass === "G2"
      ? chapterDetails.map((chapter) => {
          const luar = explorationDetails
            .filter((d) => d.chapterId === chapter.chapterId)
            .reduce((sum, d) => sum + Number(d.effectiveDurationSec || 0), 0);

          const dalam = Number(chapter.recommendedDurationSec || 0);
          const total = dalam + luar;

          return {
            chapterId: chapter.chapterId,
            chapterOrder: chapter.chapterOrder,
            recommendedDurationSec: dalam,
            outsideRecommendationDurationSec: luar,
            totalAdditionalDurationSec: total,
            durationPercent:
              total > 0 ? Number(((dalam / total) * 100).toFixed(1)) : null,
          };
        })
      : [];

  /*
   * ==========================
   * FINAL SES COMPONENTS
   * ==========================
   */

  const interactionPercent =
    interactionPossible > 0
      ? (interactionEarned / interactionPossible) * 100
      : 0;

  const completionPercent =
    completionPossible > 0 ? (completionEarned / completionPossible) * 100 : 0;

  const targetDurationSec = targetDetails.reduce(
    (sum, detail) => sum + Number(detail.actualDurSec || 0),
    0,
  );

  const targetExpectedDurationSec = targetDetails.reduce(
    (sum, detail) => sum + Number(detail.expectedDurSec || 0),
    0,
  );

  return {
    kelas: normalizedClass,

    interactionPercent: Number(interactionPercent.toFixed(1)),

    interactionEarned: Number(interactionEarned.toFixed(4)),

    interactionPossible,

    completionPercent: Number(completionPercent.toFixed(1)),

    completionEarned,
    completionPossible,

    targetDurationSec,
    targetExpectedDurationSec,

    targetDetails,
    recommendationDetails,
    chapterDetails,

    exploration: {
      count: explorationDetails.length,

      accessCount: explorationDetails.reduce(
        (sum, item) => sum + Number(item.accessCount || 0),
        0,
      ),

      completedCount: explorationDetails.filter((item) => item.selesai).length,

      durationSec: explorationDetails.reduce(
        (sum, item) => sum + Number(item.durationSec || 0),
        0,
      ),

      effectiveDurationSec: explorationEffectiveDurationSec,

      interactionEarned: Number(explorationInteractionEarned.toFixed(4)),

      interactionPossible: explorationInteractionPossible,

      averageInteractionPercent: Number(
        explorationAverageInteractionPercent.toFixed(1),
      ),

      top4: sortExplorationTop4(explorationDetails),

      details: explorationDetails,
    },

    recommendationAdherence, adherenceByChapter,
  };
};

export const calculateFeedbackScore = ({
  course,
  lectureCompleted = [],
  dominant,
  mentalKepribadian,
  mentalReference,
}) => {
  const normalizedDominant = normalizeVark(dominant);

  const fallbackVector = normalizedDominant
    ? {
        [normalizedDominant]: 1,
      }
    : null;

  const result = calculateTargetEngagement({
    course,
    kelas: "G1",
    lectureCompleted,
    userVarkVector: fallbackVector,
    mentalKepribadian,
    activities: [],
  });

  return {
    feedback: result.completionPercent,

    earned: result.completionEarned,

    possible: result.completionPossible,

    mainEarned: result.chapterDetails.reduce(
      (sum, chapter) => sum + chapter.mainEarned,
      0,
    ),

    mainPossible: result.chapterDetails.reduce(
      (sum, chapter) => sum + chapter.mainPossible,
      0,
    ),

    supplementaryEarned: result.chapterDetails.reduce(
      (sum, chapter) => sum + chapter.additionalEarned,
      0,
    ),

    supplementaryPossible: result.chapterDetails.reduce(
      (sum, chapter) => sum + chapter.additionalPossible,
      0,
    ),

    chapterDetails: result.chapterDetails,
  };
};
