import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { LectureActivity } from "../models/LectureActivity.js";
import { calculateAdaptiveVark } from "../utils/calculateAdaptiveVark.js";
import { MAIN_LECTURE_IDS_BY_CHAPTER } from "../utils/calculateFeedbackScore.js";

const userId = process.argv[2];

await mongoose.connect(`${process.env.MONGODB_URI}/lms`);

const user = await User.findById(userId, "name varkResult").lean();
const activities = await LectureActivity.find({ userId }).lean();
const courseIds = [...new Set(activities.map((a) => a.courseId))];
const courses = await Course.find({ _id: { $in: courseIds } }).lean();

const build = (kecualikanUtama) => {
  const map = new Map();
  for (const course of courses) {
    for (const chapter of course.courseContent || []) {
      const mainIds = new Set(
        MAIN_LECTURE_IDS_BY_CHAPTER[chapter.chapterId] || [],
      );
      for (const lecture of chapter.chapterContent || []) {
        if (kecualikanUtama && mainIds.has(lecture.lectureId)) continue;
        map.set(
          `${course._id.toString()}::${lecture.lectureId}`,
          lecture.tags || null,
        );
      }
    }
  }

  const sec = { V: 0, A: 0, R: 0, K: 0 };
  for (const a of activities) {
    const tag = map.get(`${a.courseId}::${a.lectureId}`);
    if (tag && sec[tag] !== undefined) sec[tag] += a.totalDuration || 0;
  }

  return Object.fromEntries(
    Object.entries(sec).map(([t, s]) => [t, Math.round((s / 60) * 10) / 10]),
  );
};

const quiz = user?.varkResult?.scores || { V: 0, A: 0, R: 0, K: 0 };

for (const [label, kecualikan] of [["SEBELUM", false], ["SESUDAH", true]]) {
  const menit = build(kecualikan);
  const hasil = calculateAdaptiveVark(quiz, menit);
  console.log(`\n=== ${label} patch ===`);
  console.log("menit per modalitas :", menit);
  console.log("profil adaptif      :", hasil.scores);
  console.log("dominan             :", hasil.dominant);
}

console.log("\nkuesioner           :", quiz);
await mongoose.disconnect();