import express from 'express'
import { getUserData, enrollFreeCourse, userEnrolledCourses, getUserCourseProgress, updateUserCourseProgress, saveVarkResult, saveNpp, updateCourseProgress, getMyAdaptiveVark, getMyFrozenRecommendation  } from '../controllers/userController.js'
import { trackLectureActivity } from '../controllers/educatorController.js'
 
const userRouter = express.Router()
 
userRouter.get('/data', getUserData)
userRouter.get('/adaptive-vark', getMyAdaptiveVark)
userRouter.get('/enrolled-courses', userEnrolledCourses)
userRouter.post('/enroll-free', enrollFreeCourse)
userRouter.post('/save-vark', saveVarkResult)
userRouter.post('/save-npp', saveNpp)
userRouter.post('/update-course-progress', updateCourseProgress)
userRouter.post('/get-course-progress', getUserCourseProgress)
userRouter.post('/track-activity', trackLectureActivity)
userRouter.get('/frozen-recommendation', getMyFrozenRecommendation)
 
export default userRouter;