import mongoose from 'mongoose'

const lectureActivitySchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  courseId:  { type: String, required: true },
  lectureId: { type: String, required: true },
  accessCount:   { type: Number, default: 0 },   // berapa kali dibuka
  totalDuration: { type: Number, default: 0 },   // total detik menonton
}, { timestamps: true })

// Index agar query cepat
lectureActivitySchema.index({ userId: 1, courseId: 1, lectureId: 1 }, { unique: true })

export const LectureActivity = mongoose.model('LectureActivity', lectureActivitySchema)
