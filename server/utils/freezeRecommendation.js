import Course from "../models/Course.js";
import User from "../models/User.js";
import { LectureActivity } from "../models/LectureActivity.js";
import { RecommendationSnapshot } from "../models/RecommendationSnapshot.js";
import { calculateAdaptiveVark } from "./calculateAdaptiveVark.js";
import {
  MAIN_LECTURE_IDS_BY_CHAPTER,
  getG2Recommendations,
} from "./calculateFeedbackScore.js";

const TAGS = ["V", "A", "R", "K"];
const MS_MINGGU = 7 * 24 * 60 * 60 * 1000;

const kosong = () => ({ V: 0, A: 0, R: 0, K: 0 });

export const meetingNumberFromChapterId = (chapterId) => {
  const n = String(chapterId || "").replace(/\D/g, "");
  return n ? Number(n) : null;
};

/** Waktu mulai jendela pertemuan ke-N, dari Course.meetingAnchor + schedule. */
export const getMeetingStart = (course, meetingNumber) => {
  const anchor = course?.meetingAnchor;

  if (!anchor?.date || !anchor?.meetingNumber) return null;

  const [jam, menit] = String(course?.schedule?.startTime || "00:00")
    .split(":")
    .map((x) => Number(x) || 0);

  const selisih = Number(meetingNumber) - Number(anchor.meetingNumber);
  const mulai = new Date(new Date(anchor.date).getTime() + selisih * MS_MINGGU);
  mulai.setHours(jam, menit, 0, 0);

  return mulai;
};

/**
 * Profil VARK praja MENURUT DATA SEBELUM `cutoff`.
 *
 * Batasnya WAKTU, bukan keanggotaan pertemuan: seluruh akses yang terjadi
 * sebelum jendela pertemuan dimulai ikut membentuk profil, objek pertemuan
 * mana pun. Objek pembelajaran utama tetap dikecualikan karena wajib.
 */
export const buildProfileAtCutoff = async (userId, cutoff) => {
  const user = await User.findById(userId, "varkResult").lean();
  const quizScores = user?.varkResult?.scores || kosong();

  const activities = await LectureActivity.find({
    userId,
    updatedAt: { $lt: cutoff },
  }).lean();

  if (activities.length === 0) {
    const adaptive = calculateAdaptiveVark(quizScores, kosong());
    return { scores: adaptive.scores, source: "kuesioner" };
  }

  const courseIds = [...new Set(activities.map((a) => a.courseId))];
  const courses = await Course.find({ _id: { $in: courseIds } }).lean();

  const tagMap = new Map();

  for (const course of courses) {
    const cid = course._id.toString();

    for (const chapter of course.courseContent || []) {
      const mainIds = new Set(
        MAIN_LECTURE_IDS_BY_CHAPTER[chapter.chapterId] || [],
      );

      for (const lecture of chapter.chapterContent || []) {
        if (mainIds.has(lecture.lectureId)) continue;
        tagMap.set(`${cid}::${lecture.lectureId}`, lecture.tags || null);
      }
    }
  }

  const detik = kosong();

  for (const a of activities) {
    const tag = tagMap.get(`${a.courseId}::${a.lectureId}`);
    if (tag && detik[tag] !== undefined) detik[tag] += a.totalDuration || 0;
  }

  const readingMinutes = Object.fromEntries(
    TAGS.map((t) => [t, Math.round((detik[t] / 60) * 10) / 10]),
  );

  const total = TAGS.reduce((s, t) => s + readingMinutes[t], 0);
  const adaptive = calculateAdaptiveVark(quizScores, readingMinutes);

  return {
    scores: adaptive.scores,
    source: total > 0 ? "adaptif" : "kuesioner",
  };
};

/**
 * Mengembalikan daftar lectureId rekomendasi yang BEKU untuk satu praja
 * pada satu pertemuan. Membuatnya bila belum ada dan jendela sudah mulai.
 *
 * @returns {Promise<string[]|null>} null bila jendela belum dimulai atau
 *          jangkar pertemuan belum diisi
 */
export const ensureFrozenRecommendation = async ({
  userId,
  courseId,
  chapterId,
}) => {
  const cid = String(courseId);

  const tersimpan = await RecommendationSnapshot.findOne({
    userId,
    courseId: cid,
    chapterId,
  }).lean();

  if (tersimpan) return tersimpan.recommendedLectureIds;

  const meetingNumber = meetingNumberFromChapterId(chapterId);
  if (!meetingNumber) return null;

  const course = await Course.findById(courseId).lean();
  const cutoff = getMeetingStart(course, meetingNumber);

  if (!cutoff || new Date() < cutoff) return null;

  const chapter = (course.courseContent || []).find(
    (c) => c.chapterId === chapterId,
  );
  if (!chapter) return null;

  const profile = await buildProfileAtCutoff(userId, cutoff);

  const mainIds = MAIN_LECTURE_IDS_BY_CHAPTER[chapterId] || [];
  const mainLectures = (chapter.chapterContent || []).filter((l) =>
    mainIds.includes(l.lectureId),
  );

  const praja = await User.findById(userId, "npp").lean();
  const { default: Keprajaan } = await import("../models/Keprajaan.js");
  const kepr = praja?.npp
    ? await Keprajaan.findOne({ npp: String(praja.npp).trim() }).lean()
    : null;

  const hasil = getG2Recommendations({
    chapter,
    mainLectures,
    userVarkVector: profile.scores,
    mentalKepribadian: kepr?.mentalKepribadian,
  });

  const ids = (hasil || []).map((l) => l.lectureId);

  try {
    await RecommendationSnapshot.create({
      userId,
      courseId: cid,
      chapterId,
      meetingNumber,
      recommendedLectureIds: ids,
      varkVector: profile.scores,
      profileSource: profile.source,
      cutoff,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const lomba = await RecommendationSnapshot.findOne({
        userId,
        courseId: cid,
        chapterId,
      }).lean();
      if (lomba) return lomba.recommendedLectureIds;
    }
    throw error;
  }

  return ids;
};

/** Seluruh snapshot beberapa praja pada satu mata kuliah. */
export const getFrozenBulk = async (userIds, courseId) => {
  const snaps = await RecommendationSnapshot.find({
    userId: { $in: userIds },
    courseId: String(courseId),
  }).lean();

  const map = new Map();

  for (const s of snaps) {
    if (!map.has(s.userId)) map.set(s.userId, new Map());
    map.get(s.userId).set(s.chapterId, s.recommendedLectureIds);
  }

  return map;
};
