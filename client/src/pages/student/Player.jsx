import React, { useContext, useEffect, useState, useRef } from "react";
import { AppContext } from "../../context/AppContext";
import { useParams } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import YouTube from "react-youtube";
import Footer from "../../components/student/Footer";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";

// Tentukan kategori durasi berdasarkan nilai keprajaan
const getDurationCategory = (userData) => {
  const mk = userData?.mentalKepribadian || 0;
  const samapta = userData?.samapta || 0;
  const avg = (mk + samapta) / 2;

  if (avg > 80.53) return "tinggi"; // durasi panjang: 15–30 menit
  if (avg >= 76.28) return "sedang"; // durasi sedang:  5–15 menit
  return "rendah"; // durasi pendek:  0–5 menit
};

// Normalisasi tipeVARK — handle "V"/"Visual", "A"/"Auditory", "R"/"Reading"/"Read/Write", "K"/"Kinesthetic"/"Kinestethic"
const normalizeVark = (val) => {
  if (!val) return null;
  const v = String(val).toLowerCase().trim();
  if (v === "v" || v.startsWith("vis")) return "V";
  if (v === "a" || v.startsWith("aud")) return "A";
  if (v === "r" || v.startsWith("read")) return "R";
  if (v === "k" || v.startsWith("kine")) return "K";
  return String(val).toUpperCase().charAt(0); // fallback: ambil huruf pertama
};

const varkEmoji = { V: "🎬", A: "🎧", R: "📄", K: "🛠️" };
const varkLabel = {
  V: "Visual",
  A: "Auditory",
  R: "Read/Write",
  K: "Kinesthetic",
};
const varkColor = {
  V: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    accent: "bg-purple-600",
    text: "text-purple-700",
    badge: "bg-purple-600",
  },
  A: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    accent: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-500",
  },
  R: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    accent: "bg-emerald-600",
    text: "text-emerald-700",
    badge: "bg-emerald-600",
  },
  K: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    accent: "bg-rose-500",
    text: "text-rose-700",
    badge: "bg-rose-500",
  },
};
const durationLabel = {
  tinggi: "Konten Panjang (15–30 mnt)",
  sedang: "Konten Sedang (5–15 mnt)",
  rendah: "Konten Singkat (< 5 mnt)",
};

const HtmlPlayer = ({ url, title }) => {
  const [htmlContent, setHtmlContent] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(url)
      .then((r) => r.text())
      .then((html) => {
        setHtmlContent(html);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [url]);

  if (loading)
    return (
      <div className="w-full h-96 bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-400 text-sm">Memuat konten...</p>
      </div>
    );
  if (error)
    return (
      <div className="w-full h-96 bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-400 text-sm">Gagal memuat konten.</p>
      </div>
    );

  return (
    <div className="w-full">
      <iframe
        srcDoc={htmlContent}
        className="w-full rounded-xl border border-gray-200"
        style={{ height: "600px" }}
        title={title}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
};

const Player = () => {
  const {
    enrolledCourses,
    calculateChapterTime,
    backendUrl,
    getToken,
    userData,
    fetUserEnrolledCourses,
  } = useContext(AppContext);
  const { courseId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [playerData, setPlayerData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [showAllLectures, setShowAllLectures] = useState(false);
  const [activityTimer, setActivityTimer] = useState(null);
  const [watchStart, setWatchStart] = useState(null);
  const watchStartRef = useRef(null);

  // Ambil dominant VARK — coba beberapa kemungkinan struktur data
  const dominant =
    userData?.varkResult?.dominant ||
    userData?.vark?.dominant ||
    userData?.dominantVark ||
    null;

  const durationCategory = getDurationCategory(userData);

  const getCourseData = () => {
    enrolledCourses.forEach((course) => {
      if (course._id === courseId) {
        setCourseData(course);
      }
    });
  };

  useEffect(() => {
    if (enrolledCourses.length > 0) {
      getCourseData();
    }
  }, [enrolledCourses]);

  const toggleLectureCompleted = async (lectureId) => {
    try {
      const token = await getToken();
      const wasCompleted = isCompleted(lectureId);

      const { data } = await axios.post(
        backendUrl + "/api/user/update-course-progress",
        { courseId, lectureId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (data.success) {
        console.log("sebelum refresh:", progressData?.lectureCompleted);
        toast.success(
          wasCompleted ? "Ditandai belum selesai" : "Ditandai selesai",
        );
        await getCourseProgress();
        console.log("setelah refresh:", progressData?.lectureCompleted);

        // Hanya track aktivitas saat menandai selesai, bukan saat membatalkan
        if (!wasCompleted) {
          const durasiReal = watchStartRef.current // ← pakai watchStartRef
            ? Math.floor((Date.now() - watchStartRef.current) / 1000)
            : 0;
          await axios.post(
            backendUrl + "/api/user/track-activity",
            { courseId, lectureId, duration: durasiReal },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

    // Tambahkan fungsi trackActivity setelah getCourseProgress
  const trackActivity = async (lectureId, duration = 0) => {
    try {
      const token = await getToken();
      await axios.post(
        backendUrl + "/api/user/track-activity",
        { courseId, lectureId, duration },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      console.log("Gagal track aktivitas:", error.message);
    }
  };

  const getCourseProgress = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/get-course-progress",
        { courseId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      console.log("getCourseProgress response:", data);
      if (data.success) {
        setProgressData(data.progressData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    getCourseProgress();
  }, []);

  // ← tambah di sini
  useEffect(() => {
    if (!playerData?.lectureId) return;

    watchStartRef.current = Date.now();
    setWatchStart(Date.now());
    trackActivity(playerData.lectureId, 0);

    return () => {
      if (watchStartRef.current) {
        const durasiDetik = Math.floor(
          (Date.now() - watchStartRef.current) / 1000,
        );
        if (durasiDetik > 3) {
          trackActivity(playerData.lectureId, durasiDetik);
        }
        watchStartRef.current = null;
      }
    };
  }, [playerData?.lectureId]);

  const renderPlayer = () => {
    if (!playerData) return null;
    const url = playerData.lectureUrl;

    if (!url)
      return (
        <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
          <p className="text-gray-400">Konten belum tersedia</p>
        </div>
      );

    // YouTube — cek domain dulu sebelum ekstensi
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const ytId = url.includes("youtu.be")
        ? url.split("youtu.be/")[1]?.split("?")[0]
        : new URL(url).searchParams.get("v") || url.split("/").pop();
      return (
        <YouTube
          videoId={ytId}
          opts={{ playerVars: { autoplay: 1 } }}
          iframeClassName="w-full aspect-video rounded-xl"
        />
      );
    }

    // Word document
    if (url.match(/\.docx?/i)) {
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
      return (
        <div className="w-full">
          <iframe
            src={viewerUrl}
            className="w-full rounded-xl border border-gray-200"
            style={{ height: "100vh" }}
            title={playerData.lectureTitle}
          />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-blue-500 hover:underline text-sm"
          >
            Download file ↗
          </a>
        </div>
      );
    }

    // PDF — cek di mana saja dalam URL (Cloudinary menambah suffix acak setelah .pdf)
    if (url.match(/\.pdf/i)) {
      return (
        <div className="w-full">
          <iframe
            src={url}
            className="w-full rounded-xl border border-gray-200"
            style={{ height: "500px" }}
            title={playerData.lectureTitle}
          />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-blue-500 hover:underline text-sm"
          >
            Buka PDF di tab baru ↗
          </a>
        </div>
      );
    }

    // Audio — cek ekstensi SEBELUM cek domain Cloudinary
    if (url.match(/\.(mp3|wav|ogg|m4a)/i)) {
      return (
        <div className="bg-gray-100 rounded-xl p-6 flex flex-col items-center gap-4">
          <img
            src={courseData.courseThumbnail}
            alt=""
            className="w-full aspect-video object-cover rounded-xl"
          />
          <audio controls autoPlay className="w-full">
            <source src={url} />
          </audio>
        </div>
      );
    }

    // Video ekstensi eksplisit
    if (url.match(/\.(mp4|webm|mov|avi|mkv)/i)) {
      return (
        <video
          key={url}
          controls
          autoPlay
          className="w-full rounded-xl bg-black"
          style={{ height: "60vh" }}
        >
          <source src={url} type="video/mp4" />
          Browser Anda tidak mendukung pemutaran video.
        </video>
      );
    }

    // HTML interaktif (quiz, simulasi) — Cloudinary raw atau ekstensi .html
    // HTML interaktif (quiz, simulasi)
    if (url.match(/\.html/i) || url.includes("/raw/upload/")) {
      return <HtmlPlayer url={url} title={playerData.lectureTitle} />;
    }

    // Cloudinary tanpa ekstensi — asumsikan video, fix path jika perlu
    if (url.includes("cloudinary.com")) {
      const videoUrl = url.replace("/image/upload/", "/video/upload/");
      return (
        <video
          key={videoUrl}
          controls
          autoPlay
          className="w-full aspect-video rounded-xl bg-black"
        >
          <source src={videoUrl} type="video/mp4" />
          Browser Anda tidak mendukung pemutaran video.
        </video>
      );
    }

    // Fallback
    return (
      <video
        key={url}
        controls
        autoPlay
        className="w-full aspect-video rounded-xl bg-black"
      >
        <source src={url} />
        <p className="text-gray-400 p-4">Format konten tidak didukung.</p>
      </video>
    );
  };

  if (!courseData) return <Loading />;

  const currentChapter = courseData.courseContent[selectedChapter];
  const lectures = currentChapter?.chapterContent || [];

  // --- Logika Rekomendasi: Top-1 dengan scoring ---
  const dominantNorm = normalizeVark(dominant);

  /**
   * Fungsi skor untuk setiap lecture (0–100):
   *   - Kecocokan VARK  : +60 poin  (bobot utama — CBF gaya belajar)
   *   - Kecocokan durasi: +40 poin  (bobot sekunder — KBF nilai keprajaan)
   *
   * VARK selalu menjadi faktor dominan; durasi memilah jika ada beberapa
   * lecture dengan VARK yang sama. Hasil akhir: tepat 1 lecture teratas.
   */
  const scoreLecture = (lecture) => {
    let score = 0;

    // ── Komponen VARK (0 atau 60) ─────────────────────────────────────────
    const varkMatch =
      dominantNorm && normalizeVark(lecture.tags) === dominantNorm;
    if (varkMatch) score += 60;

    // ── Komponen Durasi (0–40, proporsional terhadap kedekatan range) ─────
    const dur = lecture.lectureDuration || 0;
    const ranges = { tinggi: [15, 30], sedang: [5, 15], rendah: [0, 5] };
    const [lo, hi] = ranges[durationCategory];

    if (dur >= lo && dur <= hi) {
      // Tepat dalam range ideal: skor durasi penuh
      score += 40;
    } else {
      // Di luar range: berkurang proporsional terhadap jarak
      const distance = dur < lo ? lo - dur : dur - hi;
      const maxDistance = 30; // jarak maksimum yang masih dianggap relevan
      score += Math.max(0, 40 * (1 - distance / maxDistance));
    }

    return Math.round(score);
  };

  // Hitung skor semua lecture, urutkan tertinggi ke terendah
  const scoredLectures = lectures
    .map((l) => ({ ...l, _score: scoreLecture(l) }))
    .sort((a, b) => b._score - a._score);

  // ← taruh di sini
  console.log("mentalKepribadian:", userData?.mentalKepribadian);
  console.log("samapta:", userData?.samapta);
  console.log("durationCategory:", durationCategory);
  console.log(
    "scoredLectures:",
    scoredLectures.map((l) => ({
      title: l.lectureTitle,
      durasi: l.lectureDuration,
      score: l._score,
    })),
  );

  // Top-1: hanya ambil 1 lecture dengan skor tertinggi sebagai rekomendasi
  const rekomendasiAkhir = scoredLectures.length > 0 ? [scoredLectures[0]] : [];

  // Sisanya tampil di "Objek Pembelajaran Lainnya"
  const lecturesLain = scoredLectures.slice(1);

  const colors = varkColor[dominantNorm] || varkColor["V"];
  const isCompleted = (id) => progressData?.lectureCompleted?.includes(id);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex flex-col md:flex-row flex-grow">
        {/* ── Sidebar Kiri ── */}
        <div className="md:w-72 w-full bg-white border-r border-gray-200 flex-shrink-0 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">
              Daftar Objek Pembelajaran
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {courseData.courseTitle}
            </p>
          </div>
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 120px)" }}
          >
            {courseData.courseContent.map((chapter, index) => (
              <div
                key={index}
                onClick={() => {
                  setSelectedChapter(index);
                  setPlayerData(null);
                  setShowAllLectures(false);
                }}
                className={`px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-blue-50 transition-all ${
                  selectedChapter === index
                    ? "bg-blue-50 border-l-4 border-l-blue-600"
                    : ""
                }`}
              >
                <p className="text-xs text-gray-400 mb-0.5">
                  Objek Pembelajaran {chapter.chapterOrder}
                </p>
                <p
                  className={`text-sm font-medium ${selectedChapter === index ? "text-blue-700" : "text-gray-700"}`}
                >
                  {chapter.chapterTitle.replace(
                    `Pertemuan ${chapter.chapterOrder} - `,
                    "",
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400">
                    {chapter.chapterContent.length} objek
                  </p>
                  <span className="text-gray-300">·</span>
                  <p className="text-xs text-gray-400">
                    {calculateChapterTime(chapter)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Konten Utama ── */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          {/* Header Pertemuan */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-800">
              {currentChapter?.chapterTitle.replace(
                `Pertemuan ${currentChapter?.chapterOrder} - `,
                "",
              )}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {currentChapter?.chapterContent.length} objek pembelajaran ·{" "}
              {calculateChapterTime(currentChapter)}
            </p>
          </div>

          {/* Player */}
          {playerData && (
            <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-1">{renderPlayer()}</div>
              <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {varkEmoji[normalizeVark(playerData.tags)] || "📚"}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {playerData.lectureTitle}
                    </p>
                    <p className="text-xs text-gray-400">
                      {varkLabel[normalizeVark(playerData.tags)]} ·{" "}
                      {humanizeDuration(
                        playerData.lectureDuration * 60 * 1000,
                        { units: ["h", "m"] },
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleLectureCompleted(playerData.lectureId)}
                  title={
                    isCompleted(playerData.lectureId)
                      ? "Klik untuk membatalkan"
                      : "Tandai sebagai selesai"
                  }
                  className={`group px-4 py-2 rounded-full text-sm font-medium transition-all select-none ${
                    isCompleted(playerData.lectureId)
                      ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600 border border-green-200 hover:border-red-200"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  }`}
                >
                  {isCompleted(playerData.lectureId) ? (
                    <>
                      <span className="group-hover:hidden">✓ Selesai</span>
                      <span className="hidden group-hover:inline">
                        ✕ Batalkan
                      </span>
                    </>
                  ) : (
                    "Tandai Selesai"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Rekomendasi Objek Pembelajaran ── */}
          {dominantNorm && rekomendasiAkhir.length > 0 && (
            <div
              className={`mb-6 rounded-2xl border-2 ${colors.border} ${colors.bg} p-4`}
            >
              {/* Header rekomendasi */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`w-10 h-10 ${colors.accent} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}
                >
                  <span className="text-xl">{varkEmoji[dominantNorm]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold text-sm ${colors.text}`}>
                      Direkomendasikan untuk Kamu
                    </h3>
                    <span
                      className={`text-xs text-white px-2 py-0.5 rounded-full ${colors.badge} font-medium`}
                    >
                      {varkLabel[dominantNorm]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Objek terbaik berdasarkan gaya belajar{" "}
                    {varkLabel[dominantNorm]} &{" "}
                    {durationLabel[durationCategory].toLowerCase()}
                  </p>
                </div>
              </div>

              {/* Daftar rekomendasi */}
              <div className="space-y-2">
                {rekomendasiAkhir.map((lecture, i) => (
                  <div
                    key={i}
                    onClick={() => setPlayerData(lecture)}
                    className={`flex items-center gap-3 p-3 rounded-xl bg-white cursor-pointer transition-all shadow-sm border ${
                      playerData?.lectureId === lecture.lectureId
                        ? `border-2 ${colors.border} shadow-md`
                        : "border-gray-100 hover:shadow-md hover:border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 ${colors.accent} rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-base">
                        {varkEmoji[normalizeVark(lecture.tags)]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {lecture.lectureTitle}
                      </p>
                      <p className="text-xs text-gray-400">
                        {humanizeDuration(lecture.lectureDuration * 60 * 1000, {
                          units: ["h", "m"],
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isCompleted(lecture.lectureId) && (
                        <span className="text-green-500 text-sm font-bold">
                          ✓
                        </span>
                      )}
                      <span
                        className={`text-xs text-white px-2 py-0.5 rounded-full ${colors.badge}`}
                      >
                        Rekomendasi
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pesan jika tidak ada dominant VARK */}
          {!dominantNorm && (
            <div className="mb-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-400">
                Selesaikan tes VARK untuk mendapatkan rekomendasi personal 🎯
              </p>
            </div>
          )}

          {/* ── Objek Pembelajaran Lainnya ── */}
          {lecturesLain.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 text-sm">
                  {dominantNorm
                    ? "Objek Pembelajaran Lainnya"
                    : "Semua Objek Pembelajaran"}
                </h3>
                {lecturesLain.length > 2 && (
                  <button
                    onClick={() => setShowAllLectures(!showAllLectures)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {showAllLectures
                      ? "Tampilkan lebih sedikit"
                      : `Lihat semua (${lecturesLain.length})`}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {(showAllLectures
                  ? lecturesLain
                  : lecturesLain.slice(0, 2)
                ).map((lecture, i) => (
                  <div
                    key={i}
                    onClick={() => setPlayerData(lecture)}
                    className={`flex items-center gap-3 p-3 rounded-xl border bg-white cursor-pointer transition-all ${
                      playerData?.lectureId === lecture.lectureId
                        ? "border-gray-400 shadow-sm"
                        : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-base">
                        {varkEmoji[normalizeVark(lecture.tags)] || "📚"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {lecture.lectureTitle}
                      </p>
                      <p className="text-xs text-gray-400">
                        {varkLabel[normalizeVark(lecture.tags)]} ·{" "}
                        {humanizeDuration(lecture.lectureDuration * 60 * 1000, {
                          units: ["h", "m"],
                        })}
                      </p>
                    </div>
                    {isCompleted(lecture.lectureId) && (
                      <span className="text-green-500 text-sm font-bold flex-shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Player;
