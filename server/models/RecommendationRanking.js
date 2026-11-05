import mongoose from "mongoose";

/**
 * Peringkat LENGKAP objek pembelajaran (OP) untuk satu praja pada satu
 * pertemuan menurut algoritma hybrid (0,7 kemiripan VARK + 0,3 kecocokan
 * instruksional). Dibuat sekali pada awal pertemuan (τN), tidak pernah
 * dihitung ulang, dan TIDAK ditampilkan kepada praja di kelas mana pun:
 * koleksi ini hanya dipakai untuk evaluasi offline.
 *
 * Satu dokumen per (praja, mata kuliah, pertemuan). Seluruh nilai disalin
 * saat peringkat ditetapkan sehingga proses dapat ditelusuri kembali.
 */
const rankedItemSchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true }, // 1 = teratas
    lectureId: { type: String, required: true },
    sourceIndex: { type: Number, required: true }, // posisi di data matkul
    lectureTitle: { type: String, default: "" },
    modality: { type: String, default: "" }, // V | A | R | K
    varkSimilarity: { type: Number, default: 0 }, // kosinus VARK (CBF)
    instructionalCompatibility: { type: Number, default: 0 }, // KBF
    hybridScore: { type: Number, default: 0 },
    hybridPercentage: { type: Number, default: 0 },
    isTop4: { type: Boolean, default: false },
  },
  { _id: false },
);

const recommendationRankingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    courseId: { type: String, required: true },
    chapterId: { type: String, required: true },
    meetingNumber: { type: Number, required: true },

    // Identitas praja
    npp: { type: String, default: "" },
    nama: { type: String, default: "" },
    kelas: { type: String, default: "" }, // G1 | G2

    // Profil VARK yang dipakai
    varkVector: {
      V: { type: Number, default: 0 },
      A: { type: Number, default: 0 },
      R: { type: Number, default: 0 },
      K: { type: Number, default: 0 },
    },
    profileSource: { type: String, default: "kuesioner" }, // kuesioner | adaptif
    // sistem = dibentuk otomatis saat praja membuka pertemuan;
    // snapshot = disalin dari recommendationsnapshots lama;
    // rekonstruksi = dihitung ulang dari log aktivitas oleh skrip.
    profileOrigin: { type: String, default: "sistem" },

    // Profil instruksional
    mentalKepribadian: { type: Number, default: null },
    mentalReference: { type: Number, default: null },
    contentGranularity: { type: String, default: "" }, // utuh | tersegmentasi
    cognitiveLevel: { type: String, default: "" }, // C4-C6 | C1-C3

    // Batas waktu penetapan (τN)
    cutoff: { type: Date, default: null },

    // Peringkat seluruh kandidat, urut dari rank 1
    ranking: { type: [rankedItemSchema], default: [] },

    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

recommendationRankingSchema.index(
  { userId: 1, courseId: 1, chapterId: 1 },
  { unique: true },
);
recommendationRankingSchema.index({ courseId: 1, meetingNumber: 1, kelas: 1 });

export const RecommendationRanking = mongoose.model(
  "RecommendationRanking",
  recommendationRankingSchema,
);
