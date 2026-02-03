import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js";
import Stripe from "stripe";
import Course from "../models/Course.js";
import mongoose from "mongoose";
import { CourseProgress } from "../models/CourseProgress.js";

export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findById(userId);

    // if(!user) {
    //     return res.json({success: false, message : 'User Not Found'})

    res.json({ success: true, user })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

//User Enrolled Courses With Lecture Link
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId

    const userData = await User.findById(userId).populate('enrolledCourses');

    // if (!userData) {
    //   return res.json({ success: false, message: 'User Not Found' });
    // }

    res.json({
      success: true,
      enrolledCourses: userData.enrolledCourses
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.auth.userId;
    const { origin } = req.headers;
    const userData = await User.findById(userId);
    const courseData = await Course.findById(courseId);

    if (!userData || !courseData) {
      return res.json({ success: false, message: 'Data Not Found' })
    }

    const finalAmount =
  courseData.coursePrice -
  (courseData.discount * courseData.coursePrice) / 100;

    const purchaseData = {
      courseId: courseData._id, userId,
      amount: Number(finalAmount.toFixed(2)),
    }

    const newPurchase = await Purchase.create(purchaseData);

    // Stripe Gateway Initialization
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Menyimpan data pembelian ke database  
    const currency = process.env.CURRENCY.toLowerCase();

    const line_items = [{
      price_data: {
        currency,
        product_data: {
          name: courseData.courseTitle
        },
        unit_amount: Math.floor(newPurchase.amount) * 100
      },
      quantity: 1
    }];

    // Membuat sesi Stripe checkout
    const session = await stripeInstance.checkout.sessions.create({
      line_items: line_items,
      mode: 'payment',  
      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: `${origin}/`,
      metadata: {
        purchaseId: newPurchase._id.toString()
      }
    });

    res.json({ success: true, session_url: session.url });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

//Update User Course Progress
export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId
    const {courseId, lectureId} = req.body
    const progressData = await CourseProgress.findOne({userId, courseId})

    if (progressData) {
      if (progressData.lectureCompleted.includes(lectureId)) {
        return res.json({seccess: true, message: 'Lecture already completed'})
      }

      progressData.lectureCompleted.push(lectureId)
      await progressData.save()
    }else{
      await CourseProgress.create({
        userId, courseId, lectureCompleted: [lectureId]
      })
    }

    res.json({success: true, message: 'Progress Updated'})
  } catch (error) {
    res.json({success: true, message: error.message})
  }
}

//get User Course Progress
export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId
    const {courseId} = req.body
    const progressData = await CourseProgress.findOne({userId, courseId})

    res.json({success: true, progressData})
  } catch (error) {
    res.json({ success: false, message: error.message})
  }
}

//add user rating course
export const addUserRating = async (req,res) => {
  const userId = req.auth.userId;
  const {courseId, rating} = req.body;

  if(!courseId || !userId || !rating || rating < 1 || rating > 5) {
    return res.json({success: false, message: 'invalid details'})
  }
  try {
    const course = await Course.findById(req.body.courseId)
    if (!course) {
      return res.json({ success: false, message: 'course not found'})
    }

    const user = await User.findById(userId);

    if (!user || user.enrolledCourses.includes(courseId)) {
      return res.json({ success: false, message: 'user has not purchased this course'})
    }
    const existingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId)

    if (existingRatingIndex > -1) {
      course.courseRatings[existingRatingIndex].rating = rating;
    }else {
      course.courseRatings.push({userId, courseRatings});
    }
    await course.save();
    return res.json({ success: false, message: 'rating added'})
  } catch (error) {
    res.json({ success: false, message: error.message})
  }
}