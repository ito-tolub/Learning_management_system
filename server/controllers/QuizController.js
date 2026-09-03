import { getAuth } from "@clerk/express";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { CourseProgress } from "../models/CourseProgress.js";

// ======================================================
// HELPER: CEK PRASYARAT KUIS
// ======================================================

const checkQuizPrerequisites = async ({ quiz, userId }) => {
  const course = await Course.findById(quiz.courseId).lean();

  if (!course) {
    return {
      unlocked: false,
      reasons: ["Mata kuliah tidak ditemukan"],
    };
  }

  // Cari pertemuan sesuai nomor kuis
  const chapter = (course.courseContent || []).find(
    (item) =>
      Number(item.chapterOrder) === Number(quiz.pertemuan),
  );

  if (!chapter) {
    return {
      unlocked: false,
      reasons: ["Pertemuan tidak ditemukan"],
    };
  }

  // ================================
  // PROGRESS PRAJA
  // ================================

  const progress = await CourseProgress.findOne({
    userId,
    courseId: String(quiz.courseId),
  }).lean();

  const completedSet = new Set(
    (progress?.lectureCompleted || []).map(String),
  );

  // ================================
  // MATERI UTAMA
  // ================================

  const mainIds = [
    ...new Set(
      (chapter.mainLectureIds || []).map(String),
    ),
  ];

  const completedMain = mainIds.filter((id) =>
    completedSet.has(id),
  );

  const mainCompleted =
    mainIds.length > 0 &&
    completedMain.length === mainIds.length;

  // ================================
  // MATERI NON-UTAMA
  // ================================

  const mainSet = new Set(mainIds);

  const nonMainIds = [
    ...new Set(
      (chapter.chapterContent || [])
        .filter(
          (lecture) =>
            lecture?.lectureId &&
            !mainSet.has(
              String(lecture.lectureId),
            ),
        )
        .map((lecture) =>
          String(lecture.lectureId),
        ),
    ),
  ];

  const completedNonMain = nonMainIds.filter(
  (id) => completedSet.has(id),
);

const MIN_NON_MAIN_REQUIRED = 6;

const nonMainCompleted =
  completedNonMain.length >= MIN_NON_MAIN_REQUIRED;

  // ================================
  // KUIS SEBELUMNYA
  // ================================

  let previousQuizCompleted = true;
  let previousQuiz = null;

  // Kuis dimulai dari pertemuan 3.
  // Pertemuan 3 tidak membutuhkan kuis sebelumnya.
  if (Number(quiz.pertemuan) > 3) {
    previousQuiz = await Quiz.findOne({
      courseId: quiz.courseId,
      pertemuan:
        Number(quiz.pertemuan) - 1,
      isPublished: true,
    }).lean();

    if (!previousQuiz) {
      previousQuizCompleted = false;
    } else {
      const previousAttempt =
        await QuizAttempt.findOne({
          quizId: previousQuiz._id,
          userId,
        }).lean();

      previousQuizCompleted =
        Boolean(previousAttempt);
    }
  }

  // ================================
  // ALASAN KUIS TERKUNCI
  // ================================

  const reasons = [];

  if (!mainCompleted) {
    reasons.push(
      `Selesaikan seluruh objek pembelajaran utama (${completedMain.length}/${mainIds.length})`,
    );
  }

  if (!nonMainCompleted) {
    reasons.push(
      `Selesaikan minimal ${MIN_NON_MAIN_REQUIRED} objek pembelajaran non-utama (${completedNonMain.length}/${MIN_NON_MAIN_REQUIRED})`,
    );
  }

  if (!previousQuizCompleted) {
    reasons.push(
      `Kerjakan terlebih dahulu Kuis Pertemuan ${
        Number(quiz.pertemuan) - 1
      }`,
    );
  }

  return {
    unlocked:
      mainCompleted &&
      nonMainCompleted &&
      previousQuizCompleted,

    reasons,

    progress: {
      main: {
        completed: completedMain.length,
        required: mainIds.length,
      },

      nonMain: {
        completed:
          completedNonMain.length,
        required: 1,
      },

      previousQuiz: {
        required:
          Number(quiz.pertemuan) > 3,
        completed:
          previousQuizCompleted,
      },
    },
  };
};

// ======================================================
// GET DAFTAR KUIS BERDASARKAN COURSE
// ======================================================

export const getCourseQuizzes = async (
  req,
  res,
) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const quizzes = await Quiz.find({
      courseId: req.params.courseId,
      isPublished: true,
    })
      .sort({ pertemuan: 1 })
      .lean();

    // Ambil kuis yang sudah pernah
    // dikerjakan praja
    const attempts = await QuizAttempt.find({
      courseId: req.params.courseId,
      userId,
    }).lean();

    const attemptMap = new Map(
      attempts.map((attempt) => [
        String(attempt.quizId),
        attempt,
      ]),
    );

    // Cek prerequisite setiap kuis
    const data = await Promise.all(
      quizzes.map(async (quiz) => {
        const attempt = attemptMap.get(
          String(quiz._id),
        );

        const prerequisite =
          await checkQuizPrerequisites({
            quiz,
            userId,
          });

        return {
          _id: quiz._id,
          title: quiz.title,
          pertemuan: quiz.pertemuan,
          duration: quiz.duration,

          questionCount:
            quiz.questions?.length || 0,

          completed: !!attempt,

          score:
            attempt?.score ?? null,

          locked:
            !attempt &&
            !prerequisite.unlocked,

          prerequisite,
        };
      }),
    );

    return res.json({
      success: true,
      quizzes: data,
    });
  } catch (error) {
    console.error(
      "Get Course Quizzes Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Gagal mengambil daftar kuis",
    });
  }
};

// ======================================================
// GET DETAIL KUIS
// ======================================================

export const getQuiz = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const quiz = await Quiz.findById(
      req.params.quizId,
    ).lean();

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Kuis tidak ditemukan",
      });
    }

    if (!quiz.isPublished) {
      return res.status(403).json({
        success: false,
        message: "Kuis belum tersedia",
      });
    }

    // ================================
    // CEK APAKAH SUDAH DIKERJAKAN
    // ================================

    const existingAttempt =
      await QuizAttempt.findOne({
        quizId: quiz._id,
        userId,
      }).lean();

    if (existingAttempt) {
      return res.status(400).json({
        success: false,
        message:
          "Kuis ini sudah pernah dikerjakan",
        result: {
          score:
            existingAttempt.score,
          correctCount:
            existingAttempt.correctCount,
          wrongCount:
            existingAttempt.wrongCount,
        },
      });
    }

    // ================================
    // CEK PRASYARAT KUIS
    // ================================

    const prerequisite =
      await checkQuizPrerequisites({
        quiz,
        userId,
      });

    if (!prerequisite.unlocked) {
      return res.status(403).json({
        success: false,
        code:
          "QUIZ_PREREQUISITE_NOT_MET",
        message:
          "Prasyarat kuis belum terpenuhi",
        prerequisite,
      });
    }

    // Jangan kirim correctAnswer
    // ke frontend
    const questions = quiz.questions.map(
      (question, index) => ({
        number: index + 1,
        question: question.question,
        options: question.options,
      }),
    );

    return res.json({
      success: true,

      quiz: {
        _id: quiz._id,
        courseId: quiz.courseId,
        title: quiz.title,
        pertemuan: quiz.pertemuan,
        duration: quiz.duration,
        questions,
      },
    });
  } catch (error) {
    console.error(
      "Get Quiz Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Gagal mengambil kuis",
    });
  }
};

// ======================================================
// SUBMIT KUIS
// ======================================================

export const submitQuiz = async (
  req,
  res,
) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Agar tidak error jika req.body undefined
    const { answers } = req.body || {};

    // ================================
    // CARI QUIZ
    // ================================

    const quiz = await Quiz.findById(
      req.params.quizId,
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Kuis tidak ditemukan",
      });
    }

    if (!quiz.isPublished) {
      return res.status(403).json({
        success: false,
        message: "Kuis belum tersedia",
      });
    }

    // ================================
    // CEK SUDAH PERNAH MENGERJAKAN
    // ================================

    const existing =
      await QuizAttempt.findOne({
        quizId: quiz._id,
        userId,
      });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "Kuis ini sudah pernah dikerjakan",
      });
    }

    // ================================
    // CEK PRASYARAT KUIS
    // ================================

    const prerequisite =
      await checkQuizPrerequisites({
        quiz,
        userId,
      });

    if (!prerequisite.unlocked) {
      return res.status(403).json({
        success: false,
        code:
          "QUIZ_PREREQUISITE_NOT_MET",
        message:
          "Prasyarat kuis belum terpenuhi",
        prerequisite,
      });
    }

    // ================================
    // VALIDASI JAWABAN
    // ================================

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message:
          "Data jawaban tidak ditemukan",
      });
    }

    if (
      answers.length !==
      quiz.questions.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Semua ${quiz.questions.length} soal harus dijawab`,
      });
    }

    // Validasi setiap jawaban.
    // Nilai harus berupa indeks 0 - 3.
    const invalidAnswer = answers.some(
      (answer) =>
        !Number.isInteger(
          Number(answer),
        ) ||
        Number(answer) < 0 ||
        Number(answer) > 3,
    );

    if (invalidAnswer) {
      return res.status(400).json({
        success: false,
        message:
          "Terdapat jawaban yang tidak valid",
      });
    }

    // ================================
    // AMBIL DATA USER
    // ================================

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Data pengguna tidak ditemukan",
      });
    }

    if (!user.npp) {
      return res.status(400).json({
        success: false,
        message:
          "NPP praja tidak ditemukan",
      });
    }

    // ================================
    // HITUNG JAWABAN BENAR
    // ================================

    let correctCount = 0;

    quiz.questions.forEach(
      (question, index) => {
        const studentAnswer =
          Number(answers[index]);

        const correctAnswer =
          Number(
            question.correctAnswer,
          );

        if (
          studentAnswer ===
          correctAnswer
        ) {
          correctCount++;
        }
      },
    );

    // ================================
    // HITUNG HASIL
    // ================================

    const totalQuestions =
      quiz.questions.length;

    const wrongCount =
      totalQuestions - correctCount;

    const score = Math.round(
      (correctCount /
        totalQuestions) *
        100,
    );

    // ================================
    // SIMPAN ATTEMPT
    // ================================

    const attempt =
      await QuizAttempt.create({
        quizId: quiz._id,
        courseId: quiz.courseId,

        userId,
        npp: user.npp,

        pertemuan:
          quiz.pertemuan,

        answers,

        correctCount,
        wrongCount,
        score,

        submittedAt:
          new Date(),
      });

    // ================================
    // RESPONSE
    // ================================

    return res.status(201).json({
      success: true,

      message:
        "Kuis berhasil dikumpulkan",

      result: {
        attemptId:
          attempt._id,

        totalQuestions,

        correctCount,

        wrongCount,

        score,
      },
    });
  } catch (error) {
    console.error(
      "Submit Quiz Error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Gagal mengumpulkan kuis",
    });
  }
};