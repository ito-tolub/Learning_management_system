import express from 'express'
import { getUserData, enrollPaidCourse, enrollFreeCourse, userEnrolledCourses, getUserCourseProgress, updateUserCourseProgress, addUserRating, saveVarkResult } from '../controllers/userController.js'
 
const userRouter = express.Router()
 
userRouter.get('/data', getUserData)
userRouter.get('/enrolled-courses', userEnrolledCourses)
userRouter.post('/purchase', enrollPaidCourse)
userRouter.post('/enroll-free', enrollFreeCourse)
userRouter.post('/save-vark', saveVarkResult)
 
userRouter.post('/update-course-progress', updateUserCourseProgress)
userRouter.post('/get-course-progress', getUserCourseProgress)
userRouter.post('/add-rating', addUserRating)
 
export default userRouter;