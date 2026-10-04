import mongoose from 'mongoose'

const lectureEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['open', 'duration', 'complete', 'uncomplete'],
    required: true,
  },
  seconds: { type: Number, default: undefined }, // hanya untuk type "duration"
  at: { type: Date, default: Date.now },
}, { _id: false })

const lectureActivitySchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  courseId:  { type: String, required: true },
  lectureId: { type: String, required: true },
  accessCount:   { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 },
  events: { type: [lectureEventSchema], default: [] }, // log per kejadian
}, { timestamps: true })

lectureActivitySchema.index({ userId: 1, courseId: 1, lectureId: 1 }, { unique: true })

export const LectureActivity = mongoose.model('LectureActivity', lectureActivitySchema)