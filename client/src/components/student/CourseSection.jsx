import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'
import CourseCard from './CourseCard'

const CourseSection = () => {
  const { allCourses } = useContext(AppContext)

  return (
    <div className='py-16 md:px-40 px-8 w-full'>
      <h2 className='text-3xl font-medium text-gray-800'>
        Mengasah Ilmu, Menguatkan Karakter, Mengabdi untuk Bangsa
      </h2>
      <p className='text-sm md:text-base text-gray-500 mt-3'>
        Pembelajaran Digital Terintegrasi untuk Mencetak Aparatur Pemerintahan yang Profesional dan Berintegritas
      </p>

      {/* Mata Kuliah Semester Ini - sesuai RPS, sama untuk semua praja */}
      <div className='mt-10'>
        <h3 className='text-xl font-semibold text-gray-800 mb-6'>
          Mata Kuliah Semester Ini
        </h3>
        <div className='grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] px-4 md:px-0 gap-4'>
          {allCourses.slice(0, 4).map((course, index) => (
            <CourseCard key={index} course={course} />
          ))}
        </div>
      </div>

      <div className='mt-10'>
        <Link
          to={'/course-list'}
          onClick={() => scrollTo(0, 0)}
          className='text-gray-500 border border-gray-500/30 px-10 py-3 rounded'
        >
          show all courses
        </Link>
      </div>
    </div>
  )
}

export default CourseSection
