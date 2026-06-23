/**
 * seedKelas.js — Mengisi jadwal, pengajar, dan kehadiran kelas secara langsung,
 * sekaligus mendaftarkan praja ke course (seolah sudah mengambil mata kuliah).
 *
 * Jalankan dari folder server:
 *    node seedKelas.js
 *
 * Aman dijalankan berkali-kali (idempotent).
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import Course from './models/Course.js'
import User from './models/User.js'
import { CourseProgress } from './models/CourseProgress.js'

/* ============================================================
   KONFIGURASI — sesuaikan dengan datamu
   ============================================================ */

// Target praja yang akan "mengambil" semua kelas.
// Isi SALAH SATU: pakai npp (string, hasil migrasi) ATAU email.
const TARGET = {
  npp: null,                       // contoh: '33.0900'
  email: 'praja@example.com',      // contoh email login praja
}

// Jadwal + pengajar + jumlah kehadiran, dicocokkan dengan JUDUL course (keyword).
// 'hadir' = berapa sesi yang dianggap sudah dihadiri (mengisi bar kehadiran).
const JADWAL = [
  { match: 'Manajemen Proyek',       day: 'Senin',  startTime: '08:00', endTime: '09:40', pengajar: 'MUHAMMAD TOSAN BINGAMAWA, M.Kom', hadir: 15 },
  { match: 'Keamanan Siber',         day: 'Jumat',  startTime: '07:30', endTime: '09:10', pengajar: 'Mohammad Rezza Fahlevvi, M.Cs.',   hadir: 3  },
  { match: 'Risiko Pelayanan',       day: 'Kamis',  startTime: '10:15', endTime: '11:55', pengajar: 'RINA WAHYUNI, S.Kom., M.T.I',      hadir: 8  },
  { match: 'Kepamongprajaan',        day: 'Jumat',  startTime: '09:30', endTime: '10:40', pengajar: 'Dr. ROBERT SIMBOLON, MPA',         hadir: 12 },
  { match: 'Penyusunan Skripsi',     day: 'Kamis',  startTime: '13:30', endTime: '14:20', pengajar: 'Mohammad Rezza Fahlevvi, M.Cs.',   hadir: 5  },
  { match: 'Sistem Informasi Manaj', day: 'Rabu',   startTime: '08:00', endTime: '09:40', pengajar: 'Dr. Budi Santoso, M.T.',           hadir: 10 },
]

// Default untuk course yang TIDAK cocok dengan JADWAL di atas (tetap didaftarkan).
const DEFAULT_JADWAL = { day: 'Senin', startTime: '08:00', endTime: '09:40', pengajar: null, hadir: 6 }

/* ============================================================
   LOGIKA
   ============================================================ */

const flattenLectures = (course) => {
  const ids = []
  ;(course.courseContent || []).forEach((ch) => {
    if (Array.isArray(ch.chapterContent)) {
      ch.chapterContent.forEach((lec) => lec?.lectureId && ids.push(lec.lectureId))
    }
  })
  return ids
}

const run = async () => {
  await mongoose.connect(`${process.env.MONGODB_URI}/lms`)
  console.log('✅ Connected\n')

  // 1) Cari praja target
  let user = null
  if (TARGET.npp) {
    user = await User.findOne({ npp: TARGET.npp })
  }
  if (!user && TARGET.email) {
    user = await User.findOne({ email: TARGET.email })
  }
  if (!user) {
    console.error('❌ Praja target tidak ditemukan. Cek TARGET.npp / TARGET.email.')
    await mongoose.disconnect()
    process.exit(1)
  }
  console.log(`🎓 Praja: ${user.name} (npp: ${user.npp}, _id: ${user._id})\n`)

  // 2) Ambil semua course published
  const courses = await Course.find({ isPublished: true })
  console.log(`📚 ${courses.length} course ditemukan\n`)

  const enrolledIds = []

  for (const course of courses) {
    const cfg = JADWAL.find((j) =>
      course.courseTitle.toLowerCase().includes(j.match.toLowerCase())
    ) || DEFAULT_JADWAL

    // a) set jadwal + pengajar
    course.schedule = { day: cfg.day, startTime: cfg.startTime, endTime: cfg.endTime }
    if (cfg.pengajar) course.pengajarNama = cfg.pengajar

    // b) daftarkan praja ke course
    if (!course.enrolledStudents.map(String).includes(String(user._id))) {
      course.enrolledStudents.push(user._id)
    }
    await course.save()
    enrolledIds.push(course._id)

    // c) seed kehadiran via CourseProgress
    const lectureIds = flattenLectures(course)
    const total = lectureIds.length
    const hadir = Math.min(cfg.hadir ?? 0, total)
    const completed = lectureIds.slice(0, hadir)

    await CourseProgress.findOneAndUpdate(
      { userId: String(user._id), courseId: String(course._id) },
      { $set: { lectureCompleted: completed, completed: total > 0 && hadir >= total } },
      { upsert: true, new: true }
    )

    console.log(
      `  • ${course.courseTitle}\n` +
      `      jadwal: ${cfg.day} ${cfg.startTime}–${cfg.endTime} | pengajar: ${cfg.pengajar || '(educator asli)'} | hadir: ${hadir}/${total}`
    )
  }

  // 3) update enrolledCourses di sisi user
  const merged = [...new Set([...(user.enrolledCourses || []).map(String), ...enrolledIds.map(String)])]
  user.enrolledCourses = merged
  await user.save()

  console.log(`\n✅ Selesai. ${user.name} kini terdaftar di ${merged.length} kelas.`)
  await mongoose.disconnect()
}

run().catch((e) => { console.error(e); process.exit(1) })
