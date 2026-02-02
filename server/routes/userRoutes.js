import express from 'express'
import { getUserData, purchaseCourse, userEnrolledCourses, getUserCourseProgress, updateUserCourseProgress, addUserRating } from '../controllers/userController.js'

const userRouter = express.Router()

userRouter.get('/data', getUserData)
userRouter.get('/enrolled-courses', userEnrolledCourses)
// userRouter.post('/enroll-course', enrollCourse)
userRouter.post('/purchase', purchaseCourse)
// userRouter.post('/checkout', createCheckoutSession)

userRouter.post('/update-course-progress', updateUserCourseProgress)
userRouter.post('/get-course-progress', getUserCourseProgress)
userRouter.post('/add-rating', addUserRating)

export default userRouter;