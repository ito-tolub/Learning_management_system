import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js";
import Stripe from "stripe";
import Course from "../models/Course.js";
import mongoose from "mongoose";

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

    const purchaseData = {
      courseId: courseData._id, userId,
      amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2),
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