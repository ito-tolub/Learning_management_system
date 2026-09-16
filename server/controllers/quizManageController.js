import mongoose from "mongoose";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";

const MEETINGS = [3, 4, 5, 6, 7];
const JUMLAH_SOAL = 10;

/** Validasi bentuk soal sebelum disimpan. */
const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length !== JUMLAH_SOAL) {
    return `Setiap kuis harus memiliki tepat ${JUMLAH_SOAL} soal`;
  }

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const nomor = i + 1;

    if (!q?.question?.trim()) {
      return `Soal nomor ${nomor} belum diisi`;
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return `Soal nomor ${nomor} harus memiliki tepat 4 pilihan jawaban`;
    }

    if (q.options.some((opt) => !String(opt || "").trim())) {
      return `Semua pilihan jawaban pada soal nomor ${nomor} harus diisi`;
    }

    const jawaban = Number(q.correctAnswer);

    if (!Number.isInteger(jawaban) || jawaban < 0 || jawaban > 3) {
      return `Kunci jawaban soal nomor ${nomor} belum dipilih`;
    }
  }

  return null;
};

/**
 * GET /api/educator/quizzes?courseId=...
 * Daftar kuis per mata kuliah, lengkap dengan jumlah pengerjaan.
 */
export const listQuizzes = async (req, res) => {
  try {
    const { courseId } = req.query;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.json({ success: false, message: "courseId tidak valid" });
    }

    const quizzes = await Quiz.find({ courseId })
      .sort({ pertemuan: 1, createdAt: 1 })
      .lean();

    const counts = await QuizAttempt.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
      { $group: { _id: "$quizId", jumlah: { $sum: 1 } } },
    ]);

    const countByQuizId = new Map(
      counts.map((c) => [String(c._id), c.jumlah]),
    );

    return res.json({
      success: true,
      quizzes: quizzes.map((q) => ({
        _id: q._id,
        pertemuan: q.pertemuan,
        title: q.title,
        duration: q.duration,
        isPublished: q.isPublished,
        jumlahSoal: q.questions?.length || 0,
        jumlahPengerjaan: countByQuizId.get(String(q._id)) || 0,
        updatedAt: q.updatedAt,
      })),
    });
  } catch (error) {
    console.error("listQuizzes error:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * GET /api/educator/quizzes/:quizId
 * Isi lengkap kuis, TERMASUK kunci jawaban (khusus dosen).
 */
export const getQuizDetail = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!mongoose.isValidObjectId(quizId)) {
      return res.json({ success: false, message: "quizId tidak valid" });
    }

    const quiz = await Quiz.findById(quizId).lean();

    if (!quiz) {
      return res.json({ success: false, message: "Kuis tidak ditemukan" });
    }

    const jumlahPengerjaan = await QuizAttempt.countDocuments({ quizId });

    return res.json({ success: true, quiz, jumlahPengerjaan });
  } catch (error) {
    console.error("getQuizDetail error:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * POST /api/educator/quizzes
 * body: { courseId, pertemuan, title, duration, questions, isPublished }
 */
export const createQuiz = async (req, res) => {
  try {
    const { courseId, pertemuan, title, duration, questions, isPublished } =
      req.body;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.json({ success: false, message: "courseId tidak valid" });
    }

    if (!MEETINGS.includes(Number(pertemuan))) {
      return res.json({
        success: false,
        message: `Pertemuan harus salah satu dari ${MEETINGS.join(", ")}`,
      });
    }

    if (!title?.trim()) {
      return res.json({ success: false, message: "Judul kuis wajib diisi" });
    }

    const pesanSalah = validateQuestions(questions);

    if (pesanSalah) {
      return res.json({ success: false, message: pesanSalah });
    }

    // Satu pertemuan hanya boleh memiliki satu kuis (indeks unik pada model)
    const sudahAda = await Quiz.findOne({
      courseId,
      pertemuan: Number(pertemuan),
    }).lean();

    if (sudahAda) {
      return res.json({
        success: false,
        message: `Pertemuan ${pertemuan} sudah memiliki kuis. Ubah kuis yang ada atau hapus terlebih dahulu.`,
      });
    }

    const quiz = await Quiz.create({
      courseId,
      pertemuan: Number(pertemuan),
      title: title.trim(),
      duration: Number(duration) || 15,
      questions,
      isPublished: isPublished !== false,
    });

    return res.json({
      success: true,
      message: "Kuis berhasil dibuat",
      quizId: quiz._id,
    });
  } catch (error) {
    console.error("createQuiz error:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/educator/quizzes/:quizId
 *
 * Kuis yang SUDAH dikerjakan praja tidak boleh diubah isi soalnya,
 * karena akan membuat jawaban tersimpan tidak lagi sesuai dengan soal.
 * Judul, durasi, dan status publikasi tetap boleh diubah.
 */
export const updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { title, duration, questions, isPublished } = req.body;

    if (!mongoose.isValidObjectId(quizId)) {
      return res.json({ success: false, message: "quizId tidak valid" });
    }

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.json({ success: false, message: "Kuis tidak ditemukan" });
    }

    const jumlahPengerjaan = await QuizAttempt.countDocuments({ quizId });

    if (questions) {
      if (jumlahPengerjaan > 0) {
        return res.json({
          success: false,
          message: `Soal tidak dapat diubah karena kuis sudah dikerjakan ${jumlahPengerjaan} praja. Buat kuis baru bila perlu perubahan soal.`,
        });
      }

      const pesanSalah = validateQuestions(questions);

      if (pesanSalah) {
        return res.json({ success: false, message: pesanSalah });
      }

      quiz.questions = questions;
    }

    if (title?.trim()) quiz.title = title.trim();
    if (duration !== undefined) quiz.duration = Number(duration) || 15;
    if (isPublished !== undefined) quiz.isPublished = Boolean(isPublished);

    await quiz.save();

    return res.json({ success: true, message: "Kuis berhasil diperbarui" });
  } catch (error) {
    console.error("updateQuiz error:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/educator/quizzes/:quizId
 * Ditolak bila sudah ada praja yang mengerjakan.
 */
export const deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!mongoose.isValidObjectId(quizId)) {
      return res.json({ success: false, message: "quizId tidak valid" });
    }

    const jumlahPengerjaan = await QuizAttempt.countDocuments({ quizId });

    if (jumlahPengerjaan > 0) {
      return res.json({
        success: false,
        message: `Kuis tidak dapat dihapus karena sudah dikerjakan ${jumlahPengerjaan} praja. Nonaktifkan saja melalui tombol publikasi.`,
      });
    }

    const hasil = await Quiz.findByIdAndDelete(quizId);

    if (!hasil) {
      return res.json({ success: false, message: "Kuis tidak ditemukan" });
    }

    return res.json({ success: true, message: "Kuis berhasil dihapus" });
  } catch (error) {
    console.error("deleteQuiz error:", error);
    return res.json({ success: false, message: error.message });
  }
};
