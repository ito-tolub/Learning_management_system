import express from 'express'
import { addCourse, getEducatorCourses, updateRoleToEducator, educatorDashboardData, getEnrolledStudentsData, getStudentEngagementScore,  trackLectureActivity, loginDosen } from '../controllers/educatorController.js';
import upload from '../configs/multer.js';
import { protectDosen, protectEducator } from '../middlewares/authMiddleware.js';
import { clerkMiddleware, requireAuth } from '@clerk/express';


const educatorRouter = express.Router()

educatorRouter.post('/login', loginDosen)

//add educator Role
educatorRouter.get('/update-role', updateRoleToEducator)
educatorRouter.post('/add-course', upload.single('image'), protectEducator, addCourse)
educatorRouter.get('/courses', protectDosen, getEducatorCourses)
educatorRouter.get('/dashboard', protectDosen, educatorDashboardData)
educatorRouter.get('/enrolled-students', protectDosen, getEnrolledStudentsData)
 
// educatorRouter.post('/track-activity', requireAuth(), trackLectureActivity) 

educatorRouter.get('/ses', protectDosen, getStudentEngagementScore)

export default educatorRouter;