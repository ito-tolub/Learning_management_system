import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema(
  {
    lectureId: { type: String, required: true },
    lectureTitle: { type: String, required: true },
    lectureDuration: { type: Number, required: true },
    lectureUrl: { type: String, required: true },
    lectureOrder: { type: Number, required: true },
  },
  { _id: false },
);

const chapterSchema = new mongoose.Schema(
  {
    chapterId: { type: String, required: true },
    chapterOrder: { type: Number, required: true },
    chapterTitle: { type: String, required: true },
    chapterContent: [lectureSchema],
  },
  { _id: false },
);

const courseSchema = new mongoose.Schema(
  {
    courseTitle: { type: String, required: true },
    courseDescription: { type: String, required: true },
    courseThumbnail: { type: String },
    isPublished: { type: Boolean, default: true },
    courseContent: [],

    educator: {
      type: [String],
      required: true,
      validate: {
        validator: (nips) => Array.isArray(nips) && nips.length > 0,

        message: "Minimal satu NIP dosen wajib diisi",
      },
    },

    enrolledStudents: [{ type: String, ref: "User" }],

    // Jadwal kelas (diisi via seed)
    schedule: {
      day: {
        type: String,
        enum: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
        default: null,
      },
      startTime: { type: String, default: null }, // "08:00"
      endTime: { type: String, default: null }, // "09:40"
    },

    // Override nama dosen utk tampilan (opsional; menang atas virtual 'pengajar')
    pengajarNama: { type: String, default: null },

    tags: { type: String, enum: ["V", "A", "R", "K"], default: "V" },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: { virtuals: true }, // ← wajib agar virtual ikut saat di-JSON-kan
    toObject: { virtuals: true },
  },
);

courseSchema.virtual("pengajar", {
  ref: "Pegawai",
  localField: "educator", 
  foreignField: "nip", 
  justOne: false,
});

// Model dikompilasi PALING AKHIR, setelah virtual terpasang
const Course = mongoose.model("Course", courseSchema);
export default Course;
