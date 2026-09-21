import Keprajaan from "../models/Keprajaan.js";
import { SystemParameter } from "../models/SystemParameter.js";

const KEY = "mentalReference";

/** Dipakai hanya bila data keprajaan kosong sama sekali. */
export const FALLBACK_MENTAL_REFERENCE = 84;

/**
 * Cache proses. Ambang dibaca setiap kali objek diperingkat, sehingga
 * tidak layak menembak basis data tiap kali. Dikosongkan otomatis saat
 * nilai dihitung ulang.
 */
let cached = null;

/**
 * Statistik mentalKepribadian praja yang sudah ditempatkan pada kelas.
 * Praja tanpa kelas (misalnya angkatan lain yang ikut tersimpan di
 * koleksi keprajaan) tidak ikut dihitung.
 */
export const computeMentalReferenceStats = async () => {
  const praja = await Keprajaan.find(
    { kelas: { $exists: true, $nin: [null, ""] } },
    "mentalKepribadian",
  ).lean();

  const nilai = praja
    .map((p) => Number(p.mentalKepribadian))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (nilai.length === 0) {
    return {
      value: FALLBACK_MENTAL_REFERENCE,
      sampleSize: 0,
      min: null,
      max: null,
      stdDev: null,
      method: "nilai cadangan (tidak ada praja berkelas)",
    };
  }

  const rata = nilai.reduce((a, b) => a + b, 0) / nilai.length;
  const varians =
    nilai.reduce((acc, n) => acc + (n - rata) ** 2, 0) / nilai.length;

  return {
    value: Math.round(rata * 100) / 100,
    sampleSize: nilai.length,
    min: Math.min(...nilai),
    max: Math.max(...nilai),
    stdDev: Math.round(Math.sqrt(varians) * 100) / 100,
    method: "rata-rata mentalKepribadian praja yang memiliki kelas",
  };
};

/**
 * Nilai ambang yang berlaku.
 *   1. Ada di cache        -> pakai cache
 *   2. Ada di basis data   -> pakai itu
 *   3. Belum ada           -> hitung, SIMPAN, bekukan
 * Langkah 3 hanya terjadi sekali. Setelah itu nilai tetap walau data
 * keprajaan berubah, kecuali dihitung ulang secara sengaja.
 */
export const getMentalReference = async () => {
  if (cached !== null) return cached;

  const tersimpan = await SystemParameter.findOne({ key: KEY }).lean();

  if (tersimpan) {
    cached = tersimpan.value;
    return cached;
  }

  const stats = await computeMentalReferenceStats();

  await SystemParameter.create({
    key: KEY,
    ...stats,
    frozen: true,
    note: "Dihitung otomatis pada pemanggilan pertama.",
  });

  cached = stats.value;
  return cached;
};

/** Rincian lengkap untuk ditampilkan ke dosen. */
export const getMentalReferenceDetail = async () => {
  await getMentalReference();
  return SystemParameter.findOne({ key: KEY }).lean();
};

/**
 * Menghitung ulang dan menimpa nilai tersimpan. Hanya dipanggil secara
 * sengaja, misalnya pada awal semester baru setelah data keprajaan
 * diperbarui.
 */
export const recomputeMentalReference = async (computedBy = null, note = "") => {
  const stats = await computeMentalReferenceStats();

  const hasil = await SystemParameter.findOneAndUpdate(
    { key: KEY },
    { $set: { ...stats, frozen: true, computedBy, note } },
    { new: true, upsert: true },
  ).lean();

  cached = hasil.value;
  return hasil;
};
