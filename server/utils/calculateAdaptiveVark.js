// ============================================================
// FILE BARU: server/utils/calculateAdaptiveVark.js
// ============================================================

const TAG_KEYS = ["V", "A", "R", "K"];

/**
 * Menghitung skor VARK adaptif dengan menggabungkan:
 * - hasil kuisioner (bobot 50%)
 * - waktu baca aktual per modalitas (bobot 50%)
 *
 * @param {{V:number,A:number,R:number,K:number}} quizScores - skor mentah dari kuisioner
 * @param {{V:number,A:number,R:number,K:number}} readingMinutes - total menit akses per tag
 * @param {{quiz:number, reading:number}} weights - bobot masing-masing sumber (default 0.5/0.5)
 * @returns {{ scores: {V,A,R,K}, dominant: string[], sources: {quizPercent, readingPercent} }}
 */
export function calculateAdaptiveVark(
  quizScores = {},
  readingMinutes = {},
  weights = { quiz: 0.5, reading: 0.5 },
) {
  const quizTotal = TAG_KEYS.reduce((sum, k) => sum + (Number(quizScores[k]) || 0), 0);
  const readingTotal = TAG_KEYS.reduce((sum, k) => sum + (Number(readingMinutes[k]) || 0), 0);

  const quizPercent = {};
  const readingPercent = {};
  for (const k of TAG_KEYS) {
    quizPercent[k] = quizTotal > 0 ? (Number(quizScores[k]) || 0) / quizTotal : 0;
    readingPercent[k] = readingTotal > 0 ? (Number(readingMinutes[k]) || 0) / readingTotal : 0;
  }

  // Fallback: kalau salah satu sumber kosong, alihkan bobot 100% ke sumber yang ada
  let quizWeight = weights.quiz;
  let readingWeight = weights.reading;

  if (quizTotal === 0 && readingTotal === 0) {
    // tidak ada data sama sekali
    return {
      scores: { V: 0, A: 0, R: 0, K: 0 },
      dominant: [],
      sources: { quizPercent, readingPercent, quizTotal, readingTotal },
    };
  }
  if (quizTotal === 0) {
    quizWeight = 0;
    readingWeight = 1;
  } else if (readingTotal === 0) {
    quizWeight = 1;
    readingWeight = 0;
  }

  const blended = {};
  let maxScore = -1;
  for (const k of TAG_KEYS) {
    blended[k] = Math.round((quizWeight * quizPercent[k] + readingWeight * readingPercent[k]) * 1000) / 10; // dalam persen, 1 desimal
    if (blended[k] > maxScore) maxScore = blended[k];
  }

  const dominant = TAG_KEYS.filter((k) => blended[k] === maxScore && maxScore > 0);

  return {
    scores: blended,
    dominant,
    sources: {
      quizPercent: Object.fromEntries(TAG_KEYS.map((k) => [k, Math.round(quizPercent[k] * 1000) / 10])),
      readingPercent: Object.fromEntries(TAG_KEYS.map((k) => [k, Math.round(readingPercent[k] * 1000) / 10])),
      quizTotal,
      readingTotal,
      quizWeight,
      readingWeight,
    },
  };
}
