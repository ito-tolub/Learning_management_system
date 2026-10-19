import mongoose from "mongoose";

/**
 * Rating skala Likert 1-5 yang diberikan praja saat menandai selesai
 * sebuah objek pembelajaran. Satu dokumen per (praja, OP); penilaian ulang
 * memperbarui nilai dan riwayatnya tetap tersimpan.
 */
const historySchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const lectureRatingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    courseId: { type: String, required: true },
    chapterId: { type: String, default: "" },
    lectureId: { type: String, required: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    ratedAt: { type: Date, default: Date.now },

    // Konteks tampilan saat dinilai (untuk analisis)
    modality: { type: String, default: "" }, // V | A | R | K
    section: {
      type: String,
      enum: ["utama", "rekomendasi", "lainnya", ""],
      default: "",
    },
    position: { type: Number, default: 0 },

    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
);

lectureRatingSchema.index(
  { userId: 1, courseId: 1, lectureId: 1 },
  { unique: true },
);

export const LectureRating = mongoose.model(
  "LectureRating",
  lectureRatingSchema,
);