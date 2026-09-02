import React, { useContext, useEffect, useState, useRef } from "react";
import { AppContext } from "../../context/AppContext";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
// import humanizeDuration from "humanize-duration";
import YouTube from "react-youtube";
import Footer from "../../components/student/Footer";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";
import { renderAsync } from "docx-preview";

const HYBRID_WEIGHT = {
  vark: 0.7,
  instructional: 0.3,
};

const MAIN_LECTURE_IDS_BY_CHAPTER = {
  pertemuan1: ["op1.1", "op1.2"],
  pertemuan2: ["op2.1", "op2.2"],
  pertemuan3: ["op3.29", "op3.30", "op3.31"],
  pertemuan4: ["op4.25", "op4.24"],
  pertemuan5: ["op5.25", "op5.24"],
  pertemuan6: ["op6.25", "op6.24"],
  pertemuan7: ["op7.22", "op7.21"],
};

const RECOMMENDATION_LIMIT = 4;
const COMPLETION_READING_RATIO = 0.5;

const MENTAL_REFERENCE_VALUE = 84;
// Cosine similarity VARK antara profil pengguna dan objek pembelajaran
const cosineSimilarity = (userVector, objectVector) => {
  if (!userVector || !objectVector) return 0;

  const keys = ["V", "A", "R", "K"];

  const user = keys.map((key) => Number(userVector[key] || 0));
  const object = keys.map((key) => Number(objectVector[key] || 0));

  const dot = user.reduce(
    (sum, value, index) => sum + value * object[index],
    0,
  );

  const userNorm = Math.sqrt(user.reduce((sum, value) => sum + value ** 2, 0));

  const objectNorm = Math.sqrt(
    object.reduce((sum, value) => sum + value ** 2, 0),
  );

  if (userNorm === 0 || objectNorm === 0) return 0;

  return dot / (userNorm * objectNorm);
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
// const varkLabel = {
//   V: "Visual",
//   A: "Auditory",
//   R: "Read/Write",
//   K: "Kinesthetic",
// };
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

const getYouTubeId = (url) => {
  try {
    if (!url) return null;

    if (url.includes("youtu.be/")) {
      return url.split("youtu.be/")[1]?.split(/[?&]/)[0] || null;
    }

    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtube.com")) {
      return (
        parsedUrl.searchParams.get("v") ||
        parsedUrl.pathname.split("/").filter(Boolean).pop() ||
        null
      );
    }
  } catch {
    return null;
  }

  return null;
};

const getLectureType = (lecture) => {
  const url = String(lecture?.lectureUrl || "").toLowerCase();

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return { label: "Video", icon: "▶️" };
  }
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)) {
    return { label: "Audio", icon: "🎧" };
  }
  if (/\.pdf(\?|$)/i.test(url)) {
    return { label: "PDF", icon: "📕" };
  }
  if (/\.docx?(\?|$)/i.test(url)) {
    return { label: "Dokumen", icon: "📘" };
  }
  if (/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url)) {
    return { label: "Video", icon: "🎬" };
  }
  if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) {
    return { label: "Gambar", icon: "🖼️" };
  }
  if (/\.html?(\?|$)/i.test(url) || url.includes("/raw/upload/")) {
    return { label: "Interaktif", icon: "🧩" };
  }

  return { label: "Materi", icon: "📚" };
};

const getCloudinaryPdfThumbnail = (url) => {
  const value = String(url || "");

  if (
    !value.includes("res.cloudinary.com") ||
    !value.includes("/image/upload/") ||
    !/\.pdf(?:[?#].*)?$/i.test(value)
  ) {
    return null;
  }

  const [beforeUpload, afterUpload] = value.split("/image/upload/");

  if (!beforeUpload || !afterUpload) return null;

  const cleanAssetPath = afterUpload
    .split("#")[0]
    .split("?")[0]
    .replace(/\.pdf$/i, ".jpg");

  return `${beforeUpload}/image/upload/pg_1,w_900,c_limit,q_auto,f_jpg/${cleanAssetPath}`;
};

const buildGoogleDocumentPreviewUrl = (url) =>
  `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;

const getPreviewVideoUrl = (url) => {
  const value = String(url || "");

  if (value.includes("cloudinary.com") && value.includes("/image/upload/")) {
    return value.replace("/image/upload/", "/video/upload/");
  }

  return value;
};

const PreviewFallback = ({ type, message = "Pratinjau tidak tersedia" }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-200 px-4 text-center">
    <span className="text-5xl">{type.icon}</span>
    <p className="text-xs font-medium text-gray-500">{message}</p>
  </div>
);

const PreviewImage = ({ src, alt, type }) => {
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <PreviewFallback type={type} message="Gambar pratinjau gagal dimuat" />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

const DocxCardPreview = ({ url, title, type }) => {
  const viewportRef = React.useRef(null);
  const bodyRef = React.useRef(null);
  const styleRef = React.useRef(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [status, setStatus] = React.useState("idle");

  // DOCX cukup dimuat ketika kartunya mendekati area layar.
  React.useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return undefined;

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "250px",
        threshold: 0.01,
      },
    );

    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!shouldLoad || !url) return undefined;

    const controller = new AbortController();
    let disposed = false;

    const renderDocument = async () => {
      setStatus("loading");

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const documentBlob = await response.blob();

        if (
          disposed ||
          !bodyRef.current ||
          !styleRef.current ||
          !viewportRef.current
        ) {
          return;
        }

        bodyRef.current.innerHTML = "";
        styleRef.current.innerHTML = "";

        await renderAsync(documentBlob, bodyRef.current, styleRef.current, {
          className: "docx-card",
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          ignoreFonts: true,
          renderHeaders: false,
          renderFooters: false,
          renderFootnotes: false,
          renderEndnotes: false,
          useBase64URL: true,
        });

        if (disposed || !bodyRef.current || !viewportRef.current) {
          return;
        }

        const pages = Array.from(bodyRef.current.querySelectorAll("section"));

        // Kartu hanya menampilkan halaman pertama.
        pages.slice(1).forEach((page) => {
          page.style.display = "none";
        });

        const firstPage = pages[0] || bodyRef.current.firstElementChild;

        if (firstPage) {
          firstPage.style.margin = "0";
          firstPage.style.boxShadow = "none";

          const pageWidth =
            firstPage.scrollWidth ||
            firstPage.getBoundingClientRect().width ||
            816;

          const viewportWidth = viewportRef.current.clientWidth || 320;

          const scale = Math.min(1, Math.max(0.2, viewportWidth / pageWidth));

          bodyRef.current.style.transformOrigin = "top left";
          bodyRef.current.style.transform = `scale(${scale})`;
          bodyRef.current.style.width = `${100 / scale}%`;
        }

        setStatus("success");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            `Gagal menampilkan preview DOCX "${title || ""}":`,
            error,
          );
          setStatus("error");
        }
      }
    };

    renderDocument();

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [shouldLoad, title, url]);

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden bg-white"
    >
      <div ref={styleRef} />

      {!shouldLoad || status === "idle" || status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <p className="text-xs font-medium text-gray-400">Memuat dokumen...</p>
        </div>
      ) : null}

      {status === "error" ? (
        <PreviewFallback type={type} message="Pratinjau DOCX gagal dimuat" />
      ) : null}

      <div
        ref={bodyRef}
        className={
          status === "success"
            ? "pointer-events-none block bg-white"
            : "pointer-events-none invisible"
        }
      />
    </div>
  );
};

const addBaseUrlToHtml = (html, sourceUrl) => {
  try {
    const baseUrl = new URL(".", sourceUrl).href;
    const baseTag = `<base href="${baseUrl}" />`;

    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    }

    return `<!doctype html>
      <html>
        <head>${baseTag}</head>
        <body>${html}</body>
      </html>`;
  } catch {
    return html;
  }
};

const HtmlCardPreview = ({ url, title, type }) => {
  const [htmlContent, setHtmlContent] = React.useState("");
  const [status, setStatus] = React.useState("loading");

  React.useEffect(() => {
    const controller = new AbortController();

    setStatus("loading");
    setHtmlContent("");

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.text();
      })
      .then((html) => {
        setHtmlContent(addBaseUrlToHtml(html, url));
        setStatus("success");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Gagal memuat preview HTML:", error);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [url]);

  if (status === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50">
        <p className="text-xs font-medium text-gray-400">Memuat pratinjau...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <PreviewFallback
        type={type}
        message="Pratinjau interaktif gagal dimuat"
      />
    );
  }

  return (
    <iframe
      srcDoc={htmlContent}
      title={`Pratinjau interaktif ${title || ""}`}
      className="h-full w-full border-0 pointer-events-none bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
};

const LecturePreview = ({ lecture, showVarkBadge = true }) => {
  const url = String(lecture?.lectureUrl || "");
  const type = getLectureType(lecture);
  const youtubeId = getYouTubeId(url);
  const pdfThumbnail = getCloudinaryPdfThumbnail(url);

  const isPdf = /\.pdf(?:[?#].*)?$/i.test(url);
  const isDocument = /\.docx?(?:[?#].*)?$/i.test(url);

  const isImage = /\.(png|jpe?g|webp|gif|svg)(?:[?#].*)?$/i.test(url) && !isPdf;

  const isAudio =
    /\.(mp3|wav|ogg|m4a)(?:[?#].*)?$/i.test(url) ||
    (url.includes("/video/upload/") && normalizeVark(lecture?.tags) === "A");

  const isVideo =
    Boolean(youtubeId) ||
    /\.(mp4|webm|mov|avi|mkv)(?:[?#].*)?$/i.test(url) ||
    (url.includes("/video/upload/") && !isAudio);

  const isHtml =
    /\.html?(?:[?#].*)?$/i.test(url) ||
    (url.includes("/raw/upload/") && !isDocument && !isAudio);

  const previewBody = (() => {
    if (!url) {
      return <PreviewFallback type={type} message="Konten belum tersedia" />;
    }

    if (youtubeId) {
      return (
        <PreviewImage
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt={`Pratinjau ${lecture?.lectureTitle || "video"}`}
          type={type}
        />
      );
    }

    if (isPdf && pdfThumbnail) {
      return (
        <PreviewImage
          src={pdfThumbnail}
          alt={`Halaman pertama ${lecture?.lectureTitle || "PDF"}`}
          type={type}
        />
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={buildGoogleDocumentPreviewUrl(url)}
          title={`Pratinjau PDF ${lecture?.lectureTitle || ""}`}
          className="h-full w-full border-0 pointer-events-none bg-white"
          loading="lazy"
        />
      );
    }

    if (isDocument) {
      return (
        <DocxCardPreview url={url} title={lecture?.lectureTitle} type={type} />
      );
    }

    if (isImage) {
      return (
        <PreviewImage
          src={url}
          alt={`Pratinjau ${lecture?.lectureTitle || "gambar"}`}
          type={type}
        />
      );
    }

    if (isAudio) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-amber-50 to-orange-100 px-5 text-center">
          <span className="text-5xl">🎧</span>

          <p className="text-xs font-semibold text-gray-700">
            Audio pembelajaran
          </p>

          <p className="text-[11px] text-gray-500">Buka untuk mendengarkan</p>
        </div>
      );
    }

    if (isVideo) {
      return (
        <video
          src={getPreviewVideoUrl(url)}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover pointer-events-none bg-black"
          onLoadedMetadata={(event) => {
            try {
              const video = event.currentTarget;
              video.currentTime = Math.min(
                1,
                Math.max(0, (video.duration || 1) * 0.05),
              );
            } catch {
              // Browser tertentu tidak mengizinkan seek otomatis.
            }
          }}
        />
      );
    }

    if (isHtml) {
      return (
        <HtmlCardPreview url={url} title={lecture?.lectureTitle} type={type} />
      );
    }

    return (
      <PreviewFallback
        type={type}
        message="Format tidak mendukung pratinjau langsung"
      />
    );
  })();

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-gray-200 bg-white">
      {previewBody}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-3 pt-8">
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-700 backdrop-blur-sm">
          {type.icon} {type.label}
        </span>

        {/* {showVarkBadge && (
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {"Umum"}
          </span>
        )} */}
      </div>
    </div>
  );
};

const LectureCard = ({
  lecture,
  onReview,
  isActive,
  isCompleted,
  recommendationEnabled,
  isRecommended = false,
  rank = null,
}) => {
  const modality = normalizeVark(lecture?.tags);
  const lectureType = getLectureType(lecture);
  const headerIcon = lectureType.icon;

  const hybridScore = Number(lecture?._hybridPercentage);
  const hasHybridScore = recommendationEnabled && Number.isFinite(hybridScore);

  return (
    <article
      onClick={() => onReview(lecture)}
      className={`group cursor-pointer rounded-2xl border p-3 transition-all duration-200 ${
        isActive
          ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-100"
          : isRecommended
            ? "border-blue-200 bg-slate-100 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            : "border-gray-200 bg-slate-100 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-2 px-1 pb-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
          <span className="text-base">{headerIcon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-gray-800"
            title={lecture?.lectureTitle}
          >
            {lecture?.lectureTitle}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">Objek pembelajaran</p>
        </div>

        {isRecommended && (
          <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">
            #{rank}
          </span>
        )}
      </div>

      <LecturePreview lecture={lecture} showVarkBadge={recommendationEnabled} />

      <div className="flex items-center justify-between gap-3 px-1 pt-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReview(lecture);
          }}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-blue-600 hover:text-white hover:ring-blue-600"
        >
          Buka
        </button>

        <div className="flex min-w-0 items-center gap-2">
          {/* {hasHybridScore && (
            <span className="truncate rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              {hybridScore.toFixed(2)}%
            </span>
          )} */}

          {isCompleted && (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
              ✓ Selesai
            </span>
          )}
        </div>
      </div>
    </article>
  );
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

const getInstructionalProfile = (mentalKepribadian) => {
  const score = Number(mentalKepribadian);

  if (!Number.isFinite(score)) return null;

  return {
    contentGranularity: score >= MENTAL_REFERENCE_VALUE ? "macro" : "micro",

    cognitiveLevel: score >= MENTAL_REFERENCE_VALUE ? "C4-C6" : "C1-C3",
  };
};

const getInstructionalCompatibility = (lecture, profile) => {
  if (!lecture || !profile) return 0;
  const modality = normalizeVark(lecture.tags);
  // Kinestetik menggunakan cognitiveLevel
  if (modality === "K") {
    return lecture.cognitiveLevel === profile.cognitiveLevel ? 1 : 0;
  }

  // Visual, Auditory, Read/Write menggunakan micro/macro
  if (["V", "A", "R"].includes(modality)) {
    return lecture.contentGranularity === profile.contentGranularity ? 1 : 0;
  }
  return 0;
};

const Player = () => {
  const [adaptiveVarkVector, setAdaptiveVarkVector] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const {
    enrolledCourses,
    calculateChapterTime,
    backendUrl,
    getToken,
    userData,
    fetUserEnrolledCourses,
  } = useContext(AppContext);

  const userClass = String(userData?.kelas || "")
    .trim()
    .toUpperCase();

  const recommendationEnabled = userClass === "G2";

  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sesiParam = parseInt(searchParams.get("sesi"), 10);
  const [courseData, setCourseData] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(
    Number.isInteger(sesiParam) && sesiParam >= 0 ? sesiParam : 0,
  );
  useEffect(() => {
    if (courseData && selectedChapter >= courseData.courseContent.length) {
      setSelectedChapter(0);
    }
  }, [courseData]);
  const [playerData, setPlayerData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [showAllLectures, setShowAllLectures] = useState(false);

  // Pencatatan durasi aktif pada objek pembelajaran
  const activeStartRef = useRef(null);
  const accumulatedActiveMsRef = useRef(0);
  const isSavingDurationRef = useRef(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const lastOpenedLectureRef = useRef(null);
  const mainLectureSliderRef = useRef(null);
  const playerSectionRef = useRef(null);
  const [playerScrollRequest, setPlayerScrollRequest] = useState(0);
  const [assignments, setAssignments] = useState([]);

  const [loadingAssignments, setLoadingAssignments] = useState(true);

  const handleOpenLecture = (lecture) => {
    setPlayerData(lecture);
    setPlayerScrollRequest((previous) => previous + 1);
  };

  useEffect(() => {
    if (!playerData || !playerSectionRef.current) return undefined;

    const timeoutId = window.setTimeout(() => {
      const playerElement = playerSectionRef.current;

      if (!playerElement) return;

      playerElement.focus({ preventScroll: true });
      playerElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
    return () => window.clearTimeout(timeoutId);
  }, [playerData, playerScrollRequest]);

  useEffect(() => {
    const fetchAdaptiveVark = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get(
          backendUrl + "/api/user/adaptive-vark",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (data.success) {
          setAdaptiveVarkVector(data.adaptiveScores);
        }
      } catch (error) {
        console.error("Gagal memuat profil VARK adaptif:", error);
      }
    };
    fetchAdaptiveVark();
  }, []);

  const scrollMainLectures = (direction) => {
    const slider = mainLectureSliderRef.current;

    if (!slider) return;

    const distance = Math.max(280, slider.clientWidth * 0.85);

    slider.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  };

  // Profil VARK pengguna digunakan sebagai vektor, bukan dominant tunggal
  const userVarkVector =
    adaptiveVarkVector || userData?.varkResult?.scores || null;
  const userInstructionalProfile = getInstructionalProfile(
    userData?.mentalKepribadian,
  );
  const dominantSet = userVarkVector
    ? Object.entries(userVarkVector)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([key]) => key)
    : [];

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

  useEffect(() => {
    const handleSidebarShortcut = (event) => {
      const activeElement = document.activeElement;
      const activeTag = activeElement?.tagName;

      const isTyping =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeElement?.isContentEditable;

      if (isTyping) return;

      const isToggleShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b";

      if (!isToggleShortcut) return;

      event.preventDefault();
      setIsSidebarOpen((previous) => !previous);
    };

    window.addEventListener("keydown", handleSidebarShortcut);

    return () => {
      window.removeEventListener("keydown", handleSidebarShortcut);
    };
  }, []);

  const getCurrentSessionSeconds = () => {
    let totalMs = accumulatedActiveMsRef.current;

    if (activeStartRef.current) {
      totalMs += Date.now() - activeStartRef.current;
    }

    return Math.max(0, Math.floor(totalMs / 1000));
  };

  const toggleLectureCompleted = async (lectureId) => {
    try {
      const token = await getToken();
      const wasCompleted = isCompleted(lectureId);

      /*
       * Lecture yang belum selesai hanya boleh diselesaikan setelah
       * praja menghabiskan minimal 50% dari lectureDuration.
       * Lecture yang sudah selesai tetap dapat dibatalkan.
       */
      if (!wasCompleted) {
        const fullDurationSeconds =
          Number(playerData?.lectureDuration || 0) * 60;
        const requiredDurationSeconds = Math.ceil(
          fullDurationSeconds * COMPLETION_READING_RATIO,
        );

        const savedDuration = getSavedReadingSeconds(lectureId);
        const currentSessionDuration = getCurrentSessionSeconds();
        const totalDuration = savedDuration + currentSessionDuration;

        if (totalDuration < requiredDurationSeconds) {
          const remaining = requiredDurationSeconds - totalDuration;

          toast.error(
            `Waktu membaca belum mencapai minimal 50%. Sisa ${remaining} detik.`,
          );
          return;
        }

        /*
         * Simpan durasi sesi aktif terlebih dahulu agar backend menerima
         * totalDuration terbaru sebelum progress ditandai selesai.
         */
        if (currentSessionDuration > 0) {
          const activitySaved = await trackActivityDuration(
            lectureId,
            currentSessionDuration,
          );

          if (!activitySaved) {
            toast.error("Gagal menyimpan waktu membaca");
            return;
          }

          // Mulai segmen baru supaya durasi yang sama tidak dihitung dua kali.
          accumulatedActiveMsRef.current = 0;
          activeStartRef.current =
            document.visibilityState === "visible" ? Date.now() : null;
          setElapsedSeconds(0);
        }
      }

      const { data } = await axios.post(
        backendUrl + "/api/user/update-course-progress",
        {
          courseId,
          lectureId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        toast.success(
          wasCompleted ? "Ditandai belum selesai" : "Ditandai selesai",
        );

        await getCourseProgress();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const flushActivityDuration = async (lectureId, resumeTimer = false) => {
    if (!lectureId) return false;

    // Jangan kirim dua request penyimpanan bersamaan
    if (isSavingDurationRef.current) {
      return false;
    }

    const now = Date.now();

    let totalMs = accumulatedActiveMsRef.current;

    // Tambahkan waktu segmen yang sedang aktif
    if (activeStartRef.current) {
      totalMs += now - activeStartRef.current;
    }

    const durationSeconds = Math.floor(totalMs / 1000);

    // Simpan sisa milidetik yang belum genap 1 detik
    const remainingMs = totalMs - durationSeconds * 1000;

    /*
     * Reset waktu yang akan dikirim.
     *
     * Jika resumeTimer = true (autosave),
     * timer langsung dimulai kembali dari sekarang.
     */
    accumulatedActiveMsRef.current = remainingMs;

    activeStartRef.current =
      resumeTimer && document.visibilityState === "visible" ? now : null;

    setElapsedSeconds(Math.floor(remainingMs / 1000));

    if (durationSeconds <= 0) {
      return true;
    }

    isSavingDurationRef.current = true;

    try {
      const success = await trackActivityDuration(lectureId, durationSeconds);

      /*
       * Kalau request gagal, masukkan kembali
       * waktunya agar dicoba pada autosave berikutnya.
       */
      if (!success) {
        accumulatedActiveMsRef.current += durationSeconds * 1000;

        return false;
      }

      console.log("Durasi di-flush:", {
        lectureId,
        durationSeconds,
      });

      return true;
    } finally {
      isSavingDurationRef.current = false;
    }
  };

  const trackLectureOpen = async (lectureId) => {
    if (!lectureId) return;

    try {
      const token = await getToken();

      const { data } = await axios.post(
        backendUrl + "/api/user/track-activity",
        {
          courseId,
          lectureId,
          eventType: "open",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("OBPEM dibuka:", {
        lectureId,
        response: data,
      });
    } catch (error) {
      console.error(
        "Gagal mencatat akses:",
        error.response?.data || error.message,
      );
    }
  };

  const trackActivityDuration = async (lectureId, duration) => {
    if (!lectureId || duration <= 0) {
      return false;
    }

    try {
      const token = await getToken();

      const { data } = await axios.post(
        backendUrl + "/api/user/track-activity",
        {
          courseId,
          lectureId,
          duration,
          eventType: "duration",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!data.success) {
        console.error("Backend gagal menyimpan durasi:", data.message);

        return false;
      }

      // Update activityData lokal agar progress 50%
      // langsung mengikuti hasil autosave.
      setActivityData((previous) => {
        const existing = previous.find((item) => item.lectureId === lectureId);

        if (!existing) {
          return [
            ...previous,
            {
              lectureId,
              totalDuration: duration,
            },
          ];
        }

        return previous.map((item) =>
          item.lectureId === lectureId
            ? {
                ...item,
                totalDuration: Number(item.totalDuration || 0) + duration,
              }
            : item,
        );
      });

      console.log("Durasi tersimpan:", {
        lectureId,
        duration,
      });

      return true;
    } catch (error) {
      console.error(
        "Gagal menyimpan durasi:",
        error.response?.data || error.message,
      );

      return false;
    }
  };

  const getAssignments = async () => {
    try {
      setLoadingAssignments(true);

      const token = await getToken();

      const { data } = await axios.get(
        `${backendUrl}/api/assignment/course/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error(
        "Gagal mengambil tugas:",
        error.response?.data || error.message,
      );
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (!courseId) return;

    getAssignments();
  }, [courseId]);

  // ======================================================
  // 1. MENCATAT OBPEM DIBUKA + MEMULAI SESI DURASI
  // ======================================================
  useEffect(() => {
    const lectureId = playerData?.lectureId;

    if (!lectureId) return;

    // --------------------------------------
    // Catat ACCESS hanya ketika OBPEM berubah
    // --------------------------------------
    if (lastOpenedLectureRef.current !== lectureId) {
      trackLectureOpen(lectureId);

      lastOpenedLectureRef.current = lectureId;
    }

    // --------------------------------------
    // Mulai sesi durasi baru
    // --------------------------------------
    accumulatedActiveMsRef.current = 0;

    activeStartRef.current =
      document.visibilityState === "visible" ? Date.now() : null;

    console.log("Mulai sesi OBPEM:", {
      lectureId,
      accessCount: "dibuka",
    });

    // --------------------------------------
    // Ketika pindah ke OBPEM lain / unmount
    // simpan sisa durasi aktif
    // --------------------------------------
    return () => {
      flushActivityDuration(lectureId);
    };
  }, [playerData?.lectureId]);

  // ======================================================
  // 2. PAUSE / RESUME DURASI BERDASARKAN VISIBILITY TAB
  // ======================================================
  useEffect(() => {
    const lectureId = playerData?.lectureId;

    if (!lectureId) return;

    const handleVisibilityChange = async () => {
      // --------------------------------------
      // User meninggalkan tab LMS
      // --------------------------------------
      if (document.visibilityState === "hidden") {
        // Simpan durasi yang sudah terkumpul
        await flushActivityDuration(lectureId);

        console.log("Tab hidden - durasi disimpan:", {
          lectureId,
        });

        return;
      }

      // --------------------------------------
      // User kembali ke tab LMS
      // --------------------------------------
      if (document.visibilityState === "visible") {
        // Mulai segmen waktu baru
        if (!activeStartRef.current) {
          activeStartRef.current = Date.now();
        }

        console.log("Tab visible - timer dilanjutkan:", {
          lectureId,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [playerData?.lectureId]);

  // ======================================================
  // 3. AUTOSAVE DURASI SETIAP 30 DETIK
  // ======================================================
  useEffect(() => {
    const lectureId = playerData?.lectureId;

    if (!lectureId) return undefined;

    const autoSaveInterval = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        activeStartRef.current &&
        !isSavingDurationRef.current
      ) {
        flushActivityDuration(
          lectureId,
          true, // save lalu timer lanjut
        );
      }
    }, 30000);

    return () => {
      window.clearInterval(autoSaveInterval);
    };
  }, [playerData?.lectureId]);
  // ======================================================
  // 4. UPDATE TIMER UI SETIAP DETIK
  // ======================================================
  useEffect(() => {
    if (!playerData?.lectureId) {
      setElapsedSeconds(0);
      return undefined;
    }

    const updateElapsedSeconds = () => {
      setElapsedSeconds(getCurrentSessionSeconds());
    };

    updateElapsedSeconds();

    const intervalId = window.setInterval(updateElapsedSeconds, 1000);

    return () => window.clearInterval(intervalId);
  }, [playerData?.lectureId]);

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
        setActivityData(data.activityData || []);
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
          <audio key={url} src={url} controls autoPlay className="w-full" />
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

  const currentAssignments = assignments.filter(
    (assignment) =>
      Number(assignment.pertemuan) === Number(currentChapter?.chapterOrder),
  );
  // const dominantLabelText = dominantSet.map((c) => varkLabel[c]).join(" / "); // "Visual / Auditory / Read/Write"
  const lectures = currentChapter?.chapterContent || [];

  const scoreLecture = (lecture) => {
    const varkSimilarity = cosineSimilarity(userVarkVector, lecture.varkvektor);

    const instructionalCompatibility = getInstructionalCompatibility(
      lecture,
      userInstructionalProfile,
    );

    const hybridScore =
      HYBRID_WEIGHT.vark * varkSimilarity +
      HYBRID_WEIGHT.instructional * instructionalCompatibility;

    return {
      varkSimilarity,

      instructionalCompatibility,

      hybridScore,

      varkPercentage: Number((varkSimilarity * 100).toFixed(2)),

      hybridPercentage: Number((hybridScore * 100).toFixed(2)),
    };
  };

  const lecturesWithIndex = lectures.map((lecture, index) => ({
    ...lecture,
    _sourceIndex: index,
  }));

  // ID materi utama untuk pertemuan yang sedang dipilih
  const mainLectureIds =
    MAIN_LECTURE_IDS_BY_CHAPTER[currentChapter?.chapterId] || [];

  // Ambil materi utama sesuai urutan ID pada konfigurasi.
  // Beberapa lectureId pada data muncul lebih dari sekali. Dalam kasus tersebut,
  // prioritaskan objek dengan lectureOrder terkecil agar materi dosen (urutan 1, 2,
  // dan seterusnya) yang dipilih, bukan objek turunan/rekomendasi dengan ID sama.
  const mainLectures = mainLectureIds
    .map((lectureId) => {
      const matchingLectures = lecturesWithIndex
        .filter((lecture) => lecture.lectureId === lectureId)
        .sort((a, b) => {
          const orderA = Number(a.lectureOrder);
          const orderB = Number(b.lectureOrder);
          const normalizedOrderA = Number.isFinite(orderA)
            ? orderA
            : Number.POSITIVE_INFINITY;
          const normalizedOrderB = Number.isFinite(orderB)
            ? orderB
            : Number.POSITIVE_INFINITY;

          if (normalizedOrderA !== normalizedOrderB) {
            return normalizedOrderA - normalizedOrderB;
          }

          return a._sourceIndex - b._sourceIndex;
        });

      return matchingLectures[0];
    })
    .filter(Boolean);

  // Gunakan sourceIndex agar identitas kartu konsisten.
  const mainLectureIndexes = new Set(
    mainLectures.map((lecture) => lecture._sourceIndex),
  );

  // Materi utama dosen tidak boleh masuk perhitungan rekomendasi.
  const recommendationCandidates = lecturesWithIndex.filter(
    (lecture) => !mainLectureIndexes.has(lecture._sourceIndex),
  );

  // Urutan netral berdasarkan lectureOrder.
  // Jika lectureOrder sama, gunakan urutan asli dalam array.
  const orderedLectures = [...lecturesWithIndex].sort((a, b) => {
    const orderA = Number(a.lectureOrder ?? a._sourceIndex);
    const orderB = Number(b.lectureOrder ?? b._sourceIndex);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a._sourceIndex - b._sourceIndex;
  });

  // Scoring hanya dilakukan untuk G2 dan hanya jika profil VARK tersedia.
  const scoredLectures =
    recommendationEnabled && userVarkVector
      ? recommendationCandidates
          .filter((lecture) => lecture.varkvektor)
          .map((lecture) => {
            const result = scoreLecture(lecture);

            return {
              ...lecture,
              _varkSimilarity: result.varkSimilarity,
              _instructionalCompatibility: result.instructionalCompatibility,
              _hybridScore: result.hybridScore,
              _hybridPercentage: result.hybridPercentage,
            };
          })
          .sort((a, b) => {
            if (b._hybridScore !== a._hybridScore) {
              return b._hybridScore - a._hybridScore;
            }

            return a._sourceIndex - b._sourceIndex;
          })
      : [];

  if (recommendationEnabled) {
    console.log(
      "Hybrid recommendation ranking:",
      scoredLectures.map((lecture) => ({
        title: lecture.lectureTitle,
        varkvektor: lecture.varkvektor,
        varkSimilarity: lecture._varkSimilarity,
        instructionalCompatibility: lecture._instructionalCompatibility,
        hybridScore: lecture._hybridScore,
        hybridPercentage: lecture._hybridPercentage,
      })),
    );
  }

  // Empat objek dengan hybrid score tertinggi hanya untuk G2.
  const rekomendasiAkhir = recommendationEnabled
    ? scoredLectures.slice(0, RECOMMENDATION_LIMIT).map((lecture, index) => ({
        ...lecture,
        rank: index + 1,
        similarityPercentage: Number(
          (lecture._varkSimilarity * 100).toFixed(2),
        ),
      }))
    : [];

  // Gunakan indeks sumber, bukan lectureId, karena data masih mungkin
  // mempunyai lectureId yang sama.
  const recommendedIndexes = new Set(
    rekomendasiAkhir.map((lecture) => lecture._sourceIndex),
  );

  // Gabungkan kembali metadata skor agar kartu G2 dapat menampilkan hybrid score.
  const scoredLectureByIndex = new Map(
    scoredLectures.map((lecture) => [lecture._sourceIndex, lecture]),
  );

  const orderedLecturesWithScore = orderedLectures.map(
    (lecture) => scoredLectureByIndex.get(lecture._sourceIndex) || lecture,
  );

  // G1: seluruh objek dalam urutan asli, tanpa scoring.
  // G2: objek rekomendasi dikeluarkan dari daftar objek lainnya.
  const lecturesLain = orderedLecturesWithScore.filter((lecture) => {
    const isMainLecture = mainLectureIndexes.has(lecture._sourceIndex);

    const isRecommendedLecture = recommendedIndexes.has(lecture._sourceIndex);

    // Materi utama selalu dikeluarkan dari daftar lainnya.
    if (isMainLecture) return false;

    // Untuk G2, rekomendasi juga dikeluarkan dari daftar lainnya.
    if (recommendationEnabled && isRecommendedLecture) return false;

    return true;
  });

  const colors =
    varkColor[normalizeVark(rekomendasiAkhir[0]?.tags)] || varkColor["V"];
  const isCompleted = (id) => progressData?.lectureCompleted?.includes(id);

  const displayedLectures = recommendationEnabled
    ? showAllLectures
      ? lecturesLain
      : lecturesLain.slice(0, 6)
    : lecturesLain;

  const isSameLecture = (lecture) => {
    if (!playerData || !lecture) return false;

    if (
      Number.isInteger(playerData._sourceIndex) &&
      Number.isInteger(lecture._sourceIndex)
    ) {
      return playerData._sourceIndex === lecture._sourceIndex;
    }

    return playerData.lectureId === lecture.lectureId;
  };

  const getSavedReadingSeconds = (lectureId) => {
    const activity = activityData?.find((item) => item.lectureId === lectureId);

    return Number(activity?.totalDuration || 0);
  };

  const fullReadingSeconds = playerData
    ? Number(playerData.lectureDuration || 0) * 60
    : 0;

  // Tombol selesai aktif setelah minimal 60% durasi objek terpenuhi.
  const requiredReadingSeconds = Math.ceil(
    fullReadingSeconds * COMPLETION_READING_RATIO,
  );

  const savedReadingSeconds = playerData
    ? getSavedReadingSeconds(playerData.lectureId)
    : 0;

  const totalReadingSeconds = savedReadingSeconds + elapsedSeconds;

  const remainingReadingSeconds = Math.max(
    0,
    requiredReadingSeconds - totalReadingSeconds,
  );

  const canCompleteLecture =
    !!playerData &&
    (isCompleted(playerData.lectureId) ||
      totalReadingSeconds >= requiredReadingSeconds);

  const formatRemainingTime = (seconds) => {
    const totalSeconds = Math.max(0, Math.ceil(seconds));

    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    if (minutes > 0 && secs > 0) {
      return `${minutes} menit ${secs} detik`;
    }

    if (minutes > 0) {
      return `${minutes} menit`;
    }

    return `${secs} detik`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex flex-col md:flex-row flex-grow">
        {/* ── Sidebar Kiri ── */}
        <aside
          aria-hidden={!isSidebarOpen}
          className={`flex-shrink-0 overflow-hidden bg-white transition-[width,opacity] duration-300 ease-in-out md:sticky md:top-14 md:self-start md:h-[calc(100vh-3.5rem)] ${
            isSidebarOpen
              ? "block w-full border-r border-gray-200 opacity-100 shadow-sm md:w-72"
              : "hidden w-0 border-r-0 opacity-0 md:block md:w-0 md:pointer-events-none"
          }`}
        >
          <div className="w-full md:w-72">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-800">
                  Daftar Pertemuan
                </h2>

                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {courseData.courseTitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="Sembunyikan sidebar (Ctrl+B)"
                aria-label="Sembunyikan sidebar"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                  <path d="m16 9-3 3 3 3" />
                </svg>
              </button>
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

                    if (window.matchMedia("(max-width: 767px)").matches) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-blue-50 transition-all ${
                    selectedChapter === index
                      ? "bg-blue-50 border-l-4 border-l-blue-600"
                      : ""
                  }`}
                >
                  <p className="text-xs text-gray-400 mb-0.5">
                    Pertemuan Minggu {chapter.chapterOrder}
                  </p>
                  <p
                    className={`text-sm font-medium ${selectedChapter === index ? "text-blue-700" : "text-gray-700"}`}
                  >
                    {chapter.chapterTitle.replace(
                      `${chapter.chapterTitle} - `,
                      "",
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400">
                      {chapter.chapterContent.length} Objek Pembelajaran
                    </p>
                    {/* Durasi sengaja tidak ditampilkan di sidebar. */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Konten Utama ── */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-8">
          <button
            type="button"
            onClick={() => navigate(`/course/${courseId}`)}
            className="mb-5 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Kembali ke Kelas
          </button>
          {/* Header Pertemuan */}
          <div className="mb-6 flex items-start gap-3">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                title="Tampilkan sidebar (Ctrl+B)"
                aria-label="Tampilkan sidebar"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                  <path d="m14 9 3 3-3 3" />
                </svg>
              </button>
            )}

            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-800">
                {currentChapter?.chapterTitle.replace(
                  `Pertemuan ${currentChapter?.chapterOrder} - `,
                  "",
                )}
              </h1>

              <p className="mt-1 text-sm text-gray-400">
                {currentChapter?.chapterContent.length} objek pembelajaran
              </p>
            </div>
          </div>

          {/* Player */}
          {playerData && (
            <div
              ref={playerSectionRef}
              tabIndex={-1}
              className="scroll-mt-20 mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden outline-none"
            >
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
                    <p className="text-xs text-gray-400">Objek Pembelajaran</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {/* Informasi waktu belajar minimal */}
                  {!isCompleted(playerData.lectureId) && (
                    <p
                      className={`text-[11px] font-medium ${
                        canCompleteLecture ? "text-green-600" : "text-amber-600"
                      }`}
                    >
                      {canCompleteLecture
                        ? "✓ Waktu baca minimal terpenuhi"
                        : `Waktu baca minimal • Sisa ${formatRemainingTime(
                            remainingReadingSeconds,
                          )}`}
                    </p>
                  )}

                  <button
                    onClick={() => toggleLectureCompleted(playerData.lectureId)}
                    disabled={!canCompleteLecture}
                    title={
                      isCompleted(playerData.lectureId)
                        ? "Klik untuk membatalkan"
                        : canCompleteLecture
                          ? "Tandai sebagai selesai"
                          : `Waktu belajar minimal belum terpenuhi. Sisa ${formatRemainingTime(
                              remainingReadingSeconds,
                            )}`
                    }
                    className={`group px-4 py-2 rounded-full text-sm font-medium transition-all select-none ${
                      isCompleted(playerData.lectureId)
                        ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600 border border-green-200 hover:border-red-200"
                        : canCompleteLecture
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isCompleted(playerData.lectureId) ? (
                      <>
                        <span className="group-hover:hidden">✓ Selesai</span>

                        <span className="hidden group-hover:inline">
                          ✕ Batalkan
                        </span>
                      </>
                    ) : canCompleteLecture ? (
                      "Tandai Selesai"
                    ) : (
                      "Belum dapat diselesaikan"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Materi Utama dari Dosen ── */}
          {mainLectures.length > 0 && (
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Materi Utama dari Dosen
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Pelajari materi utama berikut sebelum membuka rekomendasi
                    objek pembelajaran.
                  </p>
                </div>

                {mainLectures.length > 2 && (
                  <div className="flex flex-shrink-0 items-center gap-2 xl:hidden">
                    <button
                      type="button"
                      onClick={() => scrollMainLectures("previous")}
                      aria-label="Geser materi utama ke kiri"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollMainLectures("next")}
                      aria-label="Geser materi utama ke kanan"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>

              <div
                ref={mainLectureSliderRef}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {mainLectures.map((lecture) => (
                  <div
                    key={`main-${lecture._sourceIndex}`}
                    className={`flex-none snap-start ${
                      mainLectures.length >= 3
                        ? "w-[88%] sm:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)]"
                        : "w-[88%] sm:w-[calc((100%-1rem)/2)]"
                    }`}
                  >
                    <LectureCard
                      lecture={lecture}
                      onReview={handleOpenLecture}
                      isActive={isSameLecture(lecture)}
                      isCompleted={isCompleted(lecture.lectureId)}
                      recommendationEnabled={false}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Rekomendasi Objek Pembelajaran ── */}
          {recommendationEnabled && rekomendasiAkhir.length > 0 && (
            <div
              className={`mb-6 rounded-2xl border-2 ${colors.border} ${colors.bg} p-4`}
            >
              {/* Header rekomendasi */}
              <div className="flex items-start gap-3 mb-4">
                {/* <div
                  className={`w-10 h-10 ${colors.accent} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}
                >
                  <span className="text-xl">
                    {varkEmoji[dominantSet[0] || "V"]}
                  </span>
                </div> */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold text-sm ${colors.text}`}>
                      Direkomendasikan untuk Kamu
                    </h3>
                    {/* <span
                      className={`text-xs text-white px-2 py-0.5 rounded-full ${colors.badge} font-medium`}
                    >
                      {varkLabel[dominantSet[0] || "V"]}
                    </span> */}
                  </div>
                  {/* <p className="text-xs text-gray-500 mt-0.5">
                    Top-3 objek pembelajaran dengan kecocokan VARK tertinggi
                    berdasarkan cosine similarity
                  </p> */}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {rekomendasiAkhir.map((lecture) => (
                  <LectureCard
                    key={`recommended-${lecture._sourceIndex}`}
                    lecture={lecture}
                    onReview={handleOpenLecture}
                    isActive={isSameLecture(lecture)}
                    isCompleted={isCompleted(lecture.lectureId)}
                    recommendationEnabled={recommendationEnabled}
                    isRecommended
                    rank={lecture.rank}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pesan jika tidak ada dominant VARK */}
          {recommendationEnabled && !userVarkVector && (
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
                  {recommendationEnabled
                    ? "Objek Pembelajaran Lainnya"
                    : "Semua Objek Pembelajaran"}
                </h3>
                {recommendationEnabled && lecturesLain.length > 6 && (
                  <button
                    onClick={() => setShowAllLectures(!showAllLectures)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    {showAllLectures
                      ? "Tampilkan lebih sedikit"
                      : `Lihat semua (${lecturesLain.length})`}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {displayedLectures.map((lecture) => (
                  <LectureCard
                    key={`lecture-${lecture._sourceIndex}`}
                    lecture={lecture}
                    onReview={handleOpenLecture}
                    isActive={isSameLecture(lecture)}
                    isCompleted={isCompleted(lecture.lectureId)}
                    recommendationEnabled={recommendationEnabled}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Player;
