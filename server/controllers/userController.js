import User from "../models/User.js";
import { Purchase} from "../models/Purchase.js";
import Stripe from "stripe";
import Course from "../models/Course.js";
import mongoose from "mongoose";

export const getUserData = async (req, res) => {
    try {
        const {userId} = req.auth();
        const user = await User.findOne({ clerkId: userId });

        if(!user) {
            return res.json({success: false, message : 'User Not Found'})
        }
        res.json({success: true, user})
    } catch (error) {
        res.json({success: false, message : error.message})
    }
}

//User Enrolled Courses With Lecture Link
export const userEnrolledCourses = async (req, res) => {
    try {
      const { userId } = req.auth();
  
      const userData = await User
        .findOne({ clerkId: userId })
        .populate('enrolledCourses');
  
      if (!userData) {
        return res.json({ success: false, message: 'User Not Found' });
      }
  
      res.json({
        success: true,
        enrolledCourses: userData.enrolledCourses
      });
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  };

  export const purchaseCourse = async (req, res) => {
    const { courseId } = req.body; // Pastikan courseId ada di body request
    const { userId } = req.auth(); // Mendapatkan userId dari auth middleware
    const { origin } = req.headers;
    
    try {
        // Menggunakan ObjectId untuk mencari courseId yang sesuai
        const courseData = await Course.findOne({ _id: new mongoose.Types.ObjectId(courseId) });
        
        if (!courseData) {
            return res.json({ success: false, message: "Course not found" });
        }

        const userData = await User.findOne({ userId });

        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }

        // Membuat data pembelian
        const purchaseData = {
            courseId: courseData._id, // Menggunakan courseData._id yang benar
            userId: userData._id, // Pastikan userId benar
            amount: (courseData.coursePrice - (courseData.discount * courseData.coursePrice / 100)).toFixed(2),
        };

        // Menyimpan data pembelian ke database
        const newPurchase = await Purchase.create(purchaseData);

        // Stripe Gateway Initialization
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
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
          mode: 'payment',  // Menambahkan mode 'payment' untuk transaksi satu kali
          success_url: `${origin}/my-enrollments`,
          cancel_url: `${origin}/`,
          metadata: {
              purchasedId: newPurchase._id.toString()
          }
      });

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};