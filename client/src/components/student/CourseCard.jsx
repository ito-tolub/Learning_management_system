import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'

const CourseCard = ({ course, isRecommended = false, badgeEmoji = '' }) => {
  const { calculateRating } = useContext(AppContext)

  // Nama dosen: pengajarNama (dari pegawai) → fallback
  const pengajar = course?.pengajarNama || 'Dosen Pengajar'

  // Jadwal manual dari database
  const sch = course?.schedule
  const jadwal = sch?.day
    ? `${sch.day}${sch.startTime ? `, ${sch.startTime}` : ''}${sch.endTime ? ` – ${sch.endTime}` : ''}`
    : null

  return (
    <Link
      to={`/course/${course._id}`}
      onClick={() => window.scrollTo(0, 0)}
      className="border border-gray-500/30 pb-6 overflow-hidden rounded-lg relative group hover:shadow-lg transition-shadow"
    >
      {/* Badge Rekomendasi */}
      {isRecommended && badgeEmoji && (
        <div className="absolute top-3 left-3 z-20 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full shadow-md">
          {badgeEmoji} Rekomendasi
        </div>
      )}

      <img
        className="w-full aspect-video object-cover"
        src={course.courseThumbnail}
        alt={course.courseTitle}
      />

      <div className="p-3 text-left">
        <h3 className="text-base font-semibold line-clamp-2">{course.courseTitle}</h3>
        <p className="text-gray-500 text-sm mt-1">{pengajar}</p>

        {/* Jadwal */}
        {jadwal && (
          <div className="flex items-center gap-1.5 text-gray-600 text-xs mt-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>{jadwal}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default CourseCard
