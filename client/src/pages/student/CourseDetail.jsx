import React, { useState, useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";

const Ico = ({ name, size = 16, className = "", style = {} }) => (
  <i
    className={`ti ti-${name} ${className}`}
    aria-hidden="true"
    style={{ fontSize: size, ...style }}
  />
);

const MENU_ITEMS = [
  "Sesi Pembelajaran",
  "Tugas",
  "Kuis",
  "Pengajar & Peserta",
  "Kelompok",
];

const fmtTanggalJam = (val) => {
  const d = new Date(val);
  if (isNaN(d)) return val;
  const jam = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmtTanggal(d)}, ${jam}`; // fmtTanggal sudah didefinisikan utk sesi
};

const TugasCard = ({ t, onSubmit, submitting }) => {
  const [file, setFile] = useState(null);

  const deadline = t.deadline ? new Date(t.deadline) : null;

  const isClosed =
    deadline && !Number.isNaN(deadline.getTime()) && deadline < new Date();

  const handleUpload = () => {
    if (!file) return;

    onSubmit(t._id, file);
  };

  return (
    <article className="cd-tugas-card">
      <h3 className="cd-tugas-title">
        {t.title}

        <span className={`cd-tugas-badge ${isClosed ? "closed" : "open"}`}>
          {isClosed ? "Closed" : "Open"}
        </span>
      </h3>

      <p className="cd-tugas-sesi">Pertemuan {t.pertemuan}</p>

      {t.description && (
        <p
          style={{
            marginTop: 12,
            fontSize: 14,
            lineHeight: 1.6,
            color: "#616782",
          }}
        >
          {t.description}
        </p>
      )}

      {t.deadline && (
        <div
          style={{
            marginTop: 18,
          }}
        >
          <p className="cd-tugas-label">Batas waktu penyerahan</p>

          <p className="cd-tugas-deadline">{fmtTanggalJam(t.deadline)}</p>
        </div>
      )}

      {/* LAMPIRAN DOSEN */}

      {t.attachmentUrl && (
        <div
          style={{
            marginTop: 15,
          }}
        >
          <a
            href={t.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#2563eb",
            }}
          >
            📎 {t.attachmentName || "Unduh lampiran tugas"}
          </a>
        </div>
      )}

      {/* STATUS SUDAH DIKUMPULKAN */}

      {t.submitted && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 9,
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#15803d",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            ✓ Sudah Dikumpulkan
          </p>

          <p
            style={{
              margin: "5px 0 0",
              fontSize: 12,
              color: "#64748b",
            }}
          >
            {t.submission?.fileName}
          </p>

          {t.submission?.submittedAt && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "#94a3b8",
              }}
            >
              Dikumpulkan: {fmtTanggalJam(t.submission.submittedAt)}
            </p>
          )}
        </div>
      )}

      {/* UPLOAD JAWABAN */}

      {!isClosed && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 18,
            borderTop: "1px solid #eef0f7",
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#26355d",
              marginBottom: 10,
            }}
          >
            {t.submitted ? "Ganti file jawaban" : "Upload jawaban tugas"}
          </p>

          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.jpg,.jpeg,.png"
            disabled={submitting}
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] || null;

              setFile(selectedFile);
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "#fff",
              color: "#64748b",
              fontSize: 13,
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all .15s ease",
            }}
            onMouseEnter={(event) => {
              if (!submitting) {
                event.currentTarget.style.borderColor = "#16a34a";

                event.currentTarget.style.background = "#f9fdf9";
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = "#d1d5db";

              event.currentTarget.style.background = "#fff";
            }}
          />

          <p
            style={{
              marginTop: 7,
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            Maksimal 10 MB.
          </p>

          {file && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleUpload}
              className="cd-tugas-btn"
              style={{
                marginTop: 12,
              }}
            >
              {submitting
                ? "Mengunggah..."
                : t.submitted
                  ? "Perbarui Jawaban"
                  : "Kumpulkan Tugas"}
            </button>
          )}
        </div>
      )}

      {isClosed && !t.submitted && (
        <div
          style={{
            marginTop: 18,
            padding: 13,
            borderRadius: 8,
            background: "#fef2f2",
            color: "#dc2626",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Pengumpulan tugas telah ditutup.
        </div>
      )}
    </article>
  );
};

const handleSubmitAssignment = async (assignmentId, file) => {
  if (!file) {
    return;
  }

  try {
    setSubmittingAssignmentId(assignmentId);

    const token = await getToken();

    const formData = new FormData();

    formData.append("file", file);

    const { data } = await axios.post(
      `${backendUrl}/api/assignment/${assignmentId}/submit`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!data.success) {
      alert(data.message || "Gagal mengumpulkan tugas");
      return;
    }

    // Refresh daftar tugas
    await fetchAssignments();
  } catch (error) {
    console.error(error);

    alert(error.response?.data?.message || "Gagal mengumpulkan tugas");
  } finally {
    setSubmittingAssignmentId(null);
  }
};

const TugasPanel = ({
  items = [],
  loading = false,
  onSubmit,
  submittingAssignmentId,
}) => {
  if (loading) {
    return <div className="cd-side-card empty-task">Memuat tugas...</div>;
  }

  if (!items || items.length === 0) {
    return (
      <div className="cd-side-card empty-task">
        Belum ada tugas untuk mata kuliah ini.
      </div>
    );
  }

  const sortedItems = [...items].sort(
    (a, b) => Number(a.pertemuan || 0) - Number(b.pertemuan || 0),
  );

  return (
    <section className="cd-tugas-list">
      {sortedItems.map((t) => (
        <TugasCard
          key={t._id}
          t={t}
          onSubmit={onSubmit}
          submitting={submittingAssignmentId === t._id}
        />
      ))}
    </section>
  );
};

const SEMESTER_START = "2026-08-03";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const HARI_INDEX = {
  Minggu: 0,
  Senin: 1,
  Selasa: 2,
  Rabu: 3,
  Kamis: 4,
  Jumat: 5,
  Sabtu: 6,
};

const fmtTanggal = (d) =>
  `${HARI[d.getDay()]} ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;

// Tanggal sesi ke-n = kemunculan pertama schedule.day pada/ setelah SEMESTER_START, lalu +(n-1) minggu
const tanggalSesi = (scheduleDay, order) => {
  const start = new Date(SEMESTER_START);
  const target = HARI_INDEX[scheduleDay] ?? start.getDay();
  const first = new Date(start);
  first.setDate(
    start.getDate() + ((target - start.getDay() + 7) % 7) + (order - 1) * 7,
  );
  return first;
};

const statusSesi = (tgl) => {
  if (!tgl) return "Selesai";
  const now = new Date();
  const awal = new Date(tgl);
  awal.setHours(0, 0, 0, 0);
  const akhir = new Date(tgl);
  akhir.setHours(23, 59, 59, 999);
  if (akhir < now) return "Selesai";
  if (awal <= now && now <= akhir) return "Berlangsung";
  return "Belum dimulai";
};

const getLecturerNames = (course) => {
  const pengajar = course?.pengajar;

  if (Array.isArray(pengajar)) {
    const names = pengajar
      .map((dosen) => (typeof dosen === "string" ? dosen : dosen?.nama))
      .filter(Boolean);

    if (names.length > 0) return names.join(", ");
  }

  if (typeof pengajar === "string" && pengajar.trim()) {
    return pengajar.trim();
  }

  if (pengajar?.nama) return pengajar.nama;
  if (course?.pengajarNama) return course.pengajarNama;
  if (course?.inst) return course.inst;

  return "—";
};

// Membangun array sesi dari course asli (courseContent + schedule)
const buildSessions = (course) => {
  const content = course?.courseContent || [];
  const schedule = course?.schedule || {};
  const lecturer = getLecturerNames(course);

  return content
    .map((ch, rawIndex) => ({ ch, rawIndex }))
    .sort((a, b) => (a.ch.chapterOrder || 0) - (b.ch.chapterOrder || 0))
    .map(({ ch, rawIndex }) => {
      const tgl = schedule.day
        ? tanggalSesi(schedule.day, ch.chapterOrder)
        : null;
      return {
        rawIndex,
        order: ch.chapterOrder,
        title: (ch.chapterTitle || "").replace(
          `Pertemuan ${ch.chapterOrder} - `,
          "",
        ),
        status: statusSesi(tgl),
        tanggal: tgl,
        waktu:
          schedule.startTime && schedule.endTime
            ? `${schedule.startTime} - ${schedule.endTime}`
            : null,
        ruang: course?.ruang || null, // ⚠️ belum ada di schema → tampil hanya jika ada
        lecturer,
        materiCount: (ch.chapterContent || []).length,
        tugasCount: ch.tugasCount ?? null, // ⚠️ belum ada di schema → tampil hanya jika ada
      };
    });
};

const SessionCard = ({ s, onOpen }) => (
  <article className="cd-session-card">
    <div className="cd-session-top">
      <span className="cd-session-pill">
        Sesi ke {s.order} <Ico name="cloud" size={13} />
      </span>
      <span
        className={`cd-session-status ${s.status === "Selesai" ? "done" : s.status === "Berlangsung" ? "live" : "soon"}`}
      >
        {s.status}
      </span>
    </div>

    <h3 className="cd-session-title">{s.title}</h3>

    {s.tanggal && (
      <p className="cd-session-meta">
        {fmtTanggal(s.tanggal)}
        {s.waktu ? ` ${s.waktu}` : ""}
      </p>
    )}
    {s.ruang && <p className="cd-session-meta">Ruang: {s.ruang}</p>}

    <p className="cd-session-meta">Dosen Pengajar:</p>
    <ul className="cd-session-lecturer">
      <li>{s.lecturer}</li>
    </ul>

    <div className="cd-session-footer">
      <span>
        <Ico name="file-text" size={15} /> {s.materiCount} Materi
      </span>
      {s.tugasCount != null && (
        <span>
          <Ico name="clipboard-text" size={15} /> {s.tugasCount} Tugas
        </span>
      )}
    </div>
    <button
      type="button"
      onClick={onOpen}
      style={{
        marginTop: 12,
        width: "100%",
        padding: "9px 14px",
        background: "#16a34a",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      Masuk ke Sesi <Ico name="arrow-right" size={15} />
    </button>
  </article>
);

const TujuanUmum = ({ teks }) => (
  <section className="cd-tiu-card">
    <h4>Tujuan Instruksional Umum</h4>
    <p className={teks ? "cd-tiu-text" : "cd-muted"}>
      {teks || "Tidak ada catatan"}
    </p>
  </section>
);

const PustakaPanel = ({ items = [] }) => (
  <section className="cd-panel">
    {items.length === 0 ? (
      <div className="cd-side-card empty-task">Belum ada pustaka.</div>
    ) : (
      <ul className="cd-pustaka-list">
        {items.map((p, i) => (
          <li key={i} className="cd-pustaka-item">
            <span className="cd-file-badge">{p.type || "REF"}</span>
            <div>
              <p className="cd-pustaka-title">{p.title}</p>
              {p.author && <small className="cd-muted">{p.author}</small>}
            </div>
            {p.url && (
              <a
                className="cd-pustaka-link"
                href={p.url}
                target="_blank"
                rel="noreferrer"
              >
                <Ico name="external-link" size={15} />
              </a>
            )}
          </li>
        ))}
      </ul>
    )}
  </section>
);

const VirtualLabPanel = ({ items = [] }) => (
  <section className="cd-panel">
    {items.length === 0 ? (
      <div className="cd-side-card empty-task">Belum ada virtual lab.</div>
    ) : (
      <div className="cd-lab-grid">
        {items.map((l, i) => (
          <a
            key={i}
            className="cd-lab-card"
            href={l.url || "#"}
            target="_blank"
            rel="noreferrer"
          >
            <div className="cd-lab-icon">
              <Ico name="flask" size={22} />
            </div>
            <div>
              <p className="cd-lab-title">{l.title}</p>
              {l.desc && <small className="cd-muted">{l.desc}</small>}
            </div>
          </a>
        ))}
      </div>
    )}
  </section>
);

const RpsTabs = ({ sessions, course }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("rps");

  const TABS = [
    { id: "rps", label: "Rencana Pembelajaran Semester (RPS)" },
    { id: "pustaka", label: "Pustaka" },
    { id: "lab", label: "Virtual Lab" },
  ];
  const pustaka = course?.pustaka || [];
  const labs = course?.virtualLab || [];

  return (
    <section className="cd-session-list">
      <div className="cd-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`cd-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rps" && (
        <>
          <TujuanUmum />
          <div className="cd-session-subhead">
            <span className="cd-session-count">
              Total {sessions.length} Sesi
            </span>
          </div>
          {sessions.length === 0 ? (
            <div className="cd-side-card empty-task">
              Belum ada sesi pembelajaran.
            </div>
          ) : (
            sessions.map((s) => (
              <SessionCard
                key={s.rawIndex}
                s={s}
                onOpen={() => {
                  if (!course?._id) return;
                  navigate(`/player/${course._id}?sesi=${s.rawIndex}`);
                }}
              />
            ))
          )}
        </>
      )}

      {tab === "pustaka" && <PustakaPanel items={pustaka} />}
      {tab === "lab" && <VirtualLabPanel items={labs} />}
    </section>
  );
};

const stripClassFromTitle = (title = "") =>
  title.replace(/\s*\([^)]*\)\s*$/g, "").trim();

const normalizeClassCode = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  return ["G1", "G2"].includes(normalized) ? normalized : "";
};

const getClassCode = (title = "") =>
  normalizeClassCode(title.match(/\(([^)]+)\)/)?.[1]);

const ActionShortcut = ({ icon, label, color }) => (
  <button className="cd-shortcut" type="button">
    <span
      className="cd-shortcut-icon"
      style={{ background: color.bg, color: color.text }}
    >
      <Ico name={icon} size={24} />
    </span>
    <span>{label}</span>
  </button>
);

const Sidebar = ({ onBack, active, onSelect }) => (
  <aside className="cd-sidebar">
    <button className="cd-back" type="button" onClick={onBack}>
      <Ico name="arrow-left" size={16} /> Kembali
    </button>
    <nav className="cd-menu" aria-label="Menu kelas">
      {MENU_ITEMS.map((item) => (
        <button
          key={item}
          className={`cd-menu-item ${item === active ? "active" : ""}`}
          type="button"
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </nav>
  </aside>
);

const AssignmentCard = () => (
  <article className="cd-assignment-card">
    <div className="cd-assignment-main">
      <div className="cd-assignment-icon">
        <Ico name="clipboard-text" size={22} />
      </div>
      <div className="cd-assignment-content">
        <div className="cd-assignment-heading">
          <div>
            <h3>Ujian Akhir Semester UAS</h3>
            <p>Batas tanggal & waktu pengumpulan: 13 Des 2025 23:59</p>
          </div>
          <span className="cd-submitted">Sudah Dikumpulkan</span>
        </div>
        <p className="cd-assignment-desc">
          Anda dapat mengacu pada materi perkuliahan sesi ke 9 yang sudah saya
          upload. Selamat mengerjakan.
          <br />
          <strong>Baca Selengkapnya...</strong>
        </p>
        <div className="cd-attachment">
          <div className="cd-file">
            <span className="cd-file-badge">PDF</span>
            <span>SOAL UAS MPSIP NEW.pdf</span>
          </div>
          <button type="button">
            <Ico name="download" size={15} />
            Unduh
          </button>
        </div>
      </div>
    </div>
  </article>
);

const DiscussionFeed = ({ courseName, lecturer }) => (
  <section className="cd-feed-card">
    <div className="cd-feed-header">
      <div className="cd-avatar">
        <Ico name="user" size={25} />
      </div>
      <div className="cd-feed-meta">
        <p>
          <strong>{lecturer}</strong> menambahkan tugas
          <span> &gt; {courseName}</span>
          <span> &gt; Sesi ke 16</span>
        </p>
        <small>6 bulan yang lalu</small>
      </div>
    </div>
    <AssignmentCard />
  </section>
);

const RightPanel = ({ kehadiran }) => {
  const hadir = kehadiran?.hadir ?? 0;
  const totalSesi = kehadiran?.totalSesi ?? 0;
  const sakit = 0,
    izin = 0,
    alpa = 0; // ⚠️ belum ada di skema

  return (
    <aside className="cd-right-panel">
      <section>
        <h3>Tugas belum dikumpulkan</h3>
        <div className="cd-side-card empty-task">Tidak ada tugas.</div>
      </section>

      <section>
        <h3>Presensi</h3>
        <div className="cd-side-card cd-attendance-card">
          <strong>Kehadiran</strong>
          <p>
            {hadir} dari {totalSesi} Total Sesi{" "}
            <Ico name="info-circle" size={12} />
          </p>
          <div className="cd-attendance-grid">
            <div>
              <span>Hadir</span>
              <strong>{hadir}</strong>
            </div>
            <div>
              <span>Sakit</span>
              <strong>{sakit}</strong>
            </div>
            <div>
              <span>Izin</span>
              <strong>{izin}</strong>
            </div>
            <div>
              <span>Alpa</span>
              <strong>{alpa}</strong>
            </div>
          </div>
          <button type="button">Lihat Detail Presensi</button>
        </div>
      </section>
    </aside>
  );
};

const fmtNpp = (npp) => (npp == null ? "" : Number(npp).toFixed(4));

const Avatar = ({ src, name }) =>
  src ? (
    <img className="cd-avatar" src={src} alt={name || ""} />
  ) : (
    <div className="cd-avatar cd-avatar-fallback">
      <Ico name="user" size={18} />
    </div>
  );

const PengajarPesertaPanel = ({
  lecturer,
  lecturerImg,
  peserta = [],
  loading = false,
}) => {
  const [q, setQ] = useState("");
  const filtered = peserta.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(q.toLowerCase()) ||
      fmtNpp(p.npp).includes(q),
  );

  return (
    <section className="cd-pp">
      <p className="cd-pp-label">Dosen Pengajar</p>
      <div className="cd-pp-lecturer">
        <Avatar src={lecturerImg} name={lecturer} />
        <strong>{lecturer}</strong>
      </div>

      <p className="cd-pp-label cd-pp-label-mt">
        Jumlah {peserta.length} Peserta
      </p>
      <div className="cd-pp-search">
        <span className="cd-pp-search-box">
          <Ico name="search" size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
          />
        </span>
        <button type="button" className="cd-pp-search-btn">
          <Ico name="search" size={14} /> Cari
        </button>
      </div>

      <ul className="cd-pp-list">
        {loading ? (
          <li className="cd-side-card empty-task">Memuat peserta…</li>
        ) : filtered.length === 0 ? (
          <li className="cd-side-card empty-task">Tidak ada peserta.</li>
        ) : (
          filtered.map((p, i) => (
            <li key={p._id || i} className="cd-pp-item">
              <Avatar src={p.imageUrl} name={p.name} />
              <div>
                <p className="cd-pp-name">{p.name}</p>
                <p className="cd-pp-npp">{fmtNpp(p.npp)}</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
};

const KelompokPanel = () => (
  <section className="cd-empty-card">
    <svg
      className="cd-empty-illust"
      viewBox="0 0 240 160"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ilustrasi belum ada kelompok"
    >
      <ellipse cx="120" cy="140" rx="78" ry="10" fill="#eef0f7" />
      {/* kartu kosong di belakang */}
      <rect
        x="58"
        y="34"
        width="124"
        height="80"
        rx="10"
        fill="#f4f6fc"
        stroke="#e1e6f2"
        strokeWidth="2"
      />
      <line
        x1="74"
        y1="58"
        x2="166"
        y2="58"
        stroke="#dfe4f1"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1="74"
        y1="74"
        x2="146"
        y2="74"
        stroke="#e7ebf6"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1="74"
        y1="90"
        x2="156"
        y2="90"
        stroke="#e7ebf6"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* tiga avatar (kelompok) */}
      <g>
        <circle
          cx="96"
          cy="116"
          r="18"
          fill="#fff"
          stroke="#cfd6ea"
          strokeWidth="2"
        />
        <circle cx="96" cy="110" r="6" fill="#b7c0db" />
        <path d="M86 124c0-6 4.5-10 10-10s10 4 10 10z" fill="#b7c0db" />
        <circle
          cx="144"
          cy="116"
          r="18"
          fill="#fff"
          stroke="#cfd6ea"
          strokeWidth="2"
        />
        <circle cx="144" cy="110" r="6" fill="#b7c0db" />
        <path d="M134 124c0-6 4.5-10 10-10s10 4 10 10z" fill="#b7c0db" />
        <circle
          cx="120"
          cy="120"
          r="22"
          fill="#fff"
          stroke="#16a34a"
          strokeWidth="2.5"
        />
        <circle cx="120" cy="113" r="7.5" fill="#16a34a" />
        <path d="M107 130c0-7.5 6-13 13-13s13 5.5 13 13z" fill="#16a34a" />
      </g>
    </svg>
    <p className="cd-empty-title">Belum ada kelompok</p>
    <p className="cd-empty-sub">Kelompok untuk kelas ini belum dibuat.</p>
  </section>
);

const CourseDetail = ({ course, onBack = () => window.history.back() }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const {
    enrolledCourses = [],
    allCourses = [],
    backendUrl,
    userData,
  } = useContext(AppContext);
  const realCourse = [...enrolledCourses, ...allCourses].find(
    (item) => String(item?._id) === String(id),
  );

  // Gunakan data dari context sebagai sumber utama, kemudian prop sebagai fallback.
  const selectedCourse = realCourse || course || null;

  const courseTitle =
    selectedCourse?.courseTitle || selectedCourse?.title || "";

  const courseName = stripClassFromTitle(courseTitle) || "Mata Kuliah";

  const userClass = normalizeClassCode(userData?.kelas);

  // Prioritas kelas berasal dari data praja yang sedang mengakses.
  // Data course hanya digunakan sebagai fallback.
  const classCode =
    userClass ||
    normalizeClassCode(selectedCourse?.kelas) ||
    getClassCode(courseTitle) ||
    "—";

  const lecturer = getLecturerNames(selectedCourse);
  const [activeMenu, setActiveMenu] = useState("Sesi Pembelajaran");

  // Daftar peserta langsung dari MongoDB (koleksi User via enrolledStudents)
  const [peserta, setPeserta] = useState([]);
  const [loadingPeserta, setLoadingPeserta] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState(null);

  useEffect(() => {
    if (!id || !backendUrl) return;

    setLoadingPeserta(true);

    axios
      .get(`${backendUrl}/api/course/${id}/peserta`)
      .then(({ data }) => {
        if (data.success) {
          setPeserta(Array.isArray(data.peserta) ? data.peserta : []);
        }
      })
      .catch((error) => {
        console.error("Gagal mengambil peserta kelas:", error);
        setPeserta([]);
      })
      .finally(() => setLoadingPeserta(false));
  }, [id, backendUrl]);

  useEffect(() => {
    if (!id || !backendUrl) return;

    const fetchQuizzes = async () => {
      try {
        setLoadingQuiz(true);

        const token = await getToken();

        const { data } = await axios.get(
          `${backendUrl}/api/quiz/course/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (data.success) {
          setQuizzes(data.quizzes || []);
        }
      } catch (error) {
        console.error("Gagal mengambil kuis:", error);
      } finally {
        setLoadingQuiz(false);
      }
    };

    fetchQuizzes();
  }, [id, backendUrl, getToken]);

  // ==========================================
  // FETCH TUGAS
  // ==========================================

  const fetchAssignments = async () => {
    if (!id || !backendUrl) {
      return false;
    }

    try {
      setLoadingAssignments(true);

      const token = await getToken();

      const { data } = await axios.get(
        `${backendUrl}/api/assignment/course/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        setAssignments(Array.isArray(data.assignments) ? data.assignments : []);

        return true;
      }

      setAssignments([]);

      return false;
    } catch (error) {
      console.error(
        "Gagal mengambil tugas:",
        error.response?.data || error.message,
      );

      setAssignments([]);

      return false;
    } finally {
      setLoadingAssignments(false);
    }
  };

  // ==========================================
  // FETCH TUGAS SAAT COURSE DIBUKA
  // ==========================================

  useEffect(() => {
    if (!id || !backendUrl) {
      return;
    }

    fetchAssignments();
  }, [id, backendUrl, getToken]);

  // ==========================================
  // PRAJA UPLOAD / GANTI JAWABAN TUGAS
  // ==========================================

  const handleSubmitAssignment = async (assignmentId, file) => {
    if (!assignmentId || !file) {
      toast.error("Pilih file jawaban terlebih dahulu.");

      return false;
    }

    // Maksimal 10 MB
    const maxFileSize = 10 * 1024 * 1024;

    if (file.size > maxFileSize) {
      toast.error("Ukuran file maksimal 10 MB.");

      return false;
    }

    try {
      setSubmittingAssignmentId(assignmentId);

      const token = await getToken();

      const formData = new FormData();

      formData.append("file", file);

      const { data } = await axios.post(
        `${backendUrl}/api/assignment/${assignmentId}/submit`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!data.success) {
        toast.error(data.message || "Gagal mengumpulkan tugas.");

        return false;
      }

      toast.success(data.message || "Tugas berhasil dikumpulkan.");

      // ======================================
      // REFRESH DATA TUGAS
      // Agar status "Sudah Dikumpulkan"
      // langsung muncul setelah upload.
      // ======================================

      await fetchAssignments();

      return true;
    } catch (error) {
      console.error(
        "Gagal mengumpulkan tugas:",
        error.response?.data || error.message,
      );

      if (error.response?.data?.code === "ASSIGNMENT_CLOSED") {
        toast.error("Batas waktu pengumpulan tugas telah berakhir.");
      } else {
        toast.error(
          error.response?.data?.message || "Gagal mengumpulkan tugas.",
        );
      }

      return false;
    } finally {
      setSubmittingAssignmentId(null);
    }
  };

  const QuizPanel = ({ quizzes, loading, onOpen }) => {
    if (loading) {
      return <div className="cd-side-card empty-task">Memuat kuis...</div>;
    }

    if (!quizzes || quizzes.length === 0) {
      return (
        <div className="cd-side-card empty-task">
          Belum ada kuis untuk mata kuliah ini.
        </div>
      );
    }

    return (
      <section className="space-y-4">
        {quizzes.map((quiz) => (
          <div key={quiz._id} className="bg-white border rounded-lg p-5">
            <p className="text-sm text-gray-500">Pertemuan {quiz.pertemuan}</p>

            <h3 className="font-semibold text-lg">{quiz.title}</h3>

            <p className="text-sm text-gray-500 mt-1">
              {quiz.questionCount} soal • {quiz.duration} menit
            </p>

            {quiz.completed ? (
              <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-sm font-semibold text-green-700">
                  ✓ Kuis sudah dikerjakan
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Nilai: <strong>{quiz.score}</strong>
                </p>
              </div>
            ) : quiz.locked ? (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="font-semibold text-gray-700">🔒 Kuis Terkunci</p>

                <p className="mt-1 text-sm text-gray-500">
                  Selesaikan prasyarat berikut:
                </p>

                <ul className="mt-3 space-y-2 text-sm">
                  {quiz.prerequisite?.reasons?.map((reason, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-gray-600"
                    >
                      <span className="text-red-500">✕</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-4">
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-700">
                    ✓ Prasyarat kuis telah terpenuhi
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpen(quiz._id)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                >
                  Mulai Kuis
                </button>
              </div>
            )}
          </div>
        ))}
      </section>
    );
  };

  const participantHasClassData = peserta.some((item) =>
    normalizeClassCode(item?.kelas),
  );

  const classParticipants =
    userClass && participantHasClassData
      ? peserta.filter((item) => normalizeClassCode(item?.kelas) === userClass)
      : peserta;

  const participants = classParticipants.length;
  const sessions = buildSessions(selectedCourse);

  return (
    <div className="course-detail-page">
      <style>{`
        .course-detail-page {
          min-height: calc(100vh - 58px);
          background: #f3f6ff;
          color: #26355d;
          font-family: var(--font-sans);
        }

        .cd-tabs { display:flex; gap:28px; border-bottom:1px solid #e9ecf5; margin-bottom:16px; }
.cd-tab { background:none; border:none; cursor:pointer; padding:0 0 10px; font-size:13px; font-weight:700; color:#8a90a6; border-bottom:2px solid transparent; margin-bottom:-1px; transition:color .15s; }
.cd-tab:hover { color:#5b6178; }
.cd-tab.active { color:#16a34a; border-bottom-color:#16a34a; }

.cd-tiu-card {
          background: #fff;
          border: 1px solid #e4e8f4;
          border-radius: 9px;
          padding: 14px 18px;
          margin-bottom: 14px;
        }
        .cd-tiu-card h4 {
          margin: 0 0 4px;
          font-size: 14px;
          font-weight: 800;
          color: #26355d;
        }
        .cd-tiu-text { margin: 0; font-size: 13px; color: #616782; }

.cd-rps-intro h4 { margin:0 0 2px; font-size:14px; font-weight:800; color:#26355d; }
.cd-muted { color:#9298ad; font-size:13px; }
.cd-session-subhead { margin:10px 0 12px; }

.cd-panel { padding:4px 0; }
.cd-pustaka-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.cd-pustaka-item { display:flex; align-items:center; gap:12px; background:#fff; border:1px solid #e4e8f4; border-radius:9px; padding:12px 14px; }
.cd-pustaka-title { margin:0; font-size:13.5px; font-weight:700; color:#26355d; }
.cd-pustaka-link { margin-left:auto; color:#16a34a; }

.cd-lab-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
.cd-lab-card { display:flex; align-items:center; gap:12px; background:#fff; border:1px solid #e4e8f4; border-radius:9px; padding:14px; text-decoration:none; }
.cd-lab-icon { width:42px; height:42px; border-radius:9px; display:grid; place-items:center; background:#eafaf0; color:#16a34a; }
.cd-lab-title { margin:0; font-size:13.5px; font-weight:700; color:#26355d; }

        /* ====== Tabs RPS / Pustaka / Virtual Lab ====== */
        .cd-tabs {
          display: flex;
          gap: 28px;
          border-bottom: 1px solid #e9ecf5;
          margin-bottom: 16px;
        }
        .cd-tab {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0 0 10px;
          font-size: 13px;
          font-weight: 700;
          color: #8a90a6;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: color 0.15s;
        }
        .cd-tab:hover { color: #5b6178; }
        .cd-tab.active { color: #16a34a; border-bottom-color: #16a34a; }

        .cd-rps-intro h4 {
          margin: 0 0 2px;
          font-size: 14px;
          font-weight: 800;
          color: #26355d;
        }
        .cd-muted { color: #9298ad; font-size: 13px; }
        .cd-session-subhead { margin: 10px 0 12px; }
        .cd-session-count { font-size: 13px; font-weight: 700; color: #009b35; }

        /* ====== Kartu sesi ====== */
        .cd-session-card {
          background: #fff;
          border: 1px solid #e4e8f4;
          border-radius: 9px;
          padding: 16px 18px;
          margin-bottom: 14px;
          box-shadow: 0 1px 2px rgba(22, 34, 74, 0.02);
        }
        .cd-session-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .cd-session-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eef0f7;
          color: #6b7280;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .cd-session-status { font-size: 12px; font-weight: 700; }
        .cd-session-status.done { color: #16a34a; }
        .cd-session-status.live { color: #d97706; }
        .cd-session-status.soon { color: #6b7280; }

        .cd-session-title {
          margin: 2px 0 10px;
          font-size: 16px;
          font-weight: 800;
          color: #26355d;
        }
        .cd-session-meta { margin: 1px 0; font-size: 13px; color: #616782; }
        .cd-session-lecturer { margin: 2px 0 0; padding-left: 18px; }
        .cd-session-lecturer li { font-size: 13px; color: #616782; }

        .cd-session-footer {
          display: flex;
          gap: 26px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #eef0f7;
        }
        .cd-session-footer span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #5b6178;
        }

        /* ====== Panel Pustaka & Virtual Lab ====== */
        .cd-panel { padding: 4px 0; }
        .cd-pustaka-list {
          list-style: none; margin: 0; padding: 0;
          display: flex; flex-direction: column; gap: 10px;
        }
        .cd-pustaka-item {
          display: flex; align-items: center; gap: 12px;
          background: #fff; border: 1px solid #e4e8f4;
          border-radius: 9px; padding: 12px 14px;
        }
        .cd-pustaka-title { margin: 0; font-size: 13.5px; font-weight: 700; color: #26355d; }
        .cd-pustaka-link { margin-left: auto; color: #16a34a; }

        .cd-lab-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }
        .cd-lab-card {
          display: flex; align-items: center; gap: 12px;
          background: #fff; border: 1px solid #e4e8f4;
          border-radius: 9px; padding: 14px; text-decoration: none;
        }
        .cd-lab-icon {
          width: 42px; height: 42px; border-radius: 9px;
          display: grid; place-items: center;
          background: #eafaf0; color: #16a34a;
        }
        .cd-lab-title { margin: 0; font-size: 13.5px; font-weight: 700; color: #26355d; }

        .course-detail-page * {
          box-sizing: border-box;
        }

        .cd-hero {
          position: relative;
          overflow: hidden;
          min-height: 254px;
          background: linear-gradient(165deg, #009b25 0%, #008d21 55%, #009c2b 100%);
          color: #fff;
        }

        .cd-hero::before,
        .cd-hero::after {
          content: '';
          position: absolute;
          pointer-events: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, .06);
        }

        .cd-hero::before {
          width: 760px;
          height: 260px;
          right: -110px;
          bottom: -118px;
        }

        .cd-hero::after {
          width: 620px;
          height: 210px;
          right: 210px;
          bottom: -154px;
          background: rgba(255, 255, 255, .045);
        }

        .cd-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 1140px;
          margin: 0 auto;
          padding: 72px 20px 26px;
        }

        .cd-hero h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          line-height: 1.24;
          letter-spacing: -.2px;
        }

        .cd-class-label {
          margin: 4px 0 0;
          font-size: 15px;
          opacity: .86;
        }

        .cd-hero-info {
          display: grid;
          grid-template-columns: .7fr 1.35fr 1fr 1fr;
          gap: 34px;
          margin-top: 84px;
          align-items: end;
        }

        .cd-hero-info span {
          display: block;
          margin-bottom: 3px;
          font-size: 12px;
          color: rgba(255, 255, 255, .74);
        }

        .cd-hero-info strong {
          display: block;
          font-size: 14px;
          line-height: 1.25;
          color: #fff;
        }

        .cd-body {
          max-width: 1140px;
          margin: 0 auto;
          padding: 26px 20px 48px;
          display: grid;
          grid-template-columns: 242px minmax(0, 1fr) 284px;
          gap: 24px;
          align-items: start;
        }

        .cd-sidebar {
        position: sticky;
        top: 72px;
        align-self: start;
        } 

        .cd-back {
          border: none;
          background: transparent;
          color: #16a34a;
          font-size: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 5px 5px 18px;
          cursor: pointer;
          font-family: inherit;
        }

        .cd-menu {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cd-menu-item {
          width: 100%;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #7d86b5;
          text-align: left;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          padding: 13px 18px;
          cursor: pointer;
        }

        .cd-menu-item.active {
          color: #2c3261;
          background: #dfe3ff;
        }

        .cd-main {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .cd-share-card,
        .cd-feed-card,
        .cd-side-card {
          background: #fff;
          border: 1px solid #e4e8f4;
          border-radius: 9px;
          box-shadow: 0 1px 2px rgba(22, 34, 74, .02);
        }

        .cd-share-card {
          min-height: 118px;
          padding: 18px 16px 14px;
        }

        .cd-share-card > p {
          margin: 0 0 18px;
          font-size: 14px;
          font-weight: 700;
          color: #8a90bf;
        }

        .cd-shortcuts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          align-items: center;
          justify-items: center;
        }

        .cd-shortcut {
          border: none;
          background: transparent;
          font-family: inherit;
          color: #6b7280;
          font-size: 12px;
          cursor: pointer;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          min-width: 72px;
        }

        .cd-shortcut-icon {
          width: 45px;
          height: 45px;
          border-radius: 9px;
          display: grid;
          place-items: center;
        }

        .cd-feed-card {
          padding: 16px 14px 0;
          overflow: hidden;
        }

        .cd-feed-header {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .cd-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #f1edff;
          color: #ded7ff;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .cd-feed-meta p {
          margin: 4px 0 3px;
          font-size: 14px;
          line-height: 1.5;
          color: #616782;
        }

        .cd-feed-meta strong {
          color: #354072;
          font-weight: 800;
        }

        .cd-feed-meta span {
          color: #009b35;
          margin-left: 7px;
        }

        .cd-feed-meta small {
          display: block;
          color: #6b7280;
          font-size: 13px;
        }

        .cd-assignment-card {
          border: 1px solid #e4e8f4;
          border-radius: 9px 9px 0 0;
          background: #fff;
          overflow: hidden;
        }

        .cd-assignment-main {
          display: flex;
          gap: 14px;
          padding: 22px 0 0 22px;
        }

        .cd-assignment-icon {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #e7fbff;
          color: #2cb9d0;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .cd-assignment-content {
          min-width: 0;
          flex: 1;
        }

        .cd-assignment-heading {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          padding-right: 20px;
        }

        .cd-assignment-heading h3 {
          margin: 3px 0 3px;
          font-size: 18px;
          line-height: 1.2;
          color: #394276;
          font-weight: 800;
        }

        .cd-assignment-heading p {
          margin: 0;
          color: #3a4678;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.35;
        }

        .cd-submitted {
          flex: 0 0 auto;
          background: #ffb323;
          color: #fff;
          border-radius: 8px;
          padding: 11px 15px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1;
        }

        .cd-assignment-desc {
          max-width: 430px;
          margin: 26px 0 20px;
          color: #777f91;
          font-size: 12.5px;
          line-height: 1.45;
        }

        .cd-assignment-desc strong {
          color: #f1a51c;
        }

        .cd-attachment {
          height: 41px;
          background: #e8e9ff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 14px 0 12px;
          margin-left: -60px;
        }

        .cd-file {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          color: #354072;
          font-size: 12.5px;
          font-weight: 700;
        }

        .cd-file-badge {
          background: #ff5b4d;
          color: #fff;
          border-radius: 4px;
          padding: 4px 5px;
          font-size: 8px;
          font-weight: 900;
          line-height: 1;
        }

        .cd-attachment button {
          border: none;
          background: transparent;
          color: #12a84c;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .cd-right-panel {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .cd-right-panel h3 {
          margin: 0 0 9px;
          color: #283064;
          font-size: 16px;
          font-weight: 800;
        }

        .cd-side-card {
          padding: 15px;
          color: #70778d;
          font-size: 13.5px;
        }

        .empty-task {
          min-height: 46px;
          display: flex;
          align-items: center;
        }

        .cd-attendance-card {
          padding: 17px 16px 16px;
        }

        .cd-attendance-card > strong {
          display: block;
          color: #344072;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .cd-attendance-card > p {
          margin: 0 0 17px;
          color: #7680bd;
          font-size: 12px;
          font-weight: 700;
        }

        .cd-attendance-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          text-align: center;
          margin-bottom: 16px;
        }

        .cd-attendance-grid span {
          display: block;
          color: #6b7280;
          font-size: 12px;
          margin-bottom: 7px;
        }

        .cd-attendance-grid strong {
          display: block;
          color: #4a4f62;
          font-size: 16px;
        }

        .cd-attendance-card button {
          border: none;
          background: transparent;
          color: #f0ad2d;
          padding: 0;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .cd-tugas-card {
          background: #fff;
          border: 1px solid #e4e8f4;
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 16px;
        }
        .cd-tugas-title {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          color: #1f2a52;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .cd-tugas-badge {
          font-size: 12px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 6px;
          color: #fff;
        }
        .cd-tugas-badge.closed { background: #16a34a; }
        .cd-tugas-badge.open   { background: #1e9be0; }

        .cd-tugas-sesi { margin: 8px 0 0; font-size: 14px; color: #7b8198; }

        .cd-tugas-foot {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-top: 18px;
        }
        .cd-tugas-label { margin: 0; font-size: 13px; color: #9298ad; }
        .cd-tugas-deadline { margin: 2px 0 0; font-size: 15px; font-weight: 700; color: #1f2a52; }

        .cd-tugas-btn {
          background: #2c2f7a;
          color: #fff;
          border: none;
          border-radius: 9px;
          padding: 11px 20px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .cd-tugas-btn.pending {
          background: #fff;
          color: #2c2f7a;
          border: 1.5px solid #2c2f7a;
        }

        @media (max-width: 1024px) {
          .cd-body {
            grid-template-columns: 220px minmax(0, 1fr);
          }

          .cd-right-panel {
            grid-column: 2;
          }
        }

        @media (max-width: 760px) {
          .cd-hero-inner {
            padding-top: 40px;
          }

          .cd-sidebar {
          position: static;
          }

          .cd-hero-info {
            grid-template-columns: 1fr 1fr;
            margin-top: 42px;
            gap: 18px;
          }

          .cd-body {
            grid-template-columns: 1fr;
            padding-top: 18px;
          }

          .cd-right-panel {
            grid-column: auto;
          }

          .cd-menu {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .cd-share-card {
            min-height: auto;
          }

          .cd-assignment-main {
            padding-left: 16px;
          }

          .cd-assignment-heading {
            flex-direction: column;
          }

          .cd-attachment {
            margin-left: -54px;
          }
        }
        .cd-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex: none; }
        .cd-avatar-fallback { display: grid; place-items: center; background: #e9ecf5; color: #9298ad; }

        .cd-pp-label { font-size: 13px; font-weight: 700; color: #7c83e0; margin: 0 0 10px; }
        .cd-pp-label-mt { margin-top: 26px; }

        .cd-pp-lecturer { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e4e8f4; border-radius: 10px; padding: 14px 18px; }
        .cd-pp-lecturer strong { font-size: 14px; color: #26355d; font-weight: 700; }

        .cd-pp-search { display: flex; gap: 10px; margin-bottom: 6px; }
        .cd-pp-search-box { flex: 1; display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e4e8f4; border-radius: 9px; padding: 0 14px; color: #9298ad; }
        .cd-pp-search-box input { flex: 1; border: none; outline: none; padding: 12px 0; font-size: 14px; background: transparent; color: #26355d; }
        .cd-pp-search-btn { display: inline-flex; align-items: center; gap: 6px; background: #16a34a; color: #fff; border: none; border-radius: 9px; padding: 0 20px; font-size: 13.5px; font-weight: 700; cursor: pointer; }

        .cd-pp-list { list-style: none; margin: 8px 0 0; padding: 0; background: #fff; border: 1px solid #e4e8f4; border-radius: 10px; }
        .cd-pp-item { display: flex; align-items: center; gap: 14px; padding: 12px 18px; border-bottom: 1px solid #eef0f7; }
        .cd-pp-item:last-child { border-bottom: none; }
        .cd-pp-name { margin: 0; font-size: 14px; font-weight: 700; color: #26355d; }
        .cd-pp-npp { margin: 1px 0 0; font-size: 12.5px; color: #9298ad; }
        .cd-empty-card { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #fff; border: 1px solid #e4e8f4; border-radius: 12px; padding: 48px 24px; box-shadow: 0 1px 2px rgba(22, 34, 74, 0.02); }
        .cd-empty-illust { width: 180px; max-width: 60%; height: auto; margin-bottom: 18px; }
        .cd-empty-title { margin: 0; font-size: 16px; font-weight: 800; color: #26355d; }
        .cd-empty-sub { margin: 4px 0 0; font-size: 13px; color: #9298ad; }
      `}</style>

      <header className="cd-hero">
        <div className="cd-hero-inner">
          <h1>{courseName}</h1>
          <p className="cd-class-label">Kelas: {classCode}</p>

          <div className="cd-hero-info">
            <div>
              <span>Kode Kelas</span>
              <strong>{classCode}</strong>
            </div>
            <div>
              <span>Dosen Pengajar</span>
              <strong>{lecturer}</strong>
            </div>
            <div>
              <span>Jumlah Peserta</span>
              <strong>
                {loadingPeserta ? "Memuat..." : `${participants} peserta`}
              </strong>
            </div>
            <div>
              <span>Periode Akademik</span>
              <strong>2026/2027 Ganjil</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="cd-body">
        <Sidebar onBack={onBack} active={activeMenu} onSelect={setActiveMenu} />

        <div className="cd-main">
          {activeMenu === "Sesi Pembelajaran" && (
            <RpsTabs sessions={sessions} course={selectedCourse} />
          )}

          {activeMenu === "Tugas" && (
            <TugasPanel
              items={assignments}
              loading={loadingAssignments}
              onSubmit={handleSubmitAssignment}
              submittingAssignmentId={submittingAssignmentId}
            />
          )}

          {activeMenu === "Pengajar & Peserta" && (
            <PengajarPesertaPanel
              lecturer={lecturer}
              lecturerImg={
                Array.isArray(selectedCourse?.pengajar)
                  ? selectedCourse.pengajar[0]?.imageUrl
                  : selectedCourse?.pengajar?.imageUrl
              }
              peserta={classParticipants}
              loading={loadingPeserta}
            />
          )}

          {activeMenu === "Kuis" && (
            <QuizPanel
              quizzes={quizzes}
              loading={loadingQuiz}
              onOpen={(quizId) => navigate(`/quiz/${quizId}`)}
            />
          )}

          {activeMenu === "Kelompok" && <KelompokPanel />}

          {activeMenu !== "Sesi Pembelajaran" &&
            activeMenu !== "Tugas" &&
            activeMenu !== "Pengajar & Peserta" &&
            activeMenu !== "Kuis" &&
            activeMenu !== "Kelompok" && (
              <>
                <section className="cd-share-card">
                  <p>Bagikan sesuatu di kelas Anda:</p>
                  <div className="cd-shortcuts">
                    <ActionShortcut
                      icon="clipboard-list"
                      label="Survei"
                      color={{ bg: "#fff7da", text: "#e9ad00" }}
                    />
                    <ActionShortcut
                      icon="megaphone"
                      label="Info"
                      color={{ bg: "#e9f7ff", text: "#1e9be0" }}
                    />
                    <ActionShortcut
                      icon="calendar-event"
                      label="Acara"
                      color={{ bg: "#fff0ed", text: "#ff6d4b" }}
                    />
                  </div>
                </section>
                <DiscussionFeed courseName={courseName} lecturer={lecturer} />
              </>
            )}
        </div>

        <RightPanel kehadiran={selectedCourse?.kehadiran} />
      </main>
    </div>
  );
};

export default CourseDetail;
