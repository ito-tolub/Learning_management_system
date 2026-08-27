import Course from "../models/Course.js";
import User from "../models/User.js";
import Keprajaan from "../models/Keprajaan.js";
import Pegawai from "../models/pegawai.js";

// Normalisasi NPP agar 33.005 (Number) cocok dengan "33.0050" (String/Mixed) → "33.0050"
const nppKey = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? String(v ?? "").trim() : n.toFixed(4);
};

// Get All Courses
export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      isPublished: true,
    })
      .select([
        "-courseContent",
        "-enrolledStudents",
      ])
      .populate({
        path: "pengajar",
        select: "nip nama jabatan unit_kerja pangkat",
      });

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Gagal mengambil course:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GetCourse by Id
export const getCourseId = async (req, res) => {
    const { id } = req.params
    try {
        const courseData = await Course.findById(id).lean();   // lean → bisa tambah field

        if (!courseData) {
            return res.json({ success: false, message: 'Course tidak ditemukan' })
        }

        // Manual join: NIP educator → nama dari koleksi pegawai
        if (!courseData.pengajarNama && courseData.educator) {
            const pegawai = await Pegawai.findOne({ nip: String(courseData.educator) }).lean();
            courseData.pengajarNama = pegawai?.nama || null;
        }

        // Sembunyikan lectureUrl untuk lecture non-preview
        courseData.courseContent?.forEach(chapter => {
            chapter.chapterContent?.forEach(lecture => {
                if (!lecture.isPreviewFree) {
                    lecture.lectureUrl = '';
                }
            })
        })

        res.json({ success: true, courseData })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Peserta (praja) sebuah course — nama+kelas dari koleksi Keprajaan via npp
export const getCoursePeserta = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId).select("_id");
    if (!course)
      return res.json({ success: false, message: "Course tidak ditemukan" });

    // 1) Semua user yang terdaftar di course ini — sumber kebenaran: User.enrolledCourses
    const users = await User.find(
      { enrolledCourses: courseId },
      "name imageUrl npp",
    ).lean();

    // 2) Data Keprajaan (nama + kelas), dikunci dengan NPP ter-normalisasi
    const allKeprajaan = await Keprajaan.find({}, "npp nama kelas").lean();
    const keprajaanByNpp = {};
    allKeprajaan.forEach((k) => {
      keprajaanByNpp[nppKey(k.npp)] = k;
    });

    // 3) Gabungkan: nama + kelas dari Keprajaan (fallback nama ke User.name).
    //    Field "kelas" inilah yang dipakai frontend (CourseDetail.jsx) untuk
    //    memfilter peserta sesuai kelas praja yang sedang login (G1/G2).
    const peserta = users
      .map((u) => {
        const k = keprajaanByNpp[nppKey(u.npp)];
        return {
          _id: u._id,
          npp: u.npp,
          name: k?.nama || u.name || "(Tanpa nama)",
          imageUrl: u.imageUrl,
          kelas: k?.kelas || null,
        };
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    res.json({ success: true, peserta });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};