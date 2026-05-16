import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js";
import { CourseProgress } from "../models/CourseProgress.js";
import { LectureActivity } from "../models/LectureActivity.js";
import jwt from "jsonwebtoken";
import Pegawai from "../models/Pegawai.js";
import Keprajaan from "../models/Keprajaan.js";

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

export const loginDosen = async (req, res) => {
  try {
    const { nip } = req.body;

    if (!nip) {
      return res.json({ success: false, message: "NIP tidak boleh kosong" });
    }

    // Cari dosen berdasarkan NIP
    const dosen = await Pegawai.findOne({ nip });

    if (!dosen) {
      return res.json({ success: false, message: "NIP tidak ditemukan" });
    }

    // Buat JWT token
    const token = jwt.sign(
      { nip: dosen.nip, nama: dosen.nama },
      process.env.JWT_DOSEN_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      success: true,
      token,
      nama: dosen.nama,
      nip: dosen.nip,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
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
    parsedCourseData.educator = educatorNip;
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
      const students = await User.find(
        { _id: { $in: course.enrolledStudents } },
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

// ─── Track Lecture Activity (dipanggil dari frontend saat praja membuka lecture)
export const trackLectureActivity = async (req, res) => {
  try {
    const { courseId, lectureId, duration = 0 } = req.body;

    console.log("Track Activity:", {
      userId: req.auth?.userId,
      body: req.body,
    });
    console.log("=== TRACK ACTIVITY ===");
    console.log("userId dari auth:", req.auth?.userId);
    console.log("body:", req.body);
    // Ambil token dari header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.json({ success: false, message: "Token tidak ditemukan" });
    }

    const token = authHeader.split(" ")[1];

    // Decode Clerk token — ambil userId dari payload
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );
    const userId = payload.sub; // Clerk menyimpan userId di field 'sub'

    await LectureActivity.findOneAndUpdate(
      { userId: userId, courseId, lectureId },
      {
        $inc: {
          accessCount: 1,
          totalDuration: duration,
        },
      },
      { upsert: true, new: true },
    );

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ─── Get SES (Student Engagement Score) ──────────────────────────────────────
export const getStudentEngagementScore = async (req, res) => {
  try {
    const courses = await Course.find({}).lean();

    const courseMeta = {};
    const lectureMap = {}; // ← tambah

    for (const course of courses) {
      let totalLecture = 0;
      let expectedDurSec = 0;
      course.courseContent?.forEach((ch) => {
        ch.chapterContent?.forEach((lec) => {
          totalLecture++;
          expectedDurSec += (lec.lectureDuration || 0) * 60;

          // ← isi lectureMap sekalian
          lectureMap[lec.lectureId] = {
            lectureTitle: lec.lectureTitle,
            lectureDuration: lec.lectureDuration || 0,
            courseTitle: course.courseTitle,
          };
        });
      });
      courseMeta[course._id.toString()] = {
        courseTitle: course.courseTitle,
        totalLecture,
        expectedDurSec: expectedDurSec || totalLecture * 600,
      };
    }

    const courseIdStrings = courses.map((c) => c._id.toString());
    const semuaPraja = await Keprajaan.find({}, "npp nama").lean();

    const userByNpp = {};
    const users = await User.find(
      { npp: { $exists: true } },
      "name npp enrolledCourses _id",
    ).lean();
    for (const u of users) {
      if (u.npp != null) userByNpp[u.npp.toString()] = u;
    }

    const sesData = [];

    for (const praja of semuaPraja) {
     
      const nppStr = String(praja.npp || "").trim();
      const user = users.find((u) => String(u.npp || "").trim() === nppStr);

      console.log(
        `praja: ${praja.nama}, npp: ${nppStr}, user ditemukan: ${!!user}`,
      );
      let interaksi = 0;
      let feedback = 0;
      let totalDurasiDetik = 0;
      const detail = [];

      if (user) {
        const userCourseIds = (user.enrolledCourses || [])
          .map((id) => id.toString())
          .filter((id) => courseIdStrings.includes(id));

        let grandExpectedDur = 0;
        let grandActualDur = 0;
        let grandTotalLecture = 0;
        let grandSelesai = 0;

        for (const courseId of userCourseIds) {
          const meta = courseMeta[courseId];
          if (!meta) continue;

          const activities = await LectureActivity.find({
            userId: user._id.toString(),
            courseId,
          }).lean();

          const progress = await CourseProgress.findOne({
            userId: user._id,
            courseId,
          }).lean();

          const actualDurSec = activities.reduce(
            (sum, a) => sum + (a.totalDuration || 0),
            0,
          );
          const selesai = progress?.lectureCompleted?.length || 0;

          grandExpectedDur += meta.expectedDurSec;
          grandActualDur += actualDurSec;
          grandTotalLecture += meta.totalLecture;
          grandSelesai += selesai;
          totalDurasiDetik += actualDurSec;

          // ← detail per objek pembelajaran yang diakses
          for (const activity of activities) {
            const info = lectureMap[activity.lectureId] || {};
            detail.push({
              lectureId: activity.lectureId,
              lectureTitle: info.lectureTitle || activity.lectureId,
              courseTitle: info.courseTitle || "",
              accessCount: activity.accessCount,
              actualDurSec: activity.totalDuration || 0,
              expectedDurSec: (info.lectureDuration || 0) * 60,
              selesai: progress?.lectureCompleted?.includes(activity.lectureId)
                ? 1
                : 0,
            });
          }
        }

        if (grandExpectedDur > 0) {
          interaksi = Math.min((grandActualDur / grandExpectedDur) * 100, 100);
        }
        if (grandTotalLecture > 0) {
          feedback = Math.min((grandSelesai / grandTotalLecture) * 100, 100);
        }
      }

      const ses = interaksi * 0.3 + feedback * 0.3 + 100 * 0.4;

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
        interaksi: Math.round(interaksi * 10) / 10,
        feedback: Math.round(feedback * 10) / 10,
        presensi: 100,
        ses: Math.round(ses * 100) / 100,
        totalDurasiDetik,
        kategori,
        kategoriColor,
        detail,
      });
    }

    sesData.sort((a, b) => b.ses - a.ses);
    res.json({ success: true, sesData });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
