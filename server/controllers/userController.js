import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js";
import Keprajaan from "../models/Keprajaan.js";
import Stripe from "stripe";
import Course from "../models/Course.js";
import mongoose from "mongoose";
import { CourseProgress } from "../models/CourseProgress.js";
import { LectureActivity } from "../models/LectureActivity.js";
import Pegawai from "../models/pegawai.js";
import { clerkClient } from "@clerk/express";
import { calculateAdaptiveVark } from "../utils/calculateAdaptiveVark.js";

export const updateCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId, lectureId } = req.body;

    let progress = await CourseProgress.findOne({
      userId,
      courseId,
    });

    // Apakah lecture sebelumnya sudah selesai?
    const alreadyCompleted =
      progress?.lectureCompleted?.includes(lectureId) || false;

    /*
     * Jika BELUM selesai dan user ingin menandai selesai,
     * cek dulu apakah waktu bacanya sudah memenuhi.
     */
    if (!alreadyCompleted) {
      const course = await Course.findById(courseId).lean();

      if (!course) {
        return res.json({
          success: false,
          message: "Course tidak ditemukan",
        });
      }

      // Cari lecture berdasarkan lectureId
      let lecture = null;

      for (const chapter of course.courseContent || []) {
        const foundLecture = (chapter.chapterContent || []).find(
          (item) => item.lectureId === lectureId,
        );

        if (foundLecture) {
          lecture = foundLecture;
          break;
        }
      }

      if (!lecture) {
        return res.json({
          success: false,
          message: "Objek pembelajaran tidak ditemukan",
        });
      }

      // lectureDuration tersimpan dalam MENIT
      const fullDurationSeconds = Number(lecture.lectureDuration || 0) * 60;

      const requiredSeconds = Math.ceil(fullDurationSeconds * 0.5);

      // Ambil aktivitas baca praja
      const activity = await LectureActivity.findOne({
        userId,
        courseId,
        lectureId,
      }).lean();

      const actualSeconds = Number(activity?.totalDuration || 0);

      // Tolak jika waktu baca belum memenuhi
      if (actualSeconds < requiredSeconds) {
        const remainingSeconds = requiredSeconds - actualSeconds;

        return res.json({
          success: false,
          message: `Waktu membaca belum cukup. Sisa ${remainingSeconds} detik.`,
          remainingSeconds,
          actualSeconds,
          requiredSeconds,
        });
      }
    }

    /*
     * TOGGLE PROGRESS
     */

    if (!progress) {
      progress = new CourseProgress({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      });
    } else {
      if (alreadyCompleted) {
        // Batalkan selesai
        progress.lectureCompleted = progress.lectureCompleted.filter(
          (id) => id !== lectureId,
        );
      } else {
        // Tandai selesai
        progress.lectureCompleted.push(lectureId);
      }
    }

    await progress.save();

    res.json({
      success: true,
      message: alreadyCompleted
        ? "Objek pembelajaran dibatalkan"
        : "Objek pembelajaran selesai",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId;
    let user = await User.findById(userId).lean();

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);
      const created = await User.create({
        _id: userId,
        username: clerkUser.username,
        name:
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "Praja",
        imageUrl: clerkUser.imageUrl || "",
      });
      user = created.toObject();
    }

    let keprajaan = null;
    if (user.npp) {
      const allKeprajaan = await Keprajaan.find({}).lean();
      keprajaan =
        allKeprajaan.find((k) => k.npp.toString() === user.npp.toString()) ||
        null;
    }

    const userWithKeprajaan = {
      ...user,
      mentalKepribadian: keprajaan?.mentalKepribadian ?? null,
      samapta: keprajaan?.samapta ?? null,
      nilaiAkhir: keprajaan?.nilaiAkhir ?? null,
      namaKeprajaan: keprajaan?.nama ?? null,
      kelas: keprajaan?.kelas ?? null,
    };

    res.json({ success: true, user: userWithKeprajaan });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const saveNpp = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { npp } = req.body;

    // =========================================
    // VALIDASI INPUT
    // =========================================

    if (!npp) {
      return res.json({
        success: false,
        message: "NPP wajib diisi",
      });
    }

    const nppInput = String(npp).trim();

    // =========================================
    // CARI DATA KEPRAJAAN
    // =========================================

    const allKeprajaan = await Keprajaan.find({}).lean();

    const keprajaan =
      allKeprajaan.find((item) => {
        const dbNpp = String(item.npp).trim();

        // Perbandingan string langsung
        if (dbNpp === nppInput) {
          return true;
        }

        // Kompatibilitas data lama
        // apabila NPP pernah tersimpan sebagai Number.
        const dbNumber = Number.parseFloat(dbNpp);

        const inputNumber = Number.parseFloat(nppInput);

        if (Number.isNaN(dbNumber) || Number.isNaN(inputNumber)) {
          return false;
        }

        return dbNumber.toFixed(4) === inputNumber.toFixed(4);
      }) || null;

    // =========================================
    // NPP TIDAK DITEMUKAN
    // =========================================

    if (!keprajaan) {
      return res.json({
        success: false,
        message: "NPP tidak ditemukan dalam data keprajaan",
      });
    }

    // =========================================
    // NORMALISASI NPP DARI DATABASE
    // =========================================

    const officialNpp = String(keprajaan.npp).trim();

    // =========================================
    // CEK NPP SUDAH DIPAKAI USER LAIN
    // =========================================

    const existingUser = await User.findOne({
      npp: officialNpp,

      _id: {
        $ne: userId,
      },
    }).lean();

    if (existingUser) {
      return res.json({
        success: false,
        message: "NPP ini sudah terhubung dengan akun lain",
      });
    }

    // =========================================
    // UPDATE USER
    //
    // Nama RESMI diambil dari collection
    // keprajaan, bukan dari Clerk.
    // =========================================

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          npp: officialNpp,

          name: keprajaan.nama,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!user) {
      return res.json({
        success: false,
        message: "Data user tidak ditemukan",
      });
    }

    return res.json({
      success: true,

      message: `NPP berhasil dikonfirmasi. Selamat datang, ${keprajaan.nama}!`,

      user: {
        ...user,

        mentalKepribadian: keprajaan.mentalKepribadian,

        samapta: keprajaan.samapta,

        nilaiAkhir: keprajaan.nilaiAkhir,

        namaKeprajaan: keprajaan.nama,

        kelas: keprajaan.kelas,
      },
    });
  } catch (error) {
    console.error("saveNpp error:", error);

    return res.json({
      success: false,
      message: error.message || "Gagal menyimpan NPP",
    });
  }
};

export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const userData = await User.findById(userId).populate("enrolledCourses");
    const courses = userData?.enrolledCourses || [];

    // Kumpulkan NIP educator, ambil namanya dari koleksi pegawai
    // Normalisasi educator agar data lama dan data baru tetap didukung
    const normalizeEducatorNips = (educator) => {
      if (Array.isArray(educator)) {
        return educator.map((nip) => String(nip).trim()).filter(Boolean);
      }

      return String(educator || "")
        .split(/[\s,]+/)
        .map((nip) => nip.trim())
        .filter(Boolean);
    };

    // Ambil seluruh NIP dari seluruh mata kuliah
    const nips = [
      ...new Set(
        courses.flatMap((course) => normalizeEducatorNips(course.educator)),
      ),
    ];

    // Cari seluruh dosen berdasarkan NIP
    const pegawaiList = await Pegawai.find({
      nip: {
        $in: nips,
      },
    })
      .select("nip nama jabatan unit_kerja")
      .lean();

    // Buat indeks pegawai berdasarkan NIP
    const pegawaiByNip = new Map(
      pegawaiList.map((pegawai) => [String(pegawai.nip), pegawai]),
    );

    const enriched = await Promise.all(
      courses.map(async (course) => {
        const obj = course.toObject ? course.toObject() : course;

        const educatorNips = normalizeEducatorNips(obj.educator);

        const pengajar = educatorNips
          .map((nip) => pegawaiByNip.get(nip))
          .filter(Boolean);

        const totalSesi = Array.isArray(obj.courseContent)
          ? obj.courseContent.length
          : 0;

        const progress = await CourseProgress.findOne({
          userId,
          courseId: obj._id.toString(),
        }).lean();

        const completedSet = new Set(progress?.lectureCompleted || []);

        const hadir = (obj.courseContent || []).reduce((total, chapter) => {
          const lectures = Array.isArray(chapter.chapterContent)
            ? chapter.chapterContent
            : [];

          const chapterSelesai = lectures.some((lecture) =>
            completedSet.has(lecture.lectureId),
          );

          return total + (chapterSelesai ? 1 : 0);
        }, 0);

        return {
          ...obj,

          // Pastikan frontend selalu menerima array NIP
          educator: educatorNips,

          // Frontend menerima array data dosen
          pengajar,

          // Tetap disediakan untuk kompatibilitas kode lama
          pengajarNama:
            obj.pengajarNama ||
            pengajar
              .map((dosen) => dosen.nama)
              .filter(Boolean)
              .join(", ") ||
            null,

          kehadiran: {
            hadir,
            totalSesi,
          },
        };
      }),
    );

    res.json({ success: true, enrolledCourses: enriched });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const enrollFreeCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.auth.userId;

    const userData = await User.findById(userId);
    const courseData = await Course.findById(courseId);

    if (!userData || !courseData) {
      return res.json({ success: false, message: "Data Not Found" });
    }

    if (userData.enrolledCourses.includes(courseId)) {
      return res.json({
        success: false,
        message: "Sudah terdaftar di kursus ini",
      });
    }

    // Tambahkan course ke enrolledCourses user
    await User.findByIdAndUpdate(userId, {
      $push: { enrolledCourses: courseId },
    });

    // Tambahkan user ke enrolledStudents course
    await Course.findByIdAndUpdate(courseId, {
      $push: { enrolledStudents: userId },
    });

    res.json({ success: true, message: "Berhasil mendaftar kursus" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Enroll Paid Course
export const enrollPaidCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.auth.userId;
    const { origin } = req.headers;
    const userData = await User.findById(userId);
    const courseData = await Course.findById(courseId);

    if (!userData || !courseData) {
      return res.json({ success: false, message: "Data Not Found" });
    }

    const finalAmount =
      courseData.coursePrice -
      (courseData.discount * courseData.coursePrice) / 100;

    const purchaseData = {
      courseId: courseData._id,
      userId,
      amount: Number(finalAmount.toFixed(2)),
    };

    const newPurchase = await Purchase.create(purchaseData);

    // Stripe Gateway Initialization
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Menyimpan data pembelian ke database
    const currency = process.env.CURRENCY.toLowerCase();

    const line_items = [
      {
        price_data: {
          currency,
          product_data: {
            name: courseData.courseTitle,
          },
          unit_amount: Math.floor(newPurchase.amount) * 100,
        },
        quantity: 1,
      },
    ];

    // Membuat sesi Stripe checkout
    const session = await stripeInstance.checkout.sessions.create({
      line_items: line_items,
      mode: "payment",
      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: `${origin}/`,
      metadata: {
        purchaseId: newPurchase._id.toString(),
      },
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

//Update User Course Progress
export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId, lectureId } = req.body;
    const progressData = await CourseProgress.findOne({ userId, courseId });

    if (progressData) {
      if (progressData.lectureCompleted.includes(lectureId)) {
        return res.json({
          seccess: true,
          message: "Lecture already completed",
        });
      }

      progressData.lectureCompleted.push(lectureId);
      await progressData.save();
    } else {
      await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      });
    }

    res.json({ success: true, message: "Progress Updated" });
  } catch (error) {
    res.json({ success: true, message: error.message });
  }
};

//get User Course Progress
export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId } = req.body;

    const progressData = await CourseProgress.findOne({
      userId,
      courseId,
    });

    // Ambil waktu baca seluruh lecture pada course ini
    const activityData = await LectureActivity.find({
      userId,
      courseId,
    }).lean();

    res.json({
      success: true,
      progressData,
      activityData,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

//add user rating course
export const addUserRating = async (req, res) => {
  const userId = req.auth.userId;
  const { courseId, rating } = req.body;

  if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
    return res.json({ success: false, message: "invalid details" });
  }
  try {
    const course = await Course.findById(req.body.courseId);
    if (!course) {
      return res.json({ success: false, message: "course not found" });
    }

    const user = await User.findById(userId);

    if (!user || !user.enrolledCourses.includes(courseId)) {
      return res.json({
        success: false,
        message: "user has not purchased this course",
      });
    }
    const existingRatingIndex = course.courseRatings.findIndex(
      (r) => r.userId === userId,
    );

    if (existingRatingIndex > -1) {
      course.courseRatings[existingRatingIndex].rating = rating;
    } else {
      course.courseRatings.push({ userId, rating });
    }
    await course.save();
    return res.json({ success: false, message: "rating added" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
//Save VARK Result
export const saveVarkResult = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { varkResult } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          varkResult,
        },
      },
      {
        new: true,
      },
    ).lean();

    if (!user) {
      return res.json({
        success: false,
        message: "Data user tidak ditemukan",
      });
    }

    // ========================================
    // AMBIL DATA KEPRAJAAN BERDASARKAN NPP
    // ========================================

    let keprajaan = null;

    if (user.npp) {
      const allKeprajaan = await Keprajaan.find({}).lean();

      keprajaan =
        allKeprajaan.find(
          (item) =>
            String(item.npp) === String(user.npp) ||
            Number.parseFloat(item.npp).toFixed(4) ===
              Number.parseFloat(user.npp).toFixed(4),
        ) || null;
    }

    // ========================================
    // KEMBALIKAN USER + DATA KEPRAJAAN
    // ========================================

    return res.json({
      success: true,

      user: {
        ...user,

        kelas: keprajaan?.kelas ?? null,

        namaKeprajaan: keprajaan?.nama ?? null,

        mentalKepribadian: keprajaan?.mentalKepribadian ?? null,

        samapta: keprajaan?.samapta ?? null,

        nilaiAkhir: keprajaan?.nilaiAkhir ?? null,
      },
    });
  } catch (error) {
    console.error("saveVarkResult error:", error);

    return res.json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyAdaptiveVark = async (req, res) => {
  try {
    const userId = req.auth.userId;
 
    const user = await User.findById(userId, "varkResult").lean();
    const quizScores = user?.varkResult?.scores || { V: 0, A: 0, R: 0, K: 0 };
 
    // Ambil semua aktivitas baca user ini
    const activities = await LectureActivity.find({ userId }).lean();
 
    if (activities.length === 0) {
      // Belum ada riwayat baca -> adaptif = 100% kuisioner
      const adaptive = calculateAdaptiveVark(quizScores, { V: 0, A: 0, R: 0, K: 0 });
      return res.json({ success: true, adaptiveScores: adaptive.scores, dominant: adaptive.dominant });
    }
 
    // Bangun peta lectureId -> tag, hanya untuk course yang relevan (efisien)
    const courseIds = [...new Set(activities.map((a) => a.courseId))];
    const courses = await Course.find({ _id: { $in: courseIds } }).lean();
 
    const lectureTagMap = new Map(); // key: `${courseId}::${lectureId}`
    for (const course of courses) {
      for (const chapter of course.courseContent || []) {
        for (const lecture of chapter.chapterContent || []) {
          lectureTagMap.set(`${course._id.toString()}::${lecture.lectureId}`, lecture.tags || null);
        }
      }
    }
 
    // Jumlahkan total detik akses per tag
    const secondsByTag = { V: 0, A: 0, R: 0, K: 0 };
    for (const activity of activities) {
      const tag = lectureTagMap.get(`${activity.courseId}::${activity.lectureId}`);
      if (tag && secondsByTag[tag] !== undefined) {
        secondsByTag[tag] += activity.totalDuration || 0;
      }
    }
 
    const readingMinutes = Object.fromEntries(
      Object.entries(secondsByTag).map(([tag, sec]) => [tag, Math.round((sec / 60) * 10) / 10]),
    );
 
    const adaptive = calculateAdaptiveVark(quizScores, readingMinutes);
 
    return res.json({
      success: true,
      adaptiveScores: adaptive.scores, // {V,A,R,K} dalam persen, dipakai sbg vektor cosine similarity
      dominant: adaptive.dominant,
      sources: adaptive.sources, // untuk debugging/transparansi kalau perlu ditampilkan
    });
  } catch (error) {
    console.error("getMyAdaptiveVark error:", error);
    return res.json({ success: false, message: error.message });
  }
};
