import mongoose from "mongoose";

/**
 * Empat objek rekomendasi yang DIBEKUKAN untuk satu praja pada satu
 * pertemuan. Dibuat sekali saat jendela pertemuan dimulai, lalu tidak
 * pernah berubah.
 *
 * CATATAN: yang dibekukan hanya DAFTAR OBJEKNYA. Nilai interaksi tetap
 * dihitung dari seluruh durasi akses kapan pun terjadinya, sehingga
 * praja yang mengejar materi terlambat tetap memperoleh nilai.
 */

const snapshotSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    chapterId: { type: String, required: true },
    meetingNumber: { type: Number, required: true },

    // Urut sesuai peringkat skor hibrida
    recommendedLectureIds: { type: [String], default: [] },

    // Profil yang dipakai saat pembekuan — bukti untuk lampiran naskah
    varkVector: {
      V: { type: Number, default: 0 },
      A: { type: Number, default: 0 },
      R: { type: Number, default: 0 },
      K: { type: Number, default: 0 },
    },
    profileSource: { type: String, default: "kuesioner" }, // kuesioner | adaptif

    cutoff: { type: Date, required: true },   // batas waktu data profil
    frozenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

snapshotSchema.index(
  { userId: 1, courseId: 1, chapterId: 1 },
  { unique: true },
);

export const RecommendationSnapshot = mongoose.model(
  "RecommendationSnapshot",
  snapshotSchema,
);
