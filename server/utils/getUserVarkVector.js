import User from "../models/User.js";
import Course from "../models/Course.js";
import { LectureActivity } from "../models/LectureActivity.js";
import { calculateAdaptiveVark } from "./calculateAdaptiveVark.js";
import { MAIN_LECTURE_IDS_BY_CHAPTER } from "./calculateFeedbackScore.js";

/**
 * SATU-SATUNYA sumber vektor profil VARK adaptif.
 *
 * Dipakai oleh:
 *  - userController.getMyAdaptiveVark  (rekomendasi di halaman Player)
 *  - educatorController.getStudentEngagementScore (tabel SES)
 *  - educatorController.getVarkSummary (Ringkasan VARK)
 *
 * Jangan menduplikasi logika ini di tempat lain. Bila aturannya berubah,
 * ubah di sini saja agar seluruh halaman tetap konsisten.
 */

const TAGS = ["V", "A", "R", "K"];
const emptyScores = () => ({ V: 0, A: 0, R: 0, K: 0 });

/**
 * Membangun peta `${courseId}::${lectureId}` -> tag, HANYA untuk objek
 * pembelajaran non-utama.
 *
 * Objek utama wajib diselesaikan seluruh praja (G1 maupun G2), sehingga
 * durasinya bukan hasil pilihan dan tidak mencerminkan preferensi modalitas.
 */
export const buildNonMainTagMap = (courses = []) => {
  const map = new Map();

  for (const course of courses) {
    const courseId = course._id.toString();

    for (const chapter of course.courseContent || []) {
      const mainIds = new Set(
        MAIN_LECTURE_IDS_BY_CHAPTER[chapter.chapterId] || [],
      );

      for (const lecture of chapter.chapterContent || []) {
        if (mainIds.has(lecture.lectureId)) continue;

        map.set(`${courseId}::${lecture.lectureId}`, lecture.tags || null);
      }
    }
  }

  return map;
};

/**
 * Menjumlahkan durasi akses per modalitas, dalam menit.
 * Aktivitas pada objek utama otomatis terlewat karena tidak ada di peta.
 */
export const sumReadingMinutes = (activities = [], tagMap) => {
  const seconds = emptyScores();

  for (const activity of activities) {
    const tag = tagMap.get(`${activity.courseId}::${activity.lectureId}`);
    if (tag && seconds[tag] !== undefined) {
      seconds[tag] += activity.totalDuration || 0;
    }
  }

  return Object.fromEntries(
    TAGS.map((tag) => [tag, Math.round((seconds[tag] / 60) * 10) / 10]),
  );
};

/**
 * Menghitung profil VARK adaptif untuk SATU praja.
 *
 * @param {string} userId
 * @param {object} [preloaded] - opsional, untuk menghindari query berulang
 * @param {object} preloaded.quizScores
 * @param {Array}  preloaded.activities
 * @param {Array}  preloaded.courses
 * @returns {Promise<{scores, dominant, sources, readingMinutes, quizScores}>}
 */
export const getUserVarkVector = async (userId, preloaded = {}) => {
  let quizScores = preloaded.quizScores;

  if (!quizScores) {
    const user = await User.findById(userId, "varkResult").lean();
    quizScores = user?.varkResult?.scores || emptyScores();
  }

  const activities =
    preloaded.activities || (await LectureActivity.find({ userId }).lean());

  if (activities.length === 0) {
    const adaptive = calculateAdaptiveVark(quizScores, emptyScores());

    return {
      scores: adaptive.scores,
      dominant: adaptive.dominant,
      sources: adaptive.sources,
      readingMinutes: emptyScores(),
      quizScores,
    };
  }

  let courses = preloaded.courses;

  if (!courses) {
    const courseIds = [...new Set(activities.map((a) => a.courseId))];
    courses = await Course.find({ _id: { $in: courseIds } }).lean();
  }

  const tagMap = buildNonMainTagMap(courses);
  const readingMinutes = sumReadingMinutes(activities, tagMap);
  const adaptive = calculateAdaptiveVark(quizScores, readingMinutes);

  return {
    scores: adaptive.scores,
    dominant: adaptive.dominant,
    sources: adaptive.sources,
    readingMinutes,
    quizScores,
  };
};

/**
 * Versi massal untuk halaman dosen: menghitung profil BANYAK praja
 * dengan tiga query saja, bukan tiga query per praja.
 *
 * @param {string[]} userIds
 * @returns {Promise<Map<string, object>>} userId -> hasil getUserVarkVector
 */
export const getUserVarkVectorBulk = async (userIds = []) => {
  const result = new Map();

  if (userIds.length === 0) return result;

  const users = await User.find(
    { _id: { $in: userIds } },
    "varkResult",
  ).lean();

  const quizByUserId = new Map(
    users.map((u) => [u._id, u.varkResult?.scores || emptyScores()]),
  );

  const activities = await LectureActivity.find({
    userId: { $in: userIds },
  }).lean();

  const activitiesByUserId = new Map();
  for (const activity of activities) {
    if (!activitiesByUserId.has(activity.userId)) {
      activitiesByUserId.set(activity.userId, []);
    }
    activitiesByUserId.get(activity.userId).push(activity);
  }

  const courseIds = [...new Set(activities.map((a) => a.courseId))];
  const courses = await Course.find({ _id: { $in: courseIds } }).lean();
  const tagMap = buildNonMainTagMap(courses);

  for (const userId of userIds) {
    const quizScores = quizByUserId.get(userId) || emptyScores();
    const userActivities = activitiesByUserId.get(userId) || [];
    const readingMinutes = sumReadingMinutes(userActivities, tagMap);
    const adaptive = calculateAdaptiveVark(quizScores, readingMinutes);

    result.set(userId, {
      scores: adaptive.scores,
      dominant: adaptive.dominant,
      sources: adaptive.sources,
      readingMinutes,
      quizScores,
    });
  }

  return result;
};
