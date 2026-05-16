import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'

const CourseCard = ({ course, isRecommended = false, badgeEmoji = '' }) => {
  const { calculateRating } = useContext(AppContext)

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
        <p className="text-gray-500 text-sm mt-1">{course?.educator?.name}</p>
        
        {/* Rating (kalau mau dihidupkan lagi) */}
        {/* <div className='flex items-center space-x-2 mt-2'>
          <p>{calculateRating(course)}</p>
          ... stars ...
        </div> */}
      </div>
    </Link>
  )
}

export default CourseCard