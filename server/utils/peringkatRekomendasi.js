/**
 * Inti perhitungan peringkat rekomendasi (murni, tanpa akses basis data).
 * Dipakai oleh scripts/hitungPeringkat.js.
 */
import { calculateAdaptiveVark } from "./calculateAdaptiveVark.js";
import {
  MAIN_LECTURE_IDS_BY_CHAPTER,
  getG2FullRanking,
  getInstructionalProfile,
} from "./calculateFeedbackScore.js";

const TAGS = ["V", "A", "R", "K"];
const kosong = () => ({ V: 0, A: 0, R: 0, K: 0 });

/**
 * Profil VARK menurut data SEBELUM cutoff. Sebuah OP ikut membentuk profil
 * bila PERTAMA KALI diakses (createdAt) sebelum cutoff. Logika sama dengan
 * buildProfileAtCutoff (freezeRecommendation.js), tetapi menerima data
 * yang sudah dimuat sehingga bisa diuji tanpa basis data.
 *
 * @param quizScores  skor kuesioner praja
 * @param activities  dokumen LectureActivity milik praja
 * @param course      dokumen matkul
 * @param cutoff      Date
 */
export const buildProfileFromData = ({
  quizScores,
  activities,
  course,
  cutoff,
}) => {
  const quiz = quizScores || kosong();
  const sebelum = (activities || []).filter(
    (a) => new Date(a.createdAt) < cutoff,
  );

  if (sebelum.length === 0) {
    const adaptive = calculateAdaptiveVark(quiz, kosong());
    return { scores: adaptive.scores, source: "kuesioner" };
  }

  const cid = String(course._id);
  const tagMap = new Map();

  for (const chapter of course.courseContent || []) {
    const mainIds = new Set(
      MAIN_LECTURE_IDS_BY_CHAPTER[chapter.chapterId] || [],
    );
    for (const lecture of chapter.chapterContent || []) {
      if (mainIds.has(lecture.lectureId)) continue;
      tagMap.set(`${cid}::${lecture.lectureId}`, lecture.tags || null);
    }
  }

  const detik = kosong();
  for (const a of sebelum) {
    const tag = tagMap.get(`${a.courseId}::${a.lectureId}`);
    if (tag && detik[tag] !== undefined) detik[tag] += a.totalDuration || 0;
  }

  const readingMinutes = Object.fromEntries(
    TAGS.map((t) => [t, Math.round((detik[t] / 60) * 10) / 10]),
  );
  const total = TAGS.reduce((s, t) => s + readingMinutes[t], 0);
  const adaptive = calculateAdaptiveVark(quiz, readingMinutes);

  return {
    scores: adaptive.scores,
    source: total > 0 ? "adaptif" : "kuesioner",
  };
};

const round = (n, d) => Number(Number(n).toFixed(d));

/**
 * Peringkat lengkap satu praja pada satu pertemuan.
 * `profile` = { scores, source, origin }
 */
export const rankChapterForPraja = ({
  course,
  chapterId,
  profile,
  mentalKepribadian,
  mentalReference,
}) => {
  const chapter = (course.courseContent || []).find(
    (c) => c.chapterId === chapterId,
  );
  if (!chapter) return null;

  // OP utama HARUS membawa _sourceIndex: pengecualian kandidat di
  // getG2Recommendations dicocokkan lewat _sourceIndex, bukan lectureId.
  // Untuk lectureId ganda dipilih yang lectureOrder-nya terkecil, sama
  // dengan Player.jsx.
  const mainIds = MAIN_LECTURE_IDS_BY_CHAPTER[chapterId] || [];
  const indexed = (chapter.chapterContent || []).map((l, i) => ({
    ...l,
    _sourceIndex: i,
  }));
  const orderOf = (l) =>
    Number.isFinite(Number(l.lectureOrder))
      ? Number(l.lectureOrder)
      : Number.POSITIVE_INFINITY;
  const mainLectures = mainIds
    .map((id) =>
      indexed
        .filter((l) => l.lectureId === id)
        .sort((a, b) => orderOf(a) - orderOf(b) || a._sourceIndex - b._sourceIndex)[0],
    )
    .filter(Boolean);

  const hasil = getG2FullRanking({
    chapter,
    mainLectures,
    userVarkVector: profile.scores,
    mentalKepribadian,
    mentalReference,
  });

  const instr = getInstructionalProfile(mentalKepribadian, mentalReference);

  return {
    contentGranularity: instr?.contentGranularity || "",
    cognitiveLevel: instr?.cognitiveLevel || "",
    ranking: hasil.map((l) => ({
      rank: l.rank,
      lectureId: l.lectureId,
      sourceIndex: l._sourceIndex,
      lectureTitle: l.lectureTitle || "",
      modality: String(l.tags || ""),
      varkSimilarity: round(l._varkSimilarity, 6),
      instructionalCompatibility: l._instructionalCompatibility,
      hybridScore: round(l._hybridScore, 6),
      hybridPercentage: l._hybridPercentage,
      isTop4: l.rank <= 4,
    })),
  };
};
