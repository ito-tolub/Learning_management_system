import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js";
import Keprajaan from "../models/Keprajaan.js";
import Stripe from "stripe";
import Course from "../models/Course.js";
import mongoose from "mongoose";
import { CourseProgress } from "../models/CourseProgress.js";

export const updateCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId
    const { courseId, lectureId } = req.body

    let progress = await CourseProgress.findOne({ userId, courseId })

    if (!progress) {
      // Buat baru jika belum ada
      progress = new CourseProgress({
        userId,
        courseId,
        lectureCompleted: [lectureId]
      })
    } else {
      // Toggle — jika sudah ada hapus, jika belum ada tambah
      if (progress.lectureCompleted.includes(lectureId)) {
        progress.lectureCompleted = progress.lectureCompleted.filter(id => id !== lectureId)
      } else {
        progress.lectureCompleted.push(lectureId)
      }
    }

    await progress.save()
    res.json({ success: true, message: 'Progress updated' })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId
    const user = await User.findById(userId).lean()

    if (!user) {
      return res.json({ success: false, message: 'User not found' })
    }

    let keprajaan = null
    if (user.npp) {
      const allKeprajaan = await Keprajaan.find({}).lean()
      keprajaan = allKeprajaan.find(k => 
        k.npp.toString() === user.npp.toString()
      ) || null
    }

    console.log('keprajaan found:', keprajaan) // ← tambah ini sementara

    const userWithKeprajaan = {
      ...user,
      mentalKepribadian: keprajaan?.mentalKepribadian ?? null,
      samapta: keprajaan?.samapta ?? null,
      nilaiAkhir: keprajaan?.nilaiAkhir ?? null,
      namaKeprajaan: keprajaan?.nama ?? null,
    }

    res.json({ success: true, user: userWithKeprajaan })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const saveNpp = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { npp } = req.body;

    if (!npp) {
      return res.json({ success: false, message: "NPP wajib diisi" });
    }

    const nppNum = parseFloat(npp);
    // Cari semua, lalu cocokkan string-nya agar tidak ada floating point mismatch
    const allKeprajaan = await Keprajaan.find({}).lean();
    const keprajaan =
      allKeprajaan.find(
        (k) =>
          parseFloat(k.npp).toFixed(4) === nppNum.toFixed(4) ||
          k.npp.toString() === npp.toString(),
      ) || null;
    if (!keprajaan) {
      return res.json({
        success: false,
        message: "NPP tidak ditemukan dalam data keprajaan",
      });
    }

    // Cek NPP belum dipakai user lain
    const existingUser = await User.findOne({
      npp: keprajaan.npp,
      _id: { $ne: userId },
    });

    // Simpan NPP dari DB (bukan dari input) agar format konsisten
    const user = await User.findByIdAndUpdate(
      userId,
      { npp: keprajaan.npp },
      { new: true },
    ).lean();

    res.json({
      success: true,
      message: `NPP berhasil disimpan. Selamat datang, ${keprajaan.nama}!`,
      user: {
        ...user,
        mentalKepribadian: keprajaan.mentalKepribadian,
        samapta: keprajaan.samapta,
        nilaiAkhir: keprajaan.nilaiAkhir,
        namaKeprajaan: keprajaan.nama,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

//User Enrolled Courses With Lecture Link
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const userData = await User.findById(userId).populate("enrolledCourses");

    // if (!userData) {
    //   return res.json({ success: false, message: 'User Not Found' });
    // }

    res.json({
      success: true,
      enrolledCourses: userData.enrolledCourses,
    });
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
    const progressData = await CourseProgress.findOne({ userId, courseId });

    res.json({ success: true, progressData });
  } catch (error) {
    res.json({ success: false, message: error.message });
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
      { varkResult },
      { new: true },
    );

    res.json({ success: true, user });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
