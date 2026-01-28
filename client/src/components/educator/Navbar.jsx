import React from 'react'
import { assets } from '../../assets/assets'
import { UserButton, useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

const Navbar = () => {
  const { user } = useUser()

  return (
    <nav className="flex items-center justify-between px-6 py-4 sticky top-0 z-50 bg-white shadow-sm">
      <Link to="/">
        <img src={assets.logo} alt="logo" className="w-12 lg:w-16" />
      </Link>

      <div className="flex items-center gap-4 text-gray-600">
        <p className="hidden sm:block">
          Hi! {user?.fullName || user?.firstName || 'Developer'}
        </p>

        {user ? (
          <UserButton />
        ) : (
          <img
            src={assets.profile_img}
            alt="profile"
            className="w-8 h-8 rounded-full"
          />
        )}
      </div>
    </nav>
  )
}

export default Navbar
