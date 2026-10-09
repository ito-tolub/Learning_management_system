import Course from "../models/Course.js";
import User from "../models/User.js";
import Keprajaan from "../models/Keprajaan.js";
import { LectureActivity } from "../models/LectureActivity.js";
import { RecommendationSnapshot } from "../models/RecommendationSnapshot.js";
import { MAIN_LECTURE_IDS_BY_CHAPTER } from "../utils/calculateFeedbackScore.js";

/*
 * Ketepatan rekomendasi berbasis log (Bab V proposal):
 *   R(u,t)   = 4 OP rekomendasi yang dibekukan (RecommendationSnapshot)
 *   Rel(u,t) = OP kandidat yang diselesaikan praja u (durasi >= 50% durasi acuan)
 *              dan akses pertamanya di antara tau_t (cutoff snapshot) dan tau_UTS
 *   Precision@4 = |R ∩ Rel| / 4
 *   Recall@4    = |R ∩ Rel| / |Rel|   (hanya bila |Rel| > 0)
 *   HitRate@4   = 1 bila |R ∩ Rel| >= 1
 * Rerata per pertemuan = rerata antarpraja; keseluruhan = rerata nilai per pertemuan.
 * Disertai nilai harapan rekomendasi acak dan nilai maksimum (Pers. V.7–V.11).
 */

const N = 4;
const MIN_MEETING = 3;
const MAX_MEETING = 7;
const COMPLETION_RATIO = 0.5;

const mean = (list) => {
  const v = list.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

const round = (v, d = 3) => (v == null ? null : Number(v.toFixed(d)));

// C(n, k) sebagai pecahan agar tidak meluap
const hitRandom = (c, rel) => {
  if (rel <= 0) return 0;
  if (c - rel < N) return 1;
  let p = 1;
  for (let i = 0; i < N; i += 1) p *= (c - rel - i) / (c - i);
  return 1 - p;
};

const summarizePairs = (pairs) => {
  const withRel = pairs.filter((p) => p.relCount > 0);

  return {
    pairs: pairs.length,
    noRelevant: pairs.length - withRel.length,
    precision: mean(pairs.map((p) => p.precision)),
    recall: mean(withRel.map((p) => p.recall)),
    hitRate: mean(pairs.map((p) => p.hit)),
    randomPrecision: mean(pairs.map((p) => p.randomPrecision)),
    randomRecall: mean(withRel.map((p) => p.randomRecall)),
    randomHitRate: mean(pairs.map((p) => p.randomHit)),
    maxPrecision: mean(pairs.map((p) => p.maxPrecision)),
    maxRecall: mean(withRel.map((p) => p.maxRecall)),
    maxHitRate: mean(pairs.map((p) => (p.relCount > 0 ? 1 : 0))),
  };
};

const gain = (m, e, max) =>
  m == null || e == null || max == null || max - e <= 0
    ? null
    : (m - e) / (max - e);

const roundSummary = (s) => {
  const out = { ...s };
  for (const k of Object.keys(out)) {
    if (typeof out[k] === "number" && !Number.isInteger(out[k])) {
      out[k] = round(out[k]);
    }
  }
  out.gainPrecision = round(gain(s.precision, s.randomPrecision, s.maxPrecision));
  out.gainRecall = round(gain(s.recall, s.randomRecall, s.maxRecall));
  out.gainHitRate = round(gain(s.hitRate, s.randomHitRate, s.maxHitRate));
  return out;
};

export const getRecommendationMetrics = async (req, res) => {
  try {
    const kelas = String(req.query.kelas || "G2").toUpperCase();
    // Batas akhir pengamatan (tau_UTS), format YYYY-MM-DD; kosong = sampai sekarang
    const uts = req.query.uts ? new Date(req.query.uts) : null;

    if (uts && Number.isNaN(uts.getTime())) {
      return res.json({ success: false, message: "Tanggal UTS tidak valid" });
    }

    const courseFilter = req.query.courseId ? { _id: req.query.courseId } : {};
    const courses = await Course.find(courseFilter).lean();

    // 1. Kandidat per course + pertemuan
    const candidates = new Map(); // `${courseId}::${chapterId}` -> { meeting, title, lectures: Map(lectureId -> {expectedSec, title}) }

    for (const course of courses) {
      for (const chapter of course.courseContent || []) {
        const meeting = Number(chapter.chapterOrder);
        if (!(meeting >= MIN_MEETING && meeting <= MAX_MEETING)) continue;

        const mainIds = new Set(
          (MAIN_LECTURE_IDS_BY_CHAPTER[chapter.chapterId] || []).map(String),
        );
        const lectures = new Map();

        for (const lecture of chapter.chapterContent || []) {
          const id = String(lecture.lectureId);
          if (mainIds.has(id) || lectures.has(id)) continue;
          lectures.set(id, {
            expectedSec: (Number(lecture.lectureDuration) || 0) * 60,
            title: lecture.lectureTitle,
          });
        }

        candidates.set(`${course._id}::${chapter.chapterId}`, {
          meeting,
          title: chapter.chapterTitle,
          lectures,
        });
      }
    }

    // 2. Praja kelas yang dipilih
    const prajaList = await Keprajaan.find({ kelas }, "npp nama kelas").lean();
    const users = await User.find(
      { npp: { $in: prajaList.map((p) => p.npp) } },
      "_id npp",
    ).lean();
    const userIdByNpp = new Map(users.map((u) => [String(u.npp).trim(), String(u._id)]));
    const praja = prajaList
      .map((p) => ({ npp: String(p.npp).trim(), nama: p.nama, userId: userIdByNpp.get(String(p.npp).trim()) }))
      .filter((p) => p.userId);
    const userIds = praja.map((p) => p.userId);

    // 3. Snapshot rekomendasi dan log aktivitas
    const [snapshots, activities] = await Promise.all([
      RecommendationSnapshot.find({ userId: { $in: userIds } }).lean(),
      LectureActivity.find(
        { userId: { $in: userIds } },
        "userId courseId lectureId totalDuration createdAt",
      ).lean(),
    ]);

    const snapByKey = new Map(
      snapshots.map((s) => [`${s.userId}::${s.courseId}::${s.chapterId}`, s]),
    );

    // userId::courseId::lectureId -> { duration, firstAt }
    const actByKey = new Map();
    for (const a of activities) {
      const key = `${a.userId}::${a.courseId}::${a.lectureId}`;
      const row = actByKey.get(key) || { duration: 0, firstAt: null };
      row.duration += Number(a.totalDuration) || 0;
      const at = a.createdAt ? new Date(a.createdAt) : null;
      if (at && (!row.firstAt || at < row.firstAt)) row.firstAt = at;
      actByKey.set(key, row);
    }

    // 4. Hitung per pasangan praja–pertemuan
    const pairs = [];
    let missingSnapshot = 0;
    const activeNpp = new Set();

    for (const p of praja) {
      for (const [ckey, cand] of candidates) {
        const [courseId, chapterId] = ckey.split("::");
        const snap = snapByKey.get(`${p.userId}::${courseId}::${chapterId}`);

        if (!snap) {
          missingSnapshot += 1;
          continue;
        }

        const tauT = new Date(snap.cutoff);
        const rel = new Set();
        let anyActivity = false;

        for (const [lectureId, info] of cand.lectures) {
          const act = actByKey.get(`${p.userId}::${courseId}::${lectureId}`);
          if (!act?.firstAt) continue;
          if (act.firstAt < tauT || (uts && act.firstAt >= uts)) continue;

          anyActivity = true;
          if (info.expectedSec > 0 && act.duration >= COMPLETION_RATIO * info.expectedSec) {
            rel.add(lectureId);
          }
        }

        if (anyActivity) activeNpp.add(p.npp);

        const recs = (snap.recommendedLectureIds || []).slice(0, N).map(String);
        const hits = recs.filter((id) => rel.has(id));
        const c = cand.lectures.size;
        const r = rel.size;

        pairs.push({
          npp: p.npp,
          nama: p.nama,
          meeting: cand.meeting,
          candidateCount: c,
          recommended: recs.map((id) => ({
            lectureId: id,
            title: cand.lectures.get(id)?.title || id,
            relevant: rel.has(id),
          })),
          relCount: r,
          hitCount: hits.length,
          precision: hits.length / N,
          recall: r > 0 ? hits.length / r : null,
          hit: hits.length > 0 ? 1 : 0,
          randomPrecision: c > 0 ? r / c : 0,
          randomRecall: r > 0 && c > 0 ? Math.min(N / c, 1) : null,
          randomHit: hitRandom(c, r),
          maxPrecision: Math.min(r, N) / N,
          maxRecall: r > 0 ? Math.min(r, N) / r : null,
        });
      }
    }

    // Praja tanpa aktivitas sama sekali selama periode pengamatan dikeluarkan
    const inactiveStudents = praja.filter((p) => !activeNpp.has(p.npp));
    const inactive = inactiveStudents.length;
    for (let i = pairs.length - 1; i >= 0; i -= 1) {
      if (!activeNpp.has(pairs[i].npp)) pairs.splice(i, 1);
    }

    // 5. Ringkasan per pertemuan dan keseluruhan
    const meetings = [...new Set(pairs.map((x) => x.meeting))].sort((a, b) => a - b);
    const perMeetingRaw = meetings.map((m) => ({
      meeting: m,
      ...summarizePairs(pairs.filter((x) => x.meeting === m)),
    }));

    const metricKeys = [
      "precision", "recall", "hitRate",
      "randomPrecision", "randomRecall", "randomHitRate",
      "maxPrecision", "maxRecall", "maxHitRate",
    ];
    const overallRaw = {
      pairs: pairs.length,
      noRelevant: perMeetingRaw.reduce((s, m) => s + m.noRelevant, 0),
    };
    for (const k of metricKeys) overallRaw[k] = mean(perMeetingRaw.map((m) => m[k]));

    // Ringkasan per praja (rerata antar pertemuan)
    const perStudent = praja.filter((p) => activeNpp.has(p.npp)).map((p) => {
      const mine = pairs.filter((x) => x.npp === p.npp);
      return {
        npp: p.npp,
        nama: p.nama,
        meetings: mine.length,
        precision: round(mean(mine.map((x) => x.precision))),
        recall: round(mean(mine.filter((x) => x.relCount > 0).map((x) => x.recall))),
        hitRate: round(mean(mine.map((x) => x.hit))),
      };
    });

    return res.json({
      success: true,
      kelas,
      rules: {
        N,
        meetings: `${MIN_MEETING}-${MAX_MEETING}`,
        completionRatio: COMPLETION_RATIO,
        uts: uts ? uts.toISOString() : null,
      },
      excluded: {
        missingSnapshot,
        inactive,
        inactiveNames: inactiveStudents.map((p) => p.nama),
      },
      overall: roundSummary(overallRaw),
      perMeeting: perMeetingRaw.map(roundSummary),
      perStudent,
      pairs: pairs.map((x) => ({
        ...x,
        precision: round(x.precision),
        recall: round(x.recall),
        randomPrecision: round(x.randomPrecision),
        randomRecall: round(x.randomRecall),
        randomHit: round(x.randomHit),
        maxPrecision: round(x.maxPrecision),
        maxRecall: round(x.maxRecall),
      })),
    });
  } catch (error) {
    console.error("Get Recommendation Metrics Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
