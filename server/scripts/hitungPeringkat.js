/**
 * Menghitung PERINGKAT LENGKAP objek pembelajaran untuk setiap praja pada
 * setiap pertemuan (3-7), lalu menyimpannya ke koleksi `recommendationrankings`.
 * Dipakai untuk mengisi pertemuan yang peringkatnya belum terbentuk otomatis
 * (praja yang tidak membuka halaman pertemuan, atau data sebelum fitur ini).
 *
 * Jalankan dari folder server:
 *   node scripts/hitungPeringkat.js            (uji coba, tidak menulis)
 *   node scripts/hitungPeringkat.js --tulis    (menyimpan ke MongoDB)
 *
 * Aman diulang: dokumen yang sama (praja + pertemuan) diperbarui, bukan
 * digandakan. Koleksi lain tidak diubah.
 *
 * Dokumen yang SUDAH ada (dibentuk otomatis oleh sistem) tidak diubah.
 *
 * Profil VARK: bila praja punya recommendationsnapshots lama untuk pertemuan
 * itu, profil di snapshot dipakai (persis yang dipakai sistem saat itu).
 * Bila tidak ada, profil direkonstruksi dari data aktivitas sebelum batas
 * awal pertemuan.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Course from "../models/Course.js";
import User from "../models/User.js";
import Keprajaan from "../models/Keprajaan.js";
import { LectureActivity } from "../models/LectureActivity.js";
import { RecommendationSnapshot } from "../models/RecommendationSnapshot.js";
import { RecommendationRanking } from "../models/RecommendationRanking.js";
import { getMeetingStart } from "../utils/freezeRecommendation.js";
import { getMentalReference } from "../utils/mentalReference.js";
import {
  buildProfileFromData,
  rankChapterForPraja,
} from "../utils/peringkatRekomendasi.js";

const TULIS = process.argv.includes("--tulis");
const PERTEMUAN = [3, 4, 5, 6, 7];

const sama = (a, b) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

const jalankan = async () => {
  await mongoose.connect(`${process.env.MONGODB_URI}/lms`);

  const mentalReference = await getMentalReference();
  console.log(`Ambang mental kepribadian: ${mentalReference}`);

  const courses = await Course.find({}).lean();
  let ditulis = 0;
  let tidakCocok = 0;

  for (const course of courses) {
    const cid = course._id.toString();

    if (!course.meetingAnchor?.date) {
      console.log(`LEWAT ${course.courseTitle}: meetingAnchor belum diisi`);
      continue;
    }

    console.log(`\n=== ${course.courseTitle} ===`);

    const users = await User.find(
      { enrolledCourses: course._id, npp: { $ne: null } },
      "npp varkResult",
    ).lean();

    const prajaList = await Keprajaan.find(
      { npp: { $in: users.map((u) => u.npp) } },
      "npp nama kelas mentalKepribadian",
    ).lean();
    const byNpp = new Map(prajaList.map((p) => [p.npp, p]));

    for (const user of users) {
      const praja = byNpp.get(user.npp);
      if (!["G1", "G2"].includes(praja?.kelas)) continue;

      const activities = await LectureActivity.find({
        userId: user._id,
        courseId: cid,
      }).lean();

      const snapshots = await RecommendationSnapshot.find({
        userId: user._id,
        courseId: cid,
      }).lean();
      const snapByChapter = new Map(snapshots.map((s) => [s.chapterId, s]));

      const sudahAda = new Set(
        (
          await RecommendationRanking.find(
            { userId: user._id, courseId: cid },
            "chapterId",
          ).lean()
        ).map((r) => r.chapterId),
      );

      const operasi = [];

      for (const n of PERTEMUAN) {
        const chapterId = `pertemuan${n}`;
        const cutoff = getMeetingStart(course, n);
        if (!cutoff || new Date() < cutoff) continue; // belum berjalan

        if (sudahAda.has(chapterId)) continue; // tidak ditimpa

        const snap = snapByChapter.get(chapterId);

        const profile = snap
          ? {
              scores: snap.varkVector,
              source: snap.profileSource,
              origin: "snapshot",
            }
          : {
              ...buildProfileFromData({
                quizScores: user.varkResult?.scores,
                activities,
                course,
                cutoff,
              }),
              origin: "rekonstruksi",
            };

        const hasil = rankChapterForPraja({
          course,
          chapterId,
          profile,
          mentalKepribadian: praja.mentalKepribadian,
          mentalReference,
        });
        if (!hasil) continue;

        if (snap) {
          const top4 = hasil.ranking.slice(0, 4).map((r) => r.lectureId);
          if (!sama(top4, snap.recommendedLectureIds || [])) {
            tidakCocok += 1;
            console.log(`  PERINGATAN ${user.npp} P${n}: top-4 beda dari snapshot`);
          }
        }

        console.log(
          `  ${user.npp} ${praja.kelas} P${n} ${profile.source.padEnd(9)} ` +
            `(${profile.origin}) -> ${hasil.ranking
              .slice(0, 4)
              .map((r) => r.lectureId)
              .join(", ")}`,
        );

        operasi.push({
          updateOne: {
            filter: { userId: user._id, courseId: cid, chapterId },
            update: {
              $setOnInsert: {
                meetingNumber: n,
                npp: user.npp,
                nama: praja.nama,
                kelas: praja.kelas,
                varkVector: profile.scores,
                profileSource: profile.source,
                profileOrigin: profile.origin,
                mentalKepribadian: praja.mentalKepribadian,
                mentalReference,
                contentGranularity: hasil.contentGranularity,
                cognitiveLevel: hasil.cognitiveLevel,
                cutoff: snap?.cutoff || cutoff,
                ranking: hasil.ranking,
                computedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }

      if (TULIS && operasi.length > 0) {
        await RecommendationRanking.bulkWrite(operasi);
        ditulis += operasi.length;
      }
    }
  }

  console.log(
    TULIS
      ? `\nSelesai. ${ditulis} dokumen peringkat tersimpan (koleksi recommendationrankings).`
      : "\nUji coba selesai. Tidak ada yang ditulis. Tambahkan --tulis untuk menyimpan.",
  );
  if (tidakCocok > 0) {
    console.log(`Catatan: ${tidakCocok} peringkat top-4 tidak cocok dengan snapshot.`);
  }

  await mongoose.disconnect();
};

jalankan().catch((e) => {
  console.error(e);
  process.exit(1);
});
