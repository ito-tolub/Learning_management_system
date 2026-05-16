import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'
import CourseCard from './CourseCard'

const getCourseContentType = (course) => {
  let videoCount = 0, audioCount = 0, pdfCount = 0

  course.courseContent?.forEach(chapter => {
    chapter.chapterContent?.forEach(lecture => {
      const url = (lecture.lectureUrl || '').toLowerCase()
      if (url.includes('youtube.com') || url.includes('youtu.be')) videoCount++
      else if (url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg') || url.includes('audio')) audioCount++
      else if (url.includes('.pdf')) pdfCount++
      else if (url.includes('video')) videoCount++
    })
  })

  if (audioCount > videoCount && audioCount >= pdfCount) return 'A'
  if (pdfCount > videoCount && pdfCount >= audioCount) return 'R'
  if (videoCount > 0) return 'V'
  return 'K'
}

const varkInfo = {
  V: { label: 'Visual', emoji: '🎬', desc: 'Direkomendasikan untukmu — kursus berbasis video' },
  A: { label: 'Auditory', emoji: '🎧', desc: 'Direkomendasikan untukmu — kursus berbasis audio' },
  R: { label: 'Read/Write', emoji: '📄', desc: 'Direkomendasikan untukmu — kursus berbasis teks & PDF' },
  K: { label: 'Kinesthetic', emoji: '🛠️', desc: 'Direkomendasikan untukmu — kursus praktik langsung' },
}

const CourseSection = () => {
  const { allCourses, userData } = useContext(AppContext)

  const dominant = userData?.varkResult?.dominant
  const recommendedCourses = dominant ? allCourses.filter(course => getCourseContentType(course) === dominant) : []
  const otherCourses = dominant ? allCourses.filter(course => getCourseContentType(course) !== dominant) : allCourses
  const info = dominant ? varkInfo[dominant] : null

  return (
    <div className='py-16 md:px-40 px-8 w-full'>
      <h2 className='text-3xl font-medium text-gray-800'>Mengasah Ilmu, Menguatkan Karakter, Mengabdi untuk Bangsa</h2>
      <p className='text-sm md:text-base text-gray-500 mt-3'>Pembelajaran Digital Terintegrasi untuk Mencetak Aparatur Pemerintahan yang Profesional dan Berintegritas</p>

      {dominant && recommendedCourses.length > 0 && (
        <div className='mt-12 mb-4'>
          <div className='flex items-center gap-3 mb-2'>
            <span className='text-2xl'>{info.emoji}</span>
            <div>
              <h3 className='text-xl font-semibold text-gray-800'>Rekomendasi untuk Kamu</h3>
              <p className='text-sm text-blue-600'>{info.desc}</p>
            </div>
          </div>
          <div className='grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] px-4 md:px-0 my-6 gap-4'>
            {recommendedCourses.slice(0, 4).map((course, index) => (
              <div key={index} className='relative'>
                <div className='absolute top-2 left-2 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded-full'>
                  {info.emoji} Rekomendasi
                </div>
                <CourseCard course={course} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='mt-8'>
        <h3 className='text-xl font-semibold text-gray-800 mb-6'>
          {dominant ? 'Kursus Lainnya' : 'Semua Kursus'}
        </h3>
        <div className='grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] px-4 md:px-0 gap-4'>
          {(dominant ? otherCourses : allCourses).slice(0, 4).map((course, index) => (
            <CourseCard key={index} course={course} />
          ))}
        </div>
      </div>

      <div className='mt-10'>
        <Link to={'/course-list'} onClick={() => scrollTo(0, 0)} className='text-gray-500 border border-gray-500/30 px-10 py-3 rounded'>
          show all courses
        </Link>
      </div>
    </div>
  )
}

export default CourseSection