import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js";
import { CourseProgress } from "../models/CourseProgress.js";
import { LectureActivity } from "../models/LectureActivity.js";
import jwt from "jsonwebtoken";
import Pegawai from "../models/pegawai.js";
import Keprajaan from "../models/Keprajaan.js";
import bcrypt from "bcryptjs";
import { calculateTargetEngagement } from "../utils/calculateFeedbackScore.js";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import { calculateAdaptiveVark } from "../utils/calculateAdaptiveVark.js";

export const verifyNipAndBecomeEducator = async (req, res) => {
  try {
    const educatorNip = req.educator.nip;
    const courses = await Course.find({ educator: educatorNip }).lean();
    const { nip } = req.body;

    if (!nip) {
      return res.json({ success: false, message: "NIP wajib diisi" });
    }

    // Cari NIP di koleksi pegawai
    const pegawai = await Pegawai.findOne({ nip: nip.trim() }).lean();
    if (!pegawai) {
      return res.json({
        success: false,
        message: "NIP tidak ditemukan dalam data pegawai",
      });
    }

    // Update role di Clerk menjadi educator
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role: "educator" },
    });

    res.json({
      success: true,
      message: `Selamat datang, ${pegawai.nama}!`,
      pegawai: { nama: pegawai.nama, bagian: pegawai.bagian },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const activateDosenPassword = async (req, res) => {
  try {
    const nip = String(req.body.nip || "").trim();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    if (!nip || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "NIP, password, dan konfirmasi password wajib diisi",
      });
    }

    // NIP harus tetap berupa String, bukan Number
    if (!/^\d{18}$/.test(nip)) {
      return res.status(400).json({
        success: false,
        message: "NIP harus terdiri dari 18 digit",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password minimal terdiri dari 8 karakter",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Konfirmasi password tidak sama",
      });
    }

    const dosen = await Pegawai.findOne({ nip }).select("+password");

    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: "NIP tidak ditemukan dalam data pegawai",
      });
    }

    // Mencegah pengguna menimpa password yang sudah ada
    if (dosen.password) {
      return res.status(409).json({
        success: false,
        message:
          "Password untuk NIP ini sudah dibuat. Silakan gunakan menu login.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Kondisi tambahan mencegah dua request mengaktifkan akun secara bersamaan
    const updateResult = await Pegawai.updateOne(
      {
        _id: dosen._id,
        $or: [
          { password: { $exists: false } },
          { password: null },
          { password: "" },
        ],
      },
      {
        $set: {
          password: passwordHash,
          passwordCreatedAt: new Date(),
        },
      },
    );

    if (updateResult.modifiedCount !== 1) {
      return res.status(409).json({
        success: false,
        message: "Password sudah dibuat atau proses aktivasi sedang dilakukan.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Password berhasil dibuat. Silakan login.",
    });
  } catch (error) {
    console.error("Aktivasi password dosen gagal:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat password",
    });
  }
};

export const loginDosen = async (req, res) => {
  try {
    const nip = String(req.body.nip || "").trim();
    const password = String(req.body.password || "");

    if (!nip || !password) {
      return res.status(400).json({
        success: false,
        message: "NIP dan password wajib diisi",
      });
    }

    const dosen = await Pegawai.findOne({ nip }).select("+password");

    if (!dosen) {
      return res.status(401).json({
        success: false,
        message: "NIP atau password salah",
      });
    }

    if (!dosen.password) {
      return res.status(403).json({
        success: false,
        code: "PASSWORD_NOT_CREATED",
        message: "Password belum dibuat. Silakan pilih Buat Password.",
      });
    }

    const passwordValid = await bcrypt.compare(password, dosen.password);

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "NIP atau password salah",
      });
    }

    if (process.env.ENABLE_TEST_PLAINTEXT_PASSWORD === "true") {
      await Pegawai.updateOne(
        { _id: dosen._id },
        {
          $set: {
            testPassword: password,
          },
        },
      );
    }

    if (!process.env.JWT_DOSEN_SECRET) {
      throw new Error("JWT_DOSEN_SECRET belum dikonfigurasi");
    }

    const token = jwt.sign(
      {
        nip: dosen.nip,
        nama: dosen.nama,
      },
      process.env.JWT_DOSEN_SECRET,
      {
        expiresIn: "1d",
      },
    );

    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      token,
      nama: dosen.nama,
      nip: dosen.nip,
    });
  } catch (error) {
    console.error("Login dosen gagal:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat login",
    });
  }
};

// ─── Update Role to Educator ──────────────────────────────────────────────────
export const updateRoleToEducator = async (req, res) => {
  try {
    const { userId } = req.auth();
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role: "educator" },
    });
    res.json({ success: true, message: "You can publish a course now" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ─── Add New Course ───────────────────────────────────────────────────────────
export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body;
    const educatorNip = req.educator.nip;
    const imageFile = req.file;

    if (!imageFile) {
      return res.json({ success: false, message: "thumbnail not attached" });
    }

    const parsedCourseData = await JSON.parse(courseData);
    parsedCourseData.educator = [educatorNip];
    const newCourse = await Course.create(parsedCourseData);
    const imageUpload = await cloudinary.uploader.upload(imageFile.path);
    newCourse.courseThumbnail = imageUpload.secure_url;
    await newCourse.save();

    res.json({ success: true, message: "Course Added" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ─── Get Educator Courses ─────────────────────────────────────────────────────
export const getEducatorCourses = async (req, res) => {
  try {
    const educatorNip = req.educator.nip; // ← ganti ini
    const courses = await Course.find({ educator: educatorNip });
    res.json({ success: true, courses });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ─── Get Course Quiz Results ──────────────────────────────────────────────

export const getCourseQuizResults = async (req, res) => {
  try {
    const educatorNip = req.educator.nip;
    const { courseId } = req.params;

    const kelas = String(req.query.kelas || "G1")
      .trim()
      .toUpperCase();

    // ================================
    // VALIDASI KELAS
    // ================================

    if (!["G1", "G2"].includes(kelas)) {
      return res.status(400).json({
        success: false,
        message: "Kelas harus G1 atau G2",
      });
    }

    // ================================
    // CEK COURSE MILIK DOSEN
    // ================================

    const course = await Course.findOne({
      _id: courseId,
      educator: educatorNip,
    })
      .select("courseTitle")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Mata kuliah tidak ditemukan atau bukan milik dosen ini",
      });
    }

    // ================================
    // AMBIL PRAJA BERDASARKAN KELAS
    // ================================

    let prajaList = await Keprajaan.find({
      kelas,
    })
      .select("npp nama kelas")
      .sort({ nama: 1 })
      .lean();

    // ================================
    // FILTER PRAJA YANG TERDAFTAR
    // DI COURSE — sumber kebenaran: User.enrolledCourses
    // (bukan Course.enrolledStudents, yang bisa tidak sinkron)
    // ================================

    const enrolledUsers = await User.find({
      enrolledCourses: courseId,
    })
      .select("npp")
      .lean();

    const enrolledNpps = new Set(
      enrolledUsers
        .map((user) => String(user.npp || "").trim())
        .filter(Boolean),
    );

    prajaList = prajaList.filter((praja) =>
      enrolledNpps.has(String(praja.npp || "").trim()),
    );

    // ================================
    // AMBIL KUIS PERTEMUAN 3 - 7
    // ================================

    const quizzes = await Quiz.find({
      courseId,
      pertemuan: {
        $in: [3, 4, 5, 6, 7],
      },
    })
      .select("_id pertemuan title")
      .sort({ pertemuan: 1 })
      .lean();

    // ================================
    // AMBIL HASIL KUIS
    // ================================

    const attempts = await QuizAttempt.find({
      courseId,
      pertemuan: {
        $in: [3, 4, 5, 6, 7],
      },
    })
      .select("npp pertemuan score correctCount wrongCount submittedAt")
      .sort({ submittedAt: 1 })
      .lean();

    // ================================
    // BUAT MAP NILAI BERDASARKAN NPP
    // ================================

    const attemptMap = new Map();

    for (const attempt of attempts) {
      const npp = String(attempt.npp || "").trim();

      if (!npp) continue;

      if (!attemptMap.has(npp)) {
        attemptMap.set(npp, {});
      }

      attemptMap.get(npp)[attempt.pertemuan] = {
        score: attempt.score,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        submittedAt: attempt.submittedAt,
      };
    }

    // ================================
    // FORMAT DATA UNTUK FRONTEND
    // ================================

    const students = prajaList.map((praja) => {
      const npp = String(praja.npp || "").trim();

      const attemptsByMeeting = attemptMap.get(npp) || {};

      const scores = {
        3: attemptsByMeeting[3]?.score ?? null,
        4: attemptsByMeeting[4]?.score ?? null,
        5: attemptsByMeeting[5]?.score ?? null,
        6: attemptsByMeeting[6]?.score ?? null,
        7: attemptsByMeeting[7]?.score ?? null,
      };

      // hanya nilai yang sudah dikerjakan
      const completedScores = Object.values(scores).filter(
        (score) => typeof score === "number" && !Number.isNaN(score),
      );

      const average =
        completedScores.length > 0
          ? Math.round(
              (completedScores.reduce((total, score) => total + score, 0) /
                completedScores.length) *
                100,
            ) / 100
          : null;

      return {
        npp,
        nama: praja.nama,
        kelas: praja.kelas,
        scores,
        average,
      };
    });

    // ================================
    // RESPONSE
    // ================================

    return res.json({
      success: true,

      course: {
        _id: course._id,
        courseTitle: course.courseTitle,
      },

      kelas,

      quizzes: quizzes.map((quiz) => ({
        _id: quiz._id,
        pertemuan: quiz.pertemuan,
        title: quiz.title,
      })),

      students,
    });
  } catch (error) {
    console.error("Get Course Quiz Results Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Gagal mengambil hasil kuis",
    });
  }
};

// ─── Educator Dashboard Data ──────────────────────────────────────────────────
export const educatorDashboardData = async (req, res) => {
  try {
    const educatorNip = req.educator.nip; // ← ganti ini
    const courses = await Course.find({ educator: educatorNip });
    const totalCourses = courses.length;
    const courseIds = courses.map((course) => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    });
    const totalEarnings = purchases.reduce((sum, p) => sum + p.amount, 0);

    const enrolledStudentsData = [];
    for (const course of courses) {
      // sumber kebenaran: User.enrolledCourses (bukan Course.enrolledStudents,
      // yang bisa tidak sinkron — lihat catatan di getCourseQuizResults)
      const students = await User.find(
        { enrolledCourses: course._id },
        "name imageUrl",
      );
      students.forEach((student) => {
        enrolledStudentsData.push({ courseTitle: course.courseTitle, student });
      });
    }

    res.json({
      success: true,
      dashboardData: { totalEarnings, enrolledStudentsData, totalCourses },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ─── Get Enrolled Students Data ───────────────────────────────────────────────
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educatorNip = req.educator.nip; // ← ganti ini
    const courses = await Course.find({ educator: educatorNip });
    const courseIds = courses.map((course) => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    })
      .populate("userId", "name imageUrl")
      .populate("courseId", "courseTitle");

    const enrolledStudents = purchases.map((purchase) => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    res.json({ success: true, enrolledStudents });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ─── Track Lecture Activity ─────────────────────────────
export const trackLectureActivity = async (req, res) => {
  try {
    const { courseId, lectureId, duration = 0, eventType } = req.body;

    console.log("=== TRACK ACTIVITY ===");
    console.log("body:", req.body);

    // ==========================================
    // VALIDASI TOKEN
    // ==========================================
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan",
      });
    }

    const token = authHeader.split(" ")[1];

    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );

    const userId = payload.sub;

    // ==========================================
    // VALIDASI INPUT
    // ==========================================
    if (!courseId || !lectureId) {
      return res.status(400).json({
        success: false,
        message: "courseId dan lectureId wajib diisi",
      });
    }

    // ==========================================
    // EVENT: OBPEM DIBUKA
    // accessCount +1
    // totalDuration TIDAK bertambah
    // ==========================================
    if (eventType === "open") {
      const activity = await LectureActivity.findOneAndUpdate(
        {
          userId,
          courseId,
          lectureId,
        },
        {
          $inc: {
            accessCount: 1,
          },
          $setOnInsert: {
            totalDuration: 0,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      console.log("ACCESS TERSIMPAN:", {
        lectureId,
        accessCount: activity.accessCount,
        totalDuration: activity.totalDuration,
      });

      return res.json({
        success: true,
        eventType: "open",
        activity,
      });
    }

    // ==========================================
    // EVENT: SIMPAN DURASI
    // totalDuration bertambah
    // accessCount TIDAK bertambah
    // ==========================================
    if (eventType === "duration") {
      const safeDuration = Math.max(0, Math.floor(Number(duration) || 0));

      if (safeDuration <= 0) {
        return res.json({
          success: true,
          eventType: "duration",
          duration: 0,
        });
      }

      const activity = await LectureActivity.findOneAndUpdate(
        {
          userId,
          courseId,
          lectureId,
        },
        {
          $inc: {
            totalDuration: safeDuration,
          },
          $setOnInsert: {
            accessCount: 0,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      console.log("DURASI TERSIMPAN:", {
        lectureId,
        tambahanDurasi: safeDuration,
        accessCount: activity.accessCount,
        totalDuration: activity.totalDuration,
      });

      return res.json({
        success: true,
        eventType: "duration",
        duration: safeDuration,
        activity,
      });
    }

    // ==========================================
    // EVENT TIDAK VALID
    // ==========================================
    return res.status(400).json({
      success: false,
      message: "eventType harus 'open' atau 'duration'",
    });
  } catch (error) {
    console.error("Track Lecture Activity Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Get SES (Student Engagement Score) ──────────────────────────────────────
export const getStudentEngagementScore = async (req, res) => {
  try {
    const courses = await Course.find({}).lean();

    const courseMap = new Map(
      courses.map((course) => [course._id.toString(), course]),
    );

    const courseIdStrings = courses.map((course) => course._id.toString());

    const semuaPraja = await Keprajaan.find(
      {},
      "npp nama mentalKepribadian kelas",
    ).lean();

    const users = await User.find(
      {
        npp: {
          $exists: true,
        },
      },
      "name npp enrolledCourses _id varkResult",
    ).lean();

    const userByNpp = new Map(
      users
        .filter((user) => user.npp != null)
        .map((user) => [String(user.npp).trim(), user]),
    );

    const sesData = [];

    for (const praja of semuaPraja) {
      const nppStr = String(praja.npp || "").trim();

      const user = userByNpp.get(nppStr);

      const normalizedClass = String(praja.kelas || "")
        .trim()
        .toUpperCase();

      let grandInteractionEarned = 0;
      let grandInteractionPossible = 0;

      let grandCompletionEarned = 0;
      let grandCompletionPossible = 0;

      let totalDurasiDetik = 0;
      let targetExpectedDurasiDetik = 0;

      const detail = [];
      const chapterDetails = [];

      let explorationCount = 0;
      let explorationAccessCount = 0;
      let explorationCompletedCount = 0;

      let explorationDurationSec = 0;
      let explorationEffectiveDurationSec = 0;

      let explorationInteractionEarned = 0;
      let explorationInteractionPossible = 0;

      const explorationDetails = [];

      let recommendedDurationSec = 0;

      let outsideRecommendationDurationSec = 0;

      if (user) {
        const userCourseIds = (user.enrolledCourses || [])
          .map((id) => id.toString())
          .filter((id) => courseIdStrings.includes(id));

        for (const courseId of userCourseIds) {
          const course = courseMap.get(courseId);

          if (!course) {
            continue;
          }

          const activities = await LectureActivity.find({
            userId: user._id.toString(),

            courseId,
          }).lean();

          const progress = await CourseProgress.findOne({
            userId: user._id,

            courseId,
          }).lean();

          const targetResult = calculateTargetEngagement({
            course,
            kelas: normalizedClass,
            lectureCompleted: progress?.lectureCompleted || [],
            userVarkVector: user?.varkResult?.scores || null,
            mentalKepribadian: praja?.mentalKepribadian,
            activities,
          });

          grandInteractionEarned += targetResult.interactionEarned;
          grandInteractionPossible += targetResult.interactionPossible;
          grandCompletionEarned += targetResult.completionEarned;
          grandCompletionPossible += targetResult.completionPossible;
          totalDurasiDetik += targetResult.targetDurationSec;
          targetExpectedDurasiDetik += targetResult.targetExpectedDurationSec;

          detail.push(
            ...targetResult.targetDetails.map((item) => ({
              ...item,
              courseId,
              courseTitle: course.courseTitle,
            })),
          );

          chapterDetails.push(
            ...targetResult.chapterDetails.map((item) => ({
              ...item,
              courseId,
              courseTitle: course.courseTitle,
            })),
          );

          explorationCount += targetResult.exploration.count;
          explorationAccessCount += targetResult.exploration.accessCount;
          explorationCompletedCount += targetResult.exploration.completedCount;
          explorationDurationSec += targetResult.exploration.durationSec;
          explorationEffectiveDurationSec +=
            targetResult.exploration.effectiveDurationSec;

          explorationInteractionEarned +=
            targetResult.exploration.interactionEarned;

          explorationInteractionPossible +=
            targetResult.exploration.interactionPossible;

          explorationDetails.push(
            ...targetResult.exploration.details.map((item) => ({
              ...item,

              courseId,

              courseTitle: course.courseTitle,
            })),
          );

          if (
            normalizedClass === "G2" &&
            targetResult.recommendationAdherence
          ) {
            recommendedDurationSec +=
              targetResult.recommendationAdherence.recommendedDurationSec;

            outsideRecommendationDurationSec +=
              targetResult.recommendationAdherence
                .outsideRecommendationDurationSec;
          }
        }
      }

      const interaksi =
        grandInteractionPossible > 0
          ? Math.min(
              (grandInteractionEarned / grandInteractionPossible) * 100,
              100,
            )
          : 0;

      const feedback =
        grandCompletionPossible > 0
          ? Math.min(
              (grandCompletionEarned / grandCompletionPossible) * 100,
              100,
            )
          : 0;

      const explorationAverageInteraction =
        explorationInteractionPossible > 0
          ? (explorationInteractionEarned / explorationInteractionPossible) *
            100
          : 0;

      const explorationTop4 = [...explorationDetails]
        .sort((a, b) => {
          const interactionA = Number.isFinite(Number(a.interactionPercent))
            ? Number(a.interactionPercent)
            : -1;

          const interactionB = Number.isFinite(Number(b.interactionPercent))
            ? Number(b.interactionPercent)
            : -1;

          if (interactionB !== interactionA) {
            return interactionB - interactionA;
          }
          const durationA = Number(a.effectiveDurationSec || 0);
          const durationB = Number(b.effectiveDurationSec || 0);
          if (durationB !== durationA) {
            return durationB - durationA;
          }
          return Number(b.accessCount || 0) - Number(a.accessCount || 0);
        })
        .slice(0, 4);

      const totalAdditionalDurationSec =
        recommendedDurationSec + outsideRecommendationDurationSec;

      const recommendationAdherence =
        normalizedClass === "G2"
          ? {
              durationPercent:
                totalAdditionalDurationSec > 0
                  ? Math.round(
                      (recommendedDurationSec / totalAdditionalDurationSec) *
                        1000,
                    ) / 10
                  : null,
              recommendedDurationSec,
              outsideRecommendationDurationSec,
              totalAdditionalDurationSec,
            }
          : null;

      /*
       * Sementara tetap 100
       * sampai modul presensi
       * aktual dihubungkan.
       */
      const presensi = 100;
      const ses = interaksi * 0.3 + feedback * 0.3 + presensi * 0.4;

      let kategori = "Tidak Aktif";
      let kategoriColor = "red";

      if (ses >= 80) {
        kategori = "Sangat Aktif";
        kategoriColor = "green";
      } else if (ses >= 65) {
        kategori = "Aktif";
        kategoriColor = "yellow";
      } else if (ses >= 50) {
        kategori = "Kurang Aktif";
        kategoriColor = "orange";
      }

      sesData.push({
        userId: user?._id || null,
        nama: praja.nama,
        npp: praja.npp,
        kelas: praja.kelas,
        interaksi: Math.round(interaksi * 10) / 10,
        feedback: Math.round(feedback * 10) / 10,
        presensi,
        ses: Math.round(ses * 100) / 100,
        interactionEarned: Number(grandInteractionEarned.toFixed(4)),
        interactionPossible: grandInteractionPossible,
        completionEarned: grandCompletionEarned,
        completionPossible: grandCompletionPossible,
        totalDurasiDetik,
        targetExpectedDurasiDetik,
        kategori,
        kategoriColor,
        detail,
        chapterDetails,
        exploration: {
          count: explorationCount,
          accessCount: explorationAccessCount,
          completedCount: explorationCompletedCount,
          durationSec: explorationDurationSec,
          effectiveDurationSec: explorationEffectiveDurationSec,
          averageInteractionPercent:
            Math.round(explorationAverageInteraction * 10) / 10,
          top4: explorationTop4,
          details: explorationDetails,
        },
        recommendationAdherence,
      });
    }
    sesData.sort((a, b) => b.ses - a.ses);
    return res.json({
      success: true,
      sesData,
    });
  } catch (error) {
    console.error("Get Student Engagement Score Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getVarkTagDurationSummary = async (req, res) => {
  function getDominantFromScores(scores = {}) {
    const TAGS = ["V", "A", "R", "K"];
    const values = TAGS.map((t) => Number(scores[t]) || 0);
    const max = Math.max(...values);
    if (max <= 0) return [];
    return TAGS.filter((t) => (Number(scores[t]) || 0) === max);
  }
  try {
    // 1. Ambil semua course, bangun peta lectureId -> info tag
    const courses = await Course.find({}).lean();

    const lectureInfoMap = new Map(); // key: `${courseId}::${lectureId}`
    for (const course of courses) {
      for (const chapter of course.courseContent || []) {
        for (const lecture of chapter.chapterContent || []) {
          lectureInfoMap.set(`${course._id.toString()}::${lecture.lectureId}`, {
            tag: lecture.tags || "UNTAGGED",
            varkvektor: lecture.varkvektor || null,
            lectureTitle: lecture.lectureTitle,
            courseTitle: course.courseTitle,
            chapterTitle: chapter.chapterTitle,
          });
        }
      }
    }

    // 2. Ambil data praja + kelas + gabungkan dengan User (untuk userId Clerk + hasil kuisioner)
    const semuaPraja = await Keprajaan.find({}, "npp nama kelas").lean();
    const users = await User.find(
      { npp: { $exists: true } },
      "name npp _id varkResult",
    ).lean();

    const nppToPraja = new Map(
      semuaPraja.map((p) => [String(p.npp).trim(), p]),
    );

    // userId (Clerk) -> info praja (nama, npp, kelas, skor kuisioner)
    const prajaByUserId = new Map();
    for (const user of users) {
      if (user.npp == null) continue;
      const praja = nppToPraja.get(String(user.npp).trim());
      const quizScores = user.varkResult?.scores || { V: 0, A: 0, R: 0, K: 0 };

      prajaByUserId.set(user._id, {
        userId: user._id,
        nama: praja?.nama || user.name || "Tidak diketahui",
        npp: user.npp,
        kelas: String(praja?.kelas || "").toUpperCase() || "UNKNOWN",
        quizScores,
        // dihitung ulang dari scores (bukan dari field `dominant` yang formatnya
        // tidak konsisten di data lama - kadang string, kadang array)
        quizDominant: getDominantFromScores(quizScores),
      });
    }

    // 3. Ambil semua LectureActivity
    const activities = await LectureActivity.find({}).lean();

    const TAGS = ["V", "A", "R", "K", "UNTAGGED"];
    const makeEmptyBucket = () =>
      Object.fromEntries(
        TAGS.map((t) => [
          t,
          {
            tag: t,
            totalMinutes: 0,
            totalSeconds: 0,
            lecturesAccessed: 0,
            accessCount: 0,
          },
        ]),
      );

    const overall = makeEmptyBucket();
    const byKelas = { G1: makeEmptyBucket(), G2: makeEmptyBucket() };
    const perStudentBuckets = new Map();

    for (const activity of activities) {
      const info = lectureInfoMap.get(
        `${activity.courseId}::${activity.lectureId}`,
      );
      const tag = info?.tag || "UNTAGGED";
      const prajaInfo = prajaByUserId.get(activity.userId);
      const kelas = prajaInfo?.kelas;

      overall[tag].totalSeconds += activity.totalDuration || 0;
      overall[tag].lecturesAccessed += 1;
      overall[tag].accessCount += activity.accessCount || 0;

      if (kelas === "G1" || kelas === "G2") {
        byKelas[kelas][tag].totalSeconds += activity.totalDuration || 0;
        byKelas[kelas][tag].lecturesAccessed += 1;
        byKelas[kelas][tag].accessCount += activity.accessCount || 0;
      }

      if (prajaInfo) {
        if (!perStudentBuckets.has(activity.userId)) {
          perStudentBuckets.set(activity.userId, makeEmptyBucket());
        }
        const bucket = perStudentBuckets.get(activity.userId);
        bucket[tag].totalSeconds += activity.totalDuration || 0;
        bucket[tag].lecturesAccessed += 1;
        bucket[tag].accessCount += activity.accessCount || 0;
      }
    }

    const finalize = (bucket) =>
      TAGS.map((t) => ({
        tag: t,
        totalMinutes: Math.round((bucket[t].totalSeconds / 60) * 10) / 10,
        lecturesAccessed: bucket[t].lecturesAccessed,
        accessCount: bucket[t].accessCount,
      }));

    // 4. Bentuk array per-siswa + hitung profil VARK adaptif (kuisioner 50% + waktu baca 50%)
    const perStudent = Array.from(perStudentBuckets.entries())
      .map(([userId, bucket]) => {
        const info = prajaByUserId.get(userId);
        const finalized = finalize(bucket);

        const readingDominant = finalized
          .filter((f) => f.tag !== "UNTAGGED")
          .sort((a, b) => b.totalMinutes - a.totalMinutes)[0];

        const readingMinutesByTag = Object.fromEntries(
          finalized
            .filter((f) => f.tag !== "UNTAGGED")
            .map((f) => [f.tag, f.totalMinutes]),
        );

        const adaptive = calculateAdaptiveVark(
          info?.quizScores,
          readingMinutesByTag,
        );

        return {
          userId,
          nama: info?.nama || "Tidak diketahui",
          npp: info?.npp || "-",
          kelas: info?.kelas || "UNKNOWN",
          tags: finalized,
          readingDominantTag:
            readingDominant && readingDominant.totalMinutes > 0
              ? readingDominant.tag
              : null,
          totalMinutesAll:
            Math.round(
              finalized.reduce((sum, f) => sum + f.totalMinutes, 0) * 10,
            ) / 10,
          quizDominant: info?.quizDominant || [],
          adaptiveScores: adaptive.scores, // persentase blended per tag
          adaptiveDominant: adaptive.dominant, // bisa lebih dari 1 tag kalau seri
          adaptiveSources: adaptive.sources, // breakdown persen kuisioner vs waktu baca (untuk transparansi)
        };
      })
      .sort((a, b) => a.nama.localeCompare(b.nama));

    return res.json({
      success: true,
      overall: finalize(overall),
      byKelas: {
        G1: finalize(byKelas.G1),
        G2: finalize(byKelas.G2),
      },
      perStudent,
    });
  } catch (error) {
    console.error("getVarkTagDurationSummary error:", error);
    return res.json({ success: false, message: error.message });
  }
};
