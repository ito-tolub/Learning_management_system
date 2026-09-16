import mongoose from "mongoose";
import Course from "../models/Course.js";
import { LectureActivity } from "../models/LectureActivity.js";
import { MAIN_LECTURE_IDS_BY_CHAPTER } from "../utils/calculateFeedbackScore.js";

const TAGS = ["V", "A", "R", "K"];
const GRANULARITY = ["micro", "macro"];
const COGNITIVE = ["C1", "C2", "C3", "C4", "C5", "C6"];

/** Normalisasi & validasi vektor VARK. Mengembalikan {error} atau {value}. */
const parseVarkVector = (input) => {
  if (input === undefined || input === null) return { value: undefined };

  const hasil = {};

  for (const tag of TAGS) {
    const angka = Number(input[tag]);

    if (!Number.isFinite(angka) || angka < 0 || angka > 1) {
      return { error: `Nilai ${tag} harus berupa angka 0,00 sampai 1,00` };
    }

    hasil[tag] = Math.round(angka * 100) / 100;
  }

  return { value: hasil };
};

/** Validasi metadata umum objek pembelajaran. */
const validateMetadata = (body, { wajibLengkap = false } = {}) => {
  const patch = {};

  if (body.lectureTitle !== undefined) {
    if (!String(body.lectureTitle).trim()) {
      return { error: "Judul objek pembelajaran wajib diisi" };
    }
    patch.lectureTitle = String(body.lectureTitle).trim();
  } else if (wajibLengkap) {
    return { error: "Judul objek pembelajaran wajib diisi" };
  }

  if (body.lectureUrl !== undefined) {
    if (!String(body.lectureUrl).trim()) {
      return { error: "Tautan objek pembelajaran wajib diisi" };
    }
    patch.lectureUrl = String(body.lectureUrl).trim();
  } else if (wajibLengkap) {
    return { error: "Tautan objek pembelajaran wajib diisi" };
  }

  if (body.lectureDuration !== undefined) {
    const durasi = Number(body.lectureDuration);
    if (!Number.isFinite(durasi) || durasi <= 0) {
      return { error: "Durasi harus berupa angka lebih besar dari 0" };
    }
    patch.lectureDuration = durasi;
  } else if (wajibLengkap) {
    return { error: "Durasi wajib diisi" };
  }

  if (body.tags !== undefined) {
    if (!TAGS.includes(body.tags)) {
      return { error: `Modalitas harus salah satu dari ${TAGS.join(", ")}` };
    }
    patch.tags = body.tags;
  } else if (wajibLengkap) {
    return { error: "Modalitas wajib dipilih" };
  }

  const vark = parseVarkVector(body.varkvektor);
  if (vark.error) return { error: vark.error };
  if (vark.value !== undefined) patch.varkvektor = vark.value;
  else if (wajibLengkap) return { error: "Vektor VARK wajib diisi" };

  if (body.contentGranularity !== undefined) {
    if (
      body.contentGranularity !== null &&
      !GRANULARITY.includes(body.contentGranularity)
    ) {
      return { error: "Granularitas harus micro atau macro" };
    }
    patch.contentGranularity = body.contentGranularity;
  }

  if (body.cognitiveLevel !== undefined) {
    if (
      body.cognitiveLevel !== null &&
      !COGNITIVE.includes(body.cognitiveLevel)
    ) {
      return { error: "Tingkat kognitif harus C1 sampai C6" };
    }
    patch.cognitiveLevel = body.cognitiveLevel;
  }

  return { patch };
};

/**
 * GET /api/educator/learning-objects?courseId=...
 * Daftar objek pembelajaran per pertemuan, lengkap dengan metadata
 * dan jumlah akses.
 */
export const listLearningObjects = async (req, res) => {
  try {
    const { courseId } = req.query;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.json({ success: false, message: "courseId tidak valid" });
    }

    const course = await Course.findById(courseId).lean();

    if (!course) {
      return res.json({ success: false, message: "Mata kuliah tidak ditemukan" });
    }

    const activities = await LectureActivity.aggregate([
      { $match: { courseId: String(courseId) } },
      {
        $group: {
          _id: "$lectureId",
          totalDuration: { $sum: "$totalDuration" },
          praja: { $sum: 1 },
        },
      },
    ]);

    const statByLectureId = new Map(
      activities.map((a) => [a._id, a]),
    );

    const chapters = (course.courseContent || []).map((chapter) => {
      const mainIds = new Set(
        MAIN_LECTURE_IDS_BY_CHAPTER[chapter.chapterId] || [],
      );

      return {
        chapterId: chapter.chapterId,
        chapterOrder: chapter.chapterOrder,
        chapterTitle: chapter.chapterTitle,
        lectures: (chapter.chapterContent || []).map((lecture) => {
          const stat = statByLectureId.get(lecture.lectureId);

          return {
            lectureId: lecture.lectureId,
            lectureTitle: lecture.lectureTitle,
            lectureUrl: lecture.lectureUrl,
            lectureDuration: lecture.lectureDuration,
            lectureOrder: lecture.lectureOrder,
            tags: lecture.tags || null,
            varkvektor: lecture.varkvektor || null,
            contentGranularity: lecture.contentGranularity ?? null,
            cognitiveLevel: lecture.cognitiveLevel ?? null,
            isMain: mainIds.has(lecture.lectureId),
            totalDurationSec: stat?.totalDuration || 0,
            jumlahAkses: stat?.praja || 0,
          };
        }),
      };
    });

    return res.json({
      success: true,
      courseTitle: course.courseTitle,
      chapters,
    });
  } catch (error) {
    console.error("listLearningObjects error:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/educator/learning-objects/:courseId/:chapterId/:lectureId
 * Mengubah metadata satu objek pembelajaran.
 */
export const updateLearningObject = async (req, res) => {
  try {
    const { courseId, chapterId, lectureId } = req.params;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.json({ success: false, message: "courseId tidak valid" });
    }

    const hasil = validateMetadata(req.body);

    if (hasil.error) {
      return res.json({ success: false, message: hasil.error });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.json({ success: false, message: "Mata kuliah tidak ditemukan" });
    }

    const chapter = (course.courseContent || []).find(
      (c) => c.chapterId === chapterId,
    );

    if (!chapter) {
      return res.json({ success: false, message: "Pertemuan tidak ditemukan" });
    }

    const lecture = (chapter.chapterContent || []).find(
      (l) => l.lectureId === lectureId,
    );

    if (!lecture) {
      return res.json({
        success: false,
        message: "Objek pembelajaran tidak ditemukan",
      });
    }

    Object.assign(lecture, hasil.patch);

    // WAJIB: courseContent bertipe bebas, Mongoose tidak mendeteksi
    // perubahan di dalamnya tanpa penanda ini.
    course.markModified("courseContent");
    await course.save();

    const jumlahAkses = await LectureActivity.countDocuments({
      courseId: String(courseId),
      lectureId,
    });

    return res.json({
      success: true,
      message:
        jumlahAkses > 0
          ? `Metadata diperbarui. Perhatian: objek ini sudah diakses ${jumlahAkses} praja, sehingga perubahan memengaruhi perhitungan rekomendasi dan SES.`
          : "Metadata objek pembelajaran berhasil diperbarui",
      lecture,
    });
  } catch (error) {
    console.error("updateLearningObject error:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * POST /api/educator/learning-objects/:courseId/:chapterId
 * Menambah objek pembelajaran baru pada satu pertemuan.
 *
 * lectureId dibuat otomatis mengikuti pola "op<urutanPertemuan>.<nomor>"
 * bila tidak dikirim dari klien.
 */
export const createLearningObject = async (req, res) => {
  try {
    const { courseId, chapterId } = req.params;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.json({ success: false, message: "courseId tidak valid" });
    }

    const hasil = validateMetadata(req.body, { wajibLengkap: true });

    if (hasil.error) {
      return res.json({ success: false, message: hasil.error });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.json({ success: false, message: "Mata kuliah tidak ditemukan" });
    }

    const chapter = (course.courseContent || []).find(
      (c) => c.chapterId === chapterId,
    );

    if (!chapter) {
      return res.json({ success: false, message: "Pertemuan tidak ditemukan" });
    }

    if (!Array.isArray(chapter.chapterContent)) {
      chapter.chapterContent = [];
    }

    const nomorPertemuan =
      String(chapterId).replace(/\D/g, "") || chapter.chapterOrder || 0;

    // Cari nomor urut tertinggi yang sudah dipakai
    let tertinggi = 0;
    for (const l of chapter.chapterContent) {
      const cocok = String(l.lectureId || "").match(/\.(\d+)$/);
      if (cocok) tertinggi = Math.max(tertinggi, Number(cocok[1]));
    }

    const lectureId =
      String(req.body.lectureId || "").trim() ||
      `op${nomorPertemuan}.${tertinggi + 1}`;

    const sudahAda = chapter.chapterContent.some(
      (l) => l.lectureId === lectureId,
    );

    if (sudahAda) {
      return res.json({
        success: false,
        message: `lectureId "${lectureId}" sudah dipakai pada pertemuan ini`,
      });
    }

    const urutanTertinggi = chapter.chapterContent.reduce(
      (max, l) => Math.max(max, Number(l.lectureOrder) || 0),
      0,
    );

    const lectureBaru = {
      lectureId,
      lectureOrder: urutanTertinggi + 1,
      contentGranularity: null,
      cognitiveLevel: null,
      ...hasil.patch,
    };

    chapter.chapterContent.push(lectureBaru);

    course.markModified("courseContent");
    await course.save();

    return res.json({
      success: true,
      message: `Objek pembelajaran "${lectureId}" berhasil ditambahkan`,
      lecture: lectureBaru,
    });
  } catch (error) {
    console.error("createLearningObject error:", error);
    return res.json({ success: false, message: error.message });
  }
};
