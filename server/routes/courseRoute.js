import express from 'express'
import { getAllCourses, getCourseId, getCoursePeserta } from '../controllers/courseController.js'
import { getMyAttendanceSummary } from '../controllers/attendanceController.js'

const courseRouter = express.Router()

courseRouter.get('/all', getAllCourses)
courseRouter.get('/:id/peserta', getCoursePeserta)
courseRouter.get('/:id/attendance', getMyAttendanceSummary)
courseRouter.get('/:id', getCourseId)


export default courseRouter;