import express from 'express'
import { getUserData, enrollPaidCourse, enrollFreeCourse, userEnrolledCourses, getUserCourseProgress, updateUserCourseProgress, addUserRating, saveVarkResult, saveNpp, updateCourseProgress  } from '../controllers/userController.js'
import { trackLectureActivity } from '../controllers/educatorController.js'
 
const userRouter = express.Router()
 
userRouter.get('/data', getUserData)
userRouter.get('/enrolled-courses', userEnrolledCourses)
userRouter.post('/purchase', enrollPaidCourse)
userRouter.post('/enroll-free', enrollFreeCourse)
userRouter.post('/save-vark', saveVarkResult)
userRouter.post('/save-npp', saveNpp)
userRouter.post('/update-course-progress', updateCourseProgress)
userRouter.post('/get-course-progress', getUserCourseProgress)
userRouter.post('/add-rating', addUserRating)
userRouter.post('/track-activity', trackLectureActivity)
 
export default userRouter;