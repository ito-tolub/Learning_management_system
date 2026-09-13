import React, { useContext } from 'react'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import { NavLink } from 'react-router-dom'

const Sidebar = ({ isOpen = true, onClose }) => {
  const { isEducator } = useContext(AppContext)

  const menuItems = [
    { name: 'Dashboard', path: '/educator', icon: assets.home_icon },
    { name: 'Add Course', path: '/educator/add-course', icon: assets.add_icon },
    { name: 'My Course', path: '/educator/my-course', icon: assets.my_course_icon },
    { name: 'Student Enrolled', path: '/educator/student-enrolled', icon: assets.person_tick_icon },
    { name: 'Student Engagement', path: '/educator/student-engagement', icon: assets.person_tick_icon },
    { name: 'Ringkasan VARK', path: '/educator/vark-summary', icon: assets.person_tick_icon },
  ]

  return (
    isEducator && (
      <aside
        aria-hidden={!isOpen}
        className={`flex-shrink-0 overflow-hidden border-gray-300 transition-[width,opacity] duration-300 ease-in-out ${
          isOpen
            ? 'w-16 md:w-64 border-r min-h-screen py-4 opacity-100'
            : 'w-0 border-r-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-16 md:w-64 flex flex-col">
          <div className="flex items-center justify-end px-4 pb-2">
            <button
              type="button"
              onClick={onClose}
              title="Sembunyikan sidebar (Ctrl+B)"
              aria-label="Sembunyikan sidebar"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 9-3 3 3 3" />
              </svg>
            </button>
          </div>

          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/educator'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 ${
                  isActive ? 'bg-gray-200 font-medium text-gray-900' : ''
                }`
              }
            >
              <img src={item.icon} alt="" className="w-6 h-6 shrink-0" />
              <span className="hidden md:inline">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </aside>
    )
  )
}

export default Sidebar