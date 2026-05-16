import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import SearchBar from '../../components/student/SearchBar'
import { useParams } from 'react-router-dom'
import CourseCard from '../../components/student/CourseCard'
import { assets } from '../../assets/assets'
import Footer from '../../components/student/Footer'

const varkInfo = {
  V: { label: 'Visual', emoji: '🎬', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  A: { label: 'Auditory', emoji: '🎧', color: 'bg-green-50 border-green-200 text-green-700' },
  R: { label: 'Read/Write', emoji: '📄', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  K: { label: 'Kinesthetic', emoji: '🛠️', color: 'bg-orange-50 border-orange-200 text-orange-700' },
}

const durationInfo = {
  tinggi: { label: 'Panjang (15-30 menit)', emoji: '⏱️' },
  sedang: { label: 'Sedang (5-15 menit)', emoji: '⏳' },
  rendah: { label: 'Pendek (< 5 menit)', emoji: '⚡' },
}

const getAvgLectureDuration = (course) => {
  let total = 0
  let count = 0
  course.courseContent?.forEach(chapter => {
    chapter.chapterContent?.forEach(lecture => {
      total += lecture.lectureDuration || 0
      count++
    })
  })
  return count > 0 ? total / count : 0
}

const getDurationCategory = (userData) => {
  const mk = userData?.mentalKepribadian || 0
  const samapta = userData?.samapta || 0
  const avg = (mk + samapta) / 2
  if (avg > 81) return 'tinggi'
  if (avg >= 75) return 'sedang'
  return 'rendah'
}

const matchesDuration = (course, category) => {
  const avg = getAvgLectureDuration(course)
  if (category === 'tinggi') return avg >= 15 && avg <= 30
  if (category === 'sedang') return avg >= 5 && avg < 15
  return avg < 5
}

const CourseList = () => {
  const { navigate, allCourses, userData } = useContext(AppContext)
  const { input } = useParams()
  const [filterCourse, setFilterCourse] = useState([])
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(false)

  const dominant = userData?.varkResult?.dominant
  const durationCategory = getDurationCategory(userData)
  const info = dominant ? varkInfo[dominant] : null
  const durInfo = durationInfo[durationCategory]

  useEffect(() => {
    if (allCourses && allCourses.length > 0) {
      let tempCourses = allCourses.slice()

      if (input) {
        tempCourses = tempCourses.filter(item =>
          item.courseTitle.toLowerCase().includes(input.toLowerCase())
        )
      }

      if (showOnlyRecommended && dominant) {
        tempCourses = tempCourses.filter(course =>
          course.tags === dominant && matchesDuration(course, durationCategory)
        )
        // Fallback jika tidak ada yang cocok durasi
        if (tempCourses.length === 0) {
          tempCourses = allCourses.filter(course => course.tags === dominant)
        }
      }

      setFilterCourse(tempCourses)
    }
  }, [allCourses, input, showOnlyRecommended])

  const isRecommended = (course) =>
    dominant && course.tags === dominant && matchesDuration(course, durationCategory)

  return (
    <>
      <div className='relative md:px-36 px-8 pt-20 text-left'>
        <div className='flex md:flex-row flex-col gap-6 items-start justify-between w-full'>
          <div>
            <h1 className='text-4xl font-semibold text-gray-800'>Course List</h1>
            <p className='text-gray-500'>
              <span className='text-blue-600 cursor-pointer' onClick={() => navigate('/')}>Home</span> / <span>Course List</span>
            </p>
          </div>
          <SearchBar data={input} />
        </div>

        {/* Banner VARK + Durasi */}
        {dominant && info && (
          <div className={`mt-6 border rounded-xl px-5 py-4 ${info.color}`}>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <span className='text-2xl'>{info.emoji}</span>
                <div>
                  <p className='font-semibold'>Gaya belajarmu: {info.label}</p>
                  <p className='text-sm opacity-80'>
                    {durInfo.emoji} Durasi konten yang cocok: <strong>{durInfo.label}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOnlyRecommended(!showOnlyRecommended)}
                className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${showOnlyRecommended ? 'bg-white' : 'opacity-70'}`}
              >
                {showOnlyRecommended ? '✓ Filter Aktif' : 'Tampilkan Rekomendasi'}
              </button>
            </div>
          </div>
        )}

        {input && (
          <div className='inline-flex items-center gap-4 px-4 py-2 border mt-8 mb-8 text-gray-600'>
            <p>{input}</p>
            <img src={assets.cross_icon} alt="" className="cursor-pointer" onClick={() => navigate('/course-list')} />
          </div>
        )}

        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 my-16 gap-3 px-2 md:p-0'>
          {filterCourse.map((course, index) => (
            <div key={index} className='relative'>
              {isRecommended(course) && (
                <div className='absolute top-2 left-2 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded-full'>
                  {info.emoji} Rekomendasi
                </div>
              )}
              <CourseCard course={course} />
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default CourseList
