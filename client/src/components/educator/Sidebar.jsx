import React, { useContext } from 'react'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
  const { isEducator } = useContext(AppContext)

  const menuItems = [
    { name: 'Dashboard', path: '/educator', icon: assets.home_icon },
    { name: 'Add Course', path: '/educator/add-course', icon: assets.add_icon },
    { name: 'My Course', path: '/educator/my-course', icon: assets.my_course_icon },
    { name: 'Student Enrolled', path: '/educator/student-enrolled', icon: assets.person_tick_icon },
  ]

  return (
    isEducator && (
      <aside className="w-16 md:w-64 border-r min-h-screen border-gray-300 py-4 flex flex-col">
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
      </aside>
    )
  )
}

export default Sidebar
