import Course from "../models/Course.js";
import User from "../models/User.js";
import { LectureActivity } from "../models/LectureActivity.js";
import { RecommendationRanking } from "../models/RecommendationRanking.js";
import { calculateAdaptiveVark } from "./calculateAdaptiveVark.js";
import { MAIN_LECTURE_IDS_BY_CHAPTER } from "./calculateFeedbackScore.js";
import { rankChapterForPraja } from "./peringkatRekomendasi.js";

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
 * Batasnya WAKTU, bukan keanggotaan pertemuan: setiap OP yang PERTAMA KALI
 * diakses (createdAt) sebelum jendela pertemuan dimulai ikut membentuk
 * profil, OP pertemuan mana pun. Objek pembelajaran utama tetap
 * dikecualikan karena wajib.
 */
export const buildProfileAtCutoff = async (userId, cutoff) => {
  const user = await User.findById(userId, "varkResult").lean();
  const quizScores = user?.varkResult?.scores || kosong();

  const activities = await LectureActivity.find({
    userId,
    createdAt: { $lt: cutoff },
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
 * Membentuk (sekali) peringkat lengkap OP untuk satu praja pada satu
 * pertemuan, lalu menyimpannya di koleksi recommendationrankings.
 * Peringkat tidak ditampilkan kepada praja dan tidak pernah dihitung ulang.
 *
 * Hasilnya tidak bergantung pada kapan fungsi ini dipanggil: profil VARK
 * dihitung dari aktivitas SEBELUM batas awal pertemuan (cutoff), sehingga
 * pembentukan yang tertunda menghasilkan peringkat yang sama.
 *
 * @returns {Promise<{created:boolean}|null>} null bila jendela pertemuan
 *          belum dimulai, jangkar pertemuan belum diisi, atau pengguna
 *          bukan praja kelas G1/G2
 */
export const ensureRecommendationRanking = async ({
  userId,
  courseId,
  chapterId,
}) => {
  const cid = String(courseId);

  const ada = await RecommendationRanking.exists({
    userId,
    courseId: cid,
    chapterId,
  });
  if (ada) return { created: false };

  const meetingNumber = meetingNumberFromChapterId(chapterId);
  if (!meetingNumber) return null;

  const course = await Course.findById(courseId).lean();
  if (!course) return null;

  const cutoff = getMeetingStart(course, meetingNumber);
  if (!cutoff || new Date() < cutoff) return null;

  const praja = await User.findById(userId, "npp").lean();
  const { default: Keprajaan } = await import("../models/Keprajaan.js");
  const kepr = praja?.npp
    ? await Keprajaan.findOne({ npp: String(praja.npp).trim() }).lean()
    : null;

  if (!["G1", "G2"].includes(kepr?.kelas)) return null;

  const { getMentalReference } = await import("./mentalReference.js");
  const mentalReference = await getMentalReference();

  const profile = await buildProfileAtCutoff(userId, cutoff);

  const hasil = rankChapterForPraja({
    course,
    chapterId,
    profile,
    mentalKepribadian: kepr.mentalKepribadian,
    mentalReference,
  });
  if (!hasil) return null;

  try {
    await RecommendationRanking.create({
      userId,
      courseId: cid,
      chapterId,
      meetingNumber,
      npp: String(praja.npp).trim(),
      nama: kepr.nama,
      kelas: kepr.kelas,
      varkVector: profile.scores,
      profileSource: profile.source,
      profileOrigin: "sistem",
      mentalKepribadian: kepr.mentalKepribadian,
      mentalReference,
      contentGranularity: hasil.contentGranularity,
      cognitiveLevel: hasil.cognitiveLevel,
      cutoff,
      ranking: hasil.ranking,
    });
  } catch (error) {
    // Permintaan paralel sudah membuatnya: tidak apa-apa.
    if (error?.code !== 11000) throw error;
    return { created: false };
  }

  return { created: true };
};

/**
 * Empat OP teratas (lectureId, urut peringkat) untuk beberapa praja pada
 * satu mata kuliah: Map(userId -> Map(chapterId -> [lectureId])).
 */
export const getTop4Bulk = async (userIds, courseId) => {
  const docs = await RecommendationRanking.find(
    { userId: { $in: userIds }, courseId: String(courseId) },
    "userId chapterId ranking.lectureId ranking.rank ranking.isTop4",
  ).lean();

  const map = new Map();

  for (const d of docs) {
    if (!map.has(d.userId)) map.set(d.userId, new Map());
    const top4 = (d.ranking || [])
      .filter((r) => r.isTop4)
      .sort((a, b) => a.rank - b.rank)
      .map((r) => r.lectureId);
    map.get(d.userId).set(d.chapterId, top4);
  }

  return map;
};