import mongoose from "mongoose";

/** Jumlah pertemuan yang dicatat presensinya. */
export const TOTAL_MEETINGS = 16;

/**
 * Pertemuan yang masuk periode eksperimen dan dihitung dalam SES.
 * Ubah di sini bila periode eksperimen berubah.
 */
export const EXPERIMENT_MEETINGS = [1, 2, 3, 4, 5, 6, 7];

/** Status yang dihitung sebagai kehadiran pada perhitungan SES. */
export const PRESENT_STATUSES = ["hadir"];

export const ATTENDANCE_STATUSES = [
  "hadir",
  "sakit",
  "izin",
  "alpa",
];

const attendanceSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },

    // 1..16, bukan chapterId — pertemuan 8 ke atas belum punya materi
    meetingNumber: {
      type: Number,
      required: true,
      min: 1,
      max: TOTAL_MEETINGS,
    },

    userId: { type: String, required: true, index: true },
    npp: { type: String, default: null },

    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      required: true,
    },

    keterangan: { type: String, default: "" },

    // Diisi dari req.educator (JWT dosen)
    recordedBy: { type: String, default: null },
  },
  { timestamps: true },
);

// Satu praja hanya punya satu catatan per pertemuan per mata kuliah
attendanceSchema.index(
  { courseId: 1, meetingNumber: 1, userId: 1 },
  { unique: true },
);

export const Attendance = mongoose.model("Attendance", attendanceSchema);
