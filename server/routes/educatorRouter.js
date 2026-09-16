import express from 'express'
import { addCourse, getEducatorCourses, updateRoleToEducator, educatorDashboardData, getEnrolledStudentsData, getStudentEngagementScore,  trackLectureActivity, loginDosen, activateDosenPassword, getCourseQuizResults, getVarkTagDurationSummary } from '../controllers/educatorController.js';
import upload from '../configs/multer.js';
import { protectDosen, protectEducator } from '../middlewares/authMiddleware.js';
import { getAttendanceSheet, saveAttendanceSheet, getAttendanceRecap,} from '../controllers/attendanceController.js';
import { listQuizzes, getQuizDetail, createQuiz, updateQuiz,
  deleteQuiz,
} from '../controllers/quizManageController.js';
import {
  listLearningObjects,
  updateLearningObject,
  createLearningObject,
} from '../controllers/learningObjectController.js';
import { clerkMiddleware, requireAuth } from '@clerk/express';

const educatorRouter = express.Router()

educatorRouter.post('/login', loginDosen)
educatorRouter.post(
  "/activate-password",
  activateDosenPassword,
);

//add educator Role
educatorRouter.get('/update-role', updateRoleToEducator)
educatorRouter.post('/add-course', upload.single('image'), protectEducator, addCourse)
educatorRouter.get('/courses', protectDosen, getEducatorCourses)
educatorRouter.get('/dashboard', protectDosen, educatorDashboardData)
educatorRouter.get('/enrolled-students', protectDosen, getEnrolledStudentsData)
educatorRouter.get('/vark-summary', protectDosen, getVarkTagDurationSummary)
 
// educatorRouter.post('/track-activity', requireAuth(), trackLectureActivity) 

educatorRouter.get('/ses', protectDosen, getStudentEngagementScore)
educatorRouter.get(
  "/quiz-results/:courseId",
  protectDosen,
  getCourseQuizResults,
);
educatorRouter.get('/attendance', protectDosen, getAttendanceSheet)
educatorRouter.get('/attendance/recap', protectDosen, getAttendanceRecap)
educatorRouter.post('/attendance', protectDosen, saveAttendanceSheet)

educatorRouter.get('/quizzes', protectDosen, listQuizzes)
educatorRouter.get('/quizzes/:quizId', protectDosen, getQuizDetail)
educatorRouter.post('/quizzes', protectDosen, createQuiz)
educatorRouter.put('/quizzes/:quizId', protectDosen, updateQuiz)
educatorRouter.delete('/quizzes/:quizId', protectDosen, deleteQuiz)

educatorRouter.get('/learning-objects', protectDosen, listLearningObjects)
educatorRouter.post('/learning-objects/:courseId/:chapterId', protectDosen, createLearningObject)
educatorRouter.put('/learning-objects/:courseId/:chapterId/:lectureId', protectDosen, updateLearningObject)

export default educatorRouter;