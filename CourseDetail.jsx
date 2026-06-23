import React from 'react'

const Ico = ({ name, size = 16, className = '', style = {} }) => (
  <i className={`ti ti-${name} ${className}`} aria-hidden="true" style={{ fontSize: size, ...style }} />
)

const DEFAULT_COURSE = {
  id: 1,
  title: 'Manajemen Proyek Sistem Informasi Pemerintahan (G2)',
  prog: 'Teknologi Rekayasa Informasi Pemerintahan',
  inst: 'MUHAMMAD TOSAN BINGAMAWA, M.Kom',
  participants: 25,
  sched: 'Senin, 08:00 – 09:40',
  att: 15,
  total: 16,
}

const MENU_ITEMS = [
  'Informasi Kelas',
  'Diskusi',
  'Sesi Pembelajaran',
  'Tugas',
  'Ujian CBT',
  'Kuis',
  'Berkas',
  'Pengajar & Peserta',
  'Kelompok',
  'Student Engagement Score (SES)',
]

const stripClassFromTitle = (title = '') => title.replace(/\s*\([^)]*\)\s*$/g, '').trim()
const getClassCode = (title = '') => title.match(/\(([^)]+)\)/)?.[1] || 'G2'

const ActionShortcut = ({ icon, label, color }) => (
  <button className="cd-shortcut" type="button">
    <span className="cd-shortcut-icon" style={{ background: color.bg, color: color.text }}>
      <Ico name={icon} size={24} />
    </span>
    <span>{label}</span>
  </button>
)

const Sidebar = ({ onBack }) => (
  <aside className="cd-sidebar">
    <button className="cd-back" type="button" onClick={onBack}>
      <Ico name="arrow-left" size={16} />
      Kembali
    </button>

    <nav className="cd-menu" aria-label="Menu kelas">
      {MENU_ITEMS.map((item) => (
        <button key={item} className={`cd-menu-item ${item === 'Diskusi' ? 'active' : ''}`} type="button">
          {item}
        </button>
      ))}
    </nav>
  </aside>
)

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
          Anda dapat mengacu pada materi perkuliahan sesi ke 9 yang sudah saya upload. Selamat mengerjakan.
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
)

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
)

const RightPanel = () => (
  <aside className="cd-right-panel">
    <section>
      <h3>Tugas belum dikumpulkan</h3>
      <div className="cd-side-card empty-task">Tidak ada tugas.</div>
    </section>

    <section>
      <h3>Presensi</h3>
      <div className="cd-side-card cd-attendance-card">
        <strong>Kehadiran</strong>
        <p>15 dari 16 Total Sesi <Ico name="info-circle" size={12} /></p>
        <div className="cd-attendance-grid">
          <div><span>Hadir</span><strong>15</strong></div>
          <div><span>Sakit</span><strong>0</strong></div>
          <div><span>Izin</span><strong>1</strong></div>
          <div><span>Alpa</span><strong>0</strong></div>
        </div>
        <button type="button">Lihat Detail Presensi</button>
      </div>
    </section>
  </aside>
)

const CourseDetail = ({ course, onBack = () => window.history.back() }) => {
  const selectedCourse = course || DEFAULT_COURSE
  const courseName = stripClassFromTitle(selectedCourse.title)
  const classCode = getClassCode(selectedCourse.title)
  const lecturer = selectedCourse.inst || DEFAULT_COURSE.inst
  const participants = selectedCourse.participants || 25

  return (
    <div className="course-detail-page">
      <style>{`
        .course-detail-page {
          min-height: calc(100vh - 58px);
          background: #f3f6ff;
          color: #26355d;
          font-family: 'Segoe UI', 'Inter', sans-serif;
        }

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
              <strong>{participants} peserta</strong>
            </div>
            <div>
              <span>Periode Akademik</span>
              <strong>2025/2026 Ganjil</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="cd-body">
        <Sidebar onBack={onBack} />

        <div className="cd-main">
          <section className="cd-share-card">
            <p>Bagikan sesuatu di kelas Anda:</p>
            <div className="cd-shortcuts">
              <ActionShortcut icon="clipboard-list" label="Survei" color={{ bg: '#fff7da', text: '#e9ad00' }} />
              <ActionShortcut icon="megaphone" label="Info" color={{ bg: '#e9f7ff', text: '#1e9be0' }} />
              <ActionShortcut icon="calendar-event" label="Acara" color={{ bg: '#fff0ed', text: '#ff6d4b' }} />
            </div>
          </section>

          <DiscussionFeed courseName={courseName} lecturer={lecturer} />
        </div>

        <RightPanel />
      </main>
    </div>
  )
}

export default CourseDetail
