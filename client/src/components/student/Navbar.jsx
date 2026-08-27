import React, { useContext, useState, useRef, useEffect, useMemo } from "react";
import { assets } from "../../assets/assets";
import { Link, useLocation } from "react-router-dom";
import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

/* Ikon inline (proyek tidak memakai library ikon) */
const Ico = {
  home: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  news: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8L2 8v12a2 2 0 0 0 2 2z" />
      <path d="M14 2v6h6M11 13h6M11 17h4" />
    </svg>
  ),
  chat: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  compass: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  help: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  bell: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  calendar: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  spark: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17l-1.9-5.1L4.5 10l5.6-1.4z" />
    </svg>
  ),
  info: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  chevD: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  grid: (p) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
};

/* ============================================================
   Logika jadwal hari ini (selaras dengan kalender)
   ============================================================ */
const DAYS_ID = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];
const SEMESTER_START = new Date(2026, 7, 3); // samakan dengan Home.jsx
const WEEKS_BEFORE_BREAK = 8;
const BREAK_WEEKS = 1;
const WEEKS_AFTER_BREAK = 7;
const MS_DAY = 86400000;
const _mid = (y, m, d) => new Date(y, m, d).getTime();
const _weekIndex = (date) => {
  const diff = Math.floor(
    (_mid(date.getFullYear(), date.getMonth(), date.getDate()) -
      _mid(
        SEMESTER_START.getFullYear(),
        SEMESTER_START.getMonth(),
        SEMESTER_START.getDate(),
      )) /
      MS_DAY,
  );
  return diff < 0 ? -1 : Math.floor(diff / 7);
};
const isTeachingDate = (date) => {
  const w = _weekIndex(date);
  if (w < 0) return false;
  const s2 = WEEKS_BEFORE_BREAK + BREAK_WEEKS;
  return w < WEEKS_BEFORE_BREAK || (w >= s2 && w < s2 + WEEKS_AFTER_BREAK);
};
const dowOf = (date) => {
  const w = date.getDay();
  return w === 0 ? 6 : w - 1;
};

/* ============================================================
   Lonceng notifikasi — dropdown balon, badge, tandai dibaca
   ============================================================ */
const ICON_MAP = {
  spark: Ico.spark,
  calendar: Ico.calendar,
  info: Ico.info,
};
const ICON_STYLE = {
  spark: { bg: "#ede9fe", color: "#7c3aed" },
  calendar: { bg: "#dcfce7", color: "#16a34a" },
  info: { bg: "#dbeafe", color: "#2563eb" },
};

const NotificationBell = ({ enrolledCourses = [], userClass = "", }) => {
  const normalizedUserClass = String(userClass || "")
    .trim()
    .toUpperCase();

  const recommendationEnabled = normalizedUserClass === "G2";

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Notifikasi kelas hari ini dihitung dari jadwal asli + tanggal sekarang
  const kelasHariIni = useMemo(() => {
    const now = new Date();
    if (!isTeachingDate(now)) return []; // di luar minggu aktif / masa libur
    const namaHari = DAYS_ID[dowOf(now)];
    return (enrolledCourses || [])
      .filter((c) => c?.schedule?.day === namaHari)
      .map((c) => ({
        title: c.courseTitle,
        startTime: c?.schedule?.startTime,
        endTime: c?.schedule?.endTime,
      }))
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [enrolledCourses]);

  // Susun daftar notifikasi (statis + dinamis)
  const initialItems = useMemo(() => {
  const list = [];

  // Notifikasi rekomendasi hanya untuk Praja kelas G2
  if (recommendationEnabled) {
    list.push({
      id: "rec",
      type: "spark",
      title: "Rekomendasi tersedia",
      body: "Objek pembelajaran sesuai gaya belajarmu sudah bisa diakses.",
      time: "Baru saja",
      read: false,
    });
  }

  if (kelasHariIni.length > 0) {
    const ringkas = kelasHariIni
      .map(
        (k) =>
          `${k.title}${
            k.startTime
              ? ` (${k.startTime}${k.endTime ? `–${k.endTime}` : ""})`
              : ""
          }`,
      )
      .join(", ");

    list.push({
      id: "kelas-hari-ini",
      type: "calendar",
      title:
        kelasHariIni.length === 1
          ? "Kelas hari ini"
          : `${kelasHariIni.length} kelas hari ini`,
      body: ringkas,
      time: "Hari ini",
      read: false,
    });
  }

  list.push({
    id: "uts",
    type: "info",
    title: "Pengingat UTS",
    body: "Ujian Tengah Semester dijadwalkan minggu ke-8.",
    time: "Info",
    read: true,
  });

  return list;
}, [kelasHariIni, recommendationEnabled]);

  const [items, setItems] = useState(initialItems);
  // sinkronkan jika jadwal berubah
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  // tutup saat klik di luar
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id) =>
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

  return (
    <div className="relative" ref={ref}>
      {/* tombol lonceng */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifikasi"
        className="relative w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"
      >
        <Ico.bell width={18} height={18} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* balon dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-[70] text-gray-800 overflow-hidden">
          {/* ekor balon */}
          <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />

          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">Notifikasi</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-green-600 font-medium hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* daftar */}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-center py-10">
                <Ico.bell
                  width={32}
                  height={32}
                  className="mx-auto text-gray-300 mb-2"
                />
                <p className="text-xs text-gray-400">Belum ada notifikasi</p>
              </div>
            ) : (
              items.map((n) => {
                const IconComp = ICON_MAP[n.type] || Ico.info;
                const st = ICON_STYLE[n.type] || ICON_STYLE.info;
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors ${n.read ? "" : "bg-green-50/40"}`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: st.bg }}
                    >
                      <IconComp
                        width={16}
                        height={16}
                        style={{ color: st.color }}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-gray-900 leading-snug">
                        {n.title}
                      </span>
                      <span className="block text-[11px] text-gray-500 leading-snug mt-0.5">
                        {n.body}
                      </span>
                      <span className="block text-[10px] text-gray-400 mt-1">
                        {n.time}
                      </span>
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const { navigate, backendUrl, userData, enrolledCourses } =
    useContext(AppContext);
  const location = useLocation();
  const { openSignIn } = useClerk();
  const { user } = useUser();

  const [showDosenModal, setShowDosenModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingDosen, setLoadingDosen] = useState(false);

  const resetDosenForm = () => {
  setNip("");
  setPassword("");
  setConfirmPassword("");
  setAuthMode("login");
};

  const handleOpenDosenModal = (event) => {
    event.preventDefault();
    event.stopPropagation();

    console.log("OPEN MODAL LOGIN DOSEN");
    setShowDosenModal(true);
  };

  // Nama praja diambil dari database (Keprajaan.nama), bukan email
  const prajaName = userData?.namaKeprajaan || userData?.name || "Praja";

  const loginDosen = async () => {
  const nipDosen = nip.trim();

  if (!nipDosen || !password) {
    return toast.error("NIP dan password wajib diisi");
  }

  try {
    setLoadingDosen(true);

    const { data } = await axios.post(
      `${backendUrl}/api/educator/login`,
      {
        nip: nipDosen,
        password,
      },
    );

    if (!data.success) {
      return toast.error(data.message);
    }

    localStorage.setItem("dosenToken", data.token);
    localStorage.setItem("dosenNama", data.nama);

    setShowDosenModal(false);
    resetDosenForm();

    toast.success(`Selamat datang, ${data.nama}`);

    navigate("/educator/student-engagement");
  } catch (error) {
    const response = error.response?.data;

    if (response?.code === "PASSWORD_NOT_CREATED") {
      setAuthMode("activate");

      return toast.info(
        "Password belum dibuat. Silakan buat password terlebih dahulu.",
      );
    }

    toast.error(
      response?.message || "Login dosen gagal",
    );
  } finally {
    setLoadingDosen(false);
  }
};

  const createDosenPassword = async () => {
  const nipDosen = nip.trim();

  if (!nipDosen || !password || !confirmPassword) {
    return toast.error(
      "NIP, password, dan konfirmasi password wajib diisi",
    );
  }

  if (password.length < 8) {
    return toast.error(
      "Password minimal terdiri dari 8 karakter",
    );
  }

  if (password !== confirmPassword) {
    return toast.error(
      "Konfirmasi password tidak sama",
    );
  }

  try {
    setLoadingDosen(true);

    const { data } = await axios.post(
      `${backendUrl}/api/educator/activate-password`,
      {
        nip: nipDosen,
        password,
        confirmPassword,
      },
    );

    toast.success(data.message);

    // Kembali ke form login
    setAuthMode("login");
    setPassword("");
    setConfirmPassword("");
  } catch (error) {
    toast.error(
      error.response?.data?.message ||
        "Gagal membuat password",
    );
  } finally {
    setLoadingDosen(false);
  }
};

  // Item navigasi utama (ala Edlink)
  const navItems = [
    { label: "Beranda", icon: Ico.home, to: "/" },
    // { label: "Timeline & Berita", icon: Ico.news, to: "/timeline" },
    // { label: "Obrolan", icon: Ico.chat, to: "/", soon: true },
    // { label: "Jelajah", icon: Ico.compass, to: "/course-list" },
  ];

  const isActive = (item) => {
    if (item.soon) return false;
    if (item.to === "/") return location.pathname === "/";
    return location.pathname.startsWith(item.to);
  };

  const handleNav = (item, e) => {
    if (item.soon) {
      e.preventDefault();
      toast.info("Fitur segera hadir");
    }
  };

  return (
    <>
      <nav className="relative sticky top-0 z-[100] bg-green-600 text-white pointer-events-auto">
        <div className="flex items-center h-14 px-4 sm:px-6 lg:px-10 gap-2">
          {/* Logo + nama institusi */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer shrink-0 min-w-0"
          >
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={assets.logo}
                alt="IPDN"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-[13px] font-bold">Edlink</div>
              <div className="text-[10px] text-white/75 -mt-0.5 truncate">
                Institut Pemerintahan Dalam Negeri
              </div>
            </div>
          </div>

          {/* Menu tengah */}
          <div className="flex-1 hidden md:flex items-center justify-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={(e) => handleNav(item, e)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] transition-colors border-b-2 ${
                    active
                      ? "bg-white/15 border-white font-semibold"
                      : "border-transparent hover:bg-white/10"
                  }`}
                >
                  <item.icon width={15} height={15} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Sisi kanan */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto md:ml-0 shrink-0">
            {!user ? (
              <>
                {/* Belum login */}
                <button
                  type="button"
                  onClick={handleOpenDosenModal}
                  className="relative z-[100] pointer-events-auto cursor-pointer text-[12px] border border-white/50 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  Login sebagai Dosen
                </button>
                <button
                  onClick={() => openSignIn()}
                  className="bg-white text-green-700 text-[12px] font-semibold px-4 py-1.5 rounded-full hover:bg-green-50 transition-colors"
                >
                  Masuk sebagai Praja
                </button>
              </>
            ) : (
              <>
                {/* Ikon aksi */}
                <button
                  aria-label="Bantuan"
                  className="hidden sm:flex w-8 h-8 rounded-full hover:bg-white/10 items-center justify-center"
                >
                  <Ico.help width={18} height={18} />
                </button>
                <Link
                  to="/my-enrollments"
                  aria-label="Kelas Saya"
                  className="hidden sm:flex w-8 h-8 rounded-full hover:bg-white/10 items-center justify-center"
                >
                  <Ico.grid width={17} height={17} />
                </Link>

                {/* Notifikasi */}
                <NotificationBell enrolledCourses={enrolledCourses} userClass={userData?.kelas}/>

                {/* Profil: avatar Clerk + nama praja dari DB */}
                <div className="flex items-center gap-2 pl-1 sm:pl-2">
                  <div className="scale-90 sm:scale-100">
                    <UserButton
                      appearance={{
                        elements: {
                          userButtonAvatarBox: "w-8 h-8 ring-2 ring-white/40",
                        },
                      }}
                    />
                  </div>
                  <div className="leading-tight hidden sm:block max-w-[160px]">
                    <div className="text-[12px] font-semibold truncate">
                      {prajaName}
                    </div>
                    <div className="text-[10px] text-white/75 -mt-0.5">
                      Praja
                    </div>
                  </div>
                  <Ico.chevD
                    width={13}
                    height={13}
                    className="text-white/70 hidden sm:block"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

{/* Modal Login dan Aktivasi Dosen */}
{showDosenModal && (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
    onClick={() => {
      setShowDosenModal(false);
      resetDosenForm();
    }}
  >
    <div
      className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl"
      onClick={(event) => event.stopPropagation()}
    >
      <h2 className="mb-1 text-xl font-bold text-gray-800">
        {authMode === "login"
          ? "Login Dosen"
          : "Buat Password Dosen"}
      </h2>

      <p className="mb-5 text-sm text-gray-500">
        {authMode === "login"
          ? "Masukkan NIP dan password untuk mengakses dashboard."
          : "Masukkan NIP yang sudah terdaftar dan buat password baru."}
      </p>

      <label className="mb-1 block text-sm font-medium text-gray-700">
        NIP
      </label>

      <input
        type="text"
        value={nip}
        onChange={(event) => setNip(event.target.value)}
        placeholder="Masukkan NIP"
        autoComplete="username"
        maxLength={18}
        disabled={loadingDosen}
        className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-green-500 disabled:bg-gray-100"
      />

      <label className="mb-1 block text-sm font-medium text-gray-700">
        Password
      </label>

      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={
          authMode === "login"
            ? "Masukkan password"
            : "Buat password minimal 8 karakter"
        }
        autoComplete={
          authMode === "login"
            ? "current-password"
            : "new-password"
        }
        disabled={loadingDosen}
        className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-green-500 disabled:bg-gray-100"
      />

      {authMode === "activate" && (
        <>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Konfirmasi Password
          </label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !loadingDosen
              ) {
                createDosenPassword();
              }
            }}
            placeholder="Masukkan ulang password"
            autoComplete="new-password"
            disabled={loadingDosen}
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-green-500 disabled:bg-gray-100"
          />
        </>
      )}

      <button
        type="button"
        onClick={
          authMode === "login"
            ? loginDosen
            : createDosenPassword
        }
        disabled={loadingDosen}
        className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loadingDosen
          ? "Memproses..."
          : authMode === "login"
            ? "Masuk"
            : "Buat Password"}
      </button>

      <div className="mt-4 text-center">
        <button
          type="button"
          disabled={loadingDosen}
          onClick={() => {
            setAuthMode((currentMode) =>
              currentMode === "login"
                ? "activate"
                : "login",
            );

            setPassword("");
            setConfirmPassword("");
          }}
          className="text-sm font-medium text-green-600 hover:underline disabled:opacity-50"
        >
          {authMode === "login"
            ? "Belum punya password? Buat password"
            : "Sudah punya password? Kembali ke login"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setShowDosenModal(false);
          resetDosenForm();
        }}
        disabled={loadingDosen}
        className="mt-3 w-full rounded-lg border border-gray-300 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        Batal
      </button>
    </div>
  </div>
)}
    </>
  );
};

export default Navbar;
