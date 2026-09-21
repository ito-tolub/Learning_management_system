/**
 * Membekukan rekomendasi secara RETROAKTIF untuk pertemuan yang sudah
 * berlalu, memakai profil VARK menurut data SEBELUM jendela tiap
 * pertemuan dimulai.
 *
 * Jalankan SEKALI dari folder server:
 *   node scripts/backfillSnapshots.js            (uji coba, tidak menulis)
 *   node scripts/backfillSnapshots.js --tulis    (menyimpan ke MongoDB)
 *
 * Aman diulang: snapshot yang sudah ada tidak ditimpa.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Course from "../models/Course.js";
import User from "../models/User.js";
import Keprajaan from "../models/Keprajaan.js";
import { RecommendationSnapshot } from "../models/RecommendationSnapshot.js";
import {
  buildProfileAtCutoff,
  getMeetingStart,
  meetingNumberFromChapterId,
} from "../utils/freezeRecommendation.js";
import {
  MAIN_LECTURE_IDS_BY_CHAPTER,
  getG2Recommendations,
} from "../utils/calculateFeedbackScore.js";
import { getMentalReference } from "../utils/mentalReference.js";

const TULIS = process.argv.includes("--tulis");
const PERTEMUAN = [3, 4, 5, 6, 7];

const jalankan = async () => {
  await mongoose.connect(`${process.env.MONGODB_URI}/lms`);

  // Ambang dibaca SEKALI dari basis data, lalu dipakai untuk seluruh praja
  const mentalReference = await getMentalReference();
  console.log(`Ambang mental kepribadian: ${mentalReference}`);

  const courses = await Course.find({}).lean();

  for (const course of courses) {
    const cid = course._id.toString();

    if (!course.meetingAnchor?.date) {
      console.log(`LEWAT ${course.courseTitle}: meetingAnchor belum diisi`);
      continue;
    }

    console.log(`\n=== ${course.courseTitle} ===`);

    const users = await User.find(
      { enrolledCourses: course._id, npp: { $ne: null } },
      "npp",
    ).lean();

    const npps = users.map((u) => u.npp).filter(Boolean);
    const prajaList = await Keprajaan.find(
      { npp: { $in: npps } },
      "npp nama kelas mentalKepribadian",
    ).lean();

    const byNpp = new Map(prajaList.map((p) => [p.npp, p]));

    for (const user of users) {
      const praja = byNpp.get(user.npp);

      // Hanya kelas G2 yang menerima rekomendasi
      if (praja?.kelas !== "G2") continue;

      for (const n of PERTEMUAN) {
        const chapterId = `pertemuan${n}`;

        const chapter = (course.courseContent || []).find(
          (c) => c.chapterId === chapterId,
        );
        if (!chapter) continue;

        const cutoff = getMeetingStart(course, n);
        if (!cutoff || new Date() < cutoff) continue; // belum berjalan

        const ada = await RecommendationSnapshot.findOne({
          userId: user._id,
          courseId: cid,
          chapterId,
        }).lean();

        if (ada) {
          console.log(`  ${user.npp} P${n}: sudah ada, dilewati`);
          continue;
        }

        const profile = await buildProfileAtCutoff(user._id, cutoff);

        const mainIds = MAIN_LECTURE_IDS_BY_CHAPTER[chapterId] || [];
        const mainLectures = (chapter.chapterContent || []).filter((l) =>
          mainIds.includes(l.lectureId),
        );

        const hasil = getG2Recommendations({
          chapter,
          mainLectures,
          userVarkVector: profile.scores,
          mentalKepribadian: praja?.mentalKepribadian,
          mentalReference,
        });

        const ids = (hasil || []).map((l) => l.lectureId);

        const ringkas = Object.entries(profile.scores)
          .map(([k, v]) => `${k}${Math.round(v)}`)
          .join(" ");

        console.log(
          `  ${user.npp} P${n} [${cutoff.toISOString().slice(0, 10)}] ` +
            `${profile.source.padEnd(9)} ${ringkas} -> ${ids.join(", ")}`,
        );

        if (TULIS) {
          await RecommendationSnapshot.create({
            userId: user._id,
            courseId: cid,
            chapterId,
            meetingNumber: n,
            recommendedLectureIds: ids,
            varkVector: profile.scores,
            profileSource: profile.source,
            cutoff,
          });
        }
      }
    }
  }

  console.log(
    TULIS
      ? "\nSelesai. Snapshot tersimpan."
      : "\nUji coba selesai. Tidak ada yang ditulis. Tambahkan --tulis untuk menyimpan.",
  );

  await mongoose.disconnect();
};

jalankan().catch((e) => {
  console.error(e);
  process.exit(1);
});
