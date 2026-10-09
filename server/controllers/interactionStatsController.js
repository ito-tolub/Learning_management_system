import Course from "../models/Course.js";
import User from "../models/User.js";
import Keprajaan from "../models/Keprajaan.js";
import { LectureActivity } from "../models/LectureActivity.js";
import {
  MAIN_LECTURE_IDS_BY_CHAPTER,
  MIN_VALID_ACCESS_SEC,
} from "../utils/calculateFeedbackScore.js";

/*
 * Indikator interaksi praja terhadap OP pendukung, dibandingkan G1 vs G2.
 *   F = frekuensi akses (jumlah accessCount)
 *   U = jumlah OP unik yang diakses
 *   T = total durasi akses efektif (menit), durasi tiap OP dibatasi 1x durasi acuan
 *   D = T / U (menit per OP)
 * Hanya OP pendukung (bukan OP utama) dan akses valid (>= MIN_VALID_ACCESS_SEC).
 */

const KELAS = ["G1", "G2"];
const MAX_MEETING = 7;

const round = (value, digits = 2) =>
  value == null ? null : Number(value.toFixed(digits));

const describe = (values) => {
  const list = values.filter((v) => Number.isFinite(v));
  const n = list.length;

  if (n === 0) return { n: 0, mean: null, sd: null, median: null };

  const mean = list.reduce((sum, v) => sum + v, 0) / n;
  const sd =
    n > 1
      ? Math.sqrt(list.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1))
      : 0;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return { n, mean: round(mean), sd: round(sd), median: round(median) };
};

const emptyIndicator = () => ({ F: 0, U: 0, T: 0 });

const summarize = (prajaList, pick) => {
  const result = {};

  for (const kelas of KELAS) {
    const rows = prajaList.filter((p) => p.kelas === kelas).map(pick);

    result[kelas] = {
      F: describe(rows.map((r) => r.F)),
      U: describe(rows.map((r) => r.U)),
      T: describe(rows.map((r) => r.T)),
      // D hanya untuk praja yang punya minimal satu OP valid
      D: describe(rows.filter((r) => r.U > 0).map((r) => r.T / r.U)),
      zeroCount: rows.filter((r) => r.U === 0).length,
    };
  }

  return result;
};

export const getInteractionStats = async (req, res) => {
  try {
    const courseFilter = req.query.courseId ? { _id: req.query.courseId } : {};
    const courses = await Course.find(courseFilter).lean();

    // 1. Peta OP pendukung: courseId::lectureId -> { meeting, expectedSec }
    const supportMap = new Map();
    const meetings = new Map(); // chapterOrder -> { title, totalSupport }

    for (const course of courses) {
      for (const chapter of course.courseContent || []) {
        const mainIds = new Set(
          (MAIN_LECTURE_IDS_BY_CHAPTER[chapter.chapterId] || []).map(String),
        );
        const meeting = Number(chapter.chapterOrder);

        if (!(meeting <= MAX_MEETING)) continue;
        for (const lecture of chapter.chapterContent || []) {
          if (mainIds.has(String(lecture.lectureId))) continue;

          const expectedSec = (Number(lecture.lectureDuration) || 0) * 60;
          if (expectedSec <= 0) continue;

          supportMap.set(`${course._id}::${lecture.lectureId}`, {
            meeting,
            expectedSec,
          });

          const info = meetings.get(meeting) || {
            meeting,
            title: chapter.chapterTitle,
            totalSupport: 0,
          };
          info.totalSupport += 1;
          meetings.set(meeting, info);
        }
      }
    }

    // 2. Praja G1/G2 dan userId Clerk
    const semuaPraja = await Keprajaan.find(
      { kelas: { $in: KELAS } },
      "npp nama kelas",
    ).lean();
    const users = await User.find({ npp: { $exists: true } }, "_id npp").lean();
    const userIdByNpp = new Map(
      users.map((u) => [String(u.npp).trim(), String(u._id)]),
    );

    const prajaList = semuaPraja.map((p) => ({
      npp: String(p.npp).trim(),
      nama: p.nama,
      kelas: String(p.kelas).toUpperCase(),
      userId: userIdByNpp.get(String(p.npp).trim()) || null,
      perMeeting: new Map(),
      overall: emptyIndicator(),
    }));
    const prajaByUserId = new Map(
      prajaList.filter((p) => p.userId).map((p) => [p.userId, p]),
    );

    // 3. Gabungkan aktivitas per praja per OP (bisa ada lebih dari satu dokumen)
    const activities = await LectureActivity.find(
      { userId: { $in: [...prajaByUserId.keys()] } },
      "userId courseId lectureId accessCount totalDuration",
    ).lean();

    const merged = new Map();

    for (const a of activities) {
      const key = `${a.courseId}::${a.lectureId}`;
      if (!supportMap.has(key)) continue;

      const mkey = `${a.userId}||${key}`;
      const row = merged.get(mkey) || {
        userId: String(a.userId),
        key,
        accessCount: 0,
        duration: 0,
      };
      row.accessCount += Number(a.accessCount) || 0;
      row.duration += Number(a.totalDuration) || 0;
      merged.set(mkey, row);
    }

    let shortCount = 0;

    for (const row of merged.values()) {
      if (row.duration < MIN_VALID_ACCESS_SEC) {
        shortCount += 1;
        continue;
      }

      const praja = prajaByUserId.get(row.userId);
      if (!praja) continue;

      const { meeting, expectedSec } = supportMap.get(row.key);
      const effectiveMin = Math.min(row.duration, expectedSec) / 60;

      const bucket = praja.perMeeting.get(meeting) || emptyIndicator();
      bucket.F += row.accessCount;
      bucket.U += 1;
      bucket.T += effectiveMin;
      praja.perMeeting.set(meeting, bucket);

      praja.overall.F += row.accessCount;
      praja.overall.U += 1;
      praja.overall.T += effectiveMin;
    }

    // 4. Ringkasan
    const meetingList = [...meetings.values()].sort(
      (a, b) => a.meeting - b.meeting,
    );

    const perMeeting = meetingList.map((m) => ({
      ...m,
      stats: summarize(
        prajaList,
        (p) => p.perMeeting.get(m.meeting) || emptyIndicator(),
      ),
    }));

    const students = prajaList
      .map((p) => ({
        npp: p.npp,
        nama: p.nama,
        kelas: p.kelas,
        linked: Boolean(p.userId),
        F: p.overall.F,
        U: p.overall.U,
        T: round(p.overall.T),
        D: p.overall.U > 0 ? round(p.overall.T / p.overall.U) : null,
        perMeeting: Object.fromEntries(
          meetingList.map((m) => {
            const b = p.perMeeting.get(m.meeting) || emptyIndicator();
            return [m.meeting, { F: b.F, U: b.U, T: round(b.T) }];
          }),
        ),
      }))
      .sort((a, b) => a.kelas.localeCompare(b.kelas) || b.T - a.T);

    return res.json({
      success: true,
      rules: {
        minValidSec: MIN_VALID_ACCESS_SEC,
        durationCap: "1x durasi acuan",
        scope: "OP pendukung",
      },
      shortCount,
      overall: summarize(prajaList, (p) => p.overall),
      perMeeting,
      students,
    });
  } catch (error) {
    console.error("Get Interaction Stats Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
