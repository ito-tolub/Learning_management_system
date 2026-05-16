import React from 'react'
import { assets } from '../../assets/assets'

const Footer = () => {
  return (
    <footer className="flex flex-col-reverse md:flex-row items-center justify-between w-full px-8 border-t bg-white">
      
      {/* Left: Logo & Copyright */}
      <div className="flex items-center gap-4">
        
        <div className="hidden md:block h-7 w-px bg-gray-300" />
        <p className="py-4 text-center text-xs md:text-sm text-gray-500">
          © 2025 Institut Pemerintahan Dalam Negeri. All Rights Reserved
        </p>
      </div>

      {/* Right: Social Media */}
      <div className="flex items-center gap-4 py-4">
        <a href="#" aria-label="Instagram">
          <img
            src={assets.instagram_icon}
            alt="Instagram"
            className="w-10 h-10 opacity-70 hover:opacity-100 transition"
          />
        </a>
        <a href="#" aria-label="Twitter">
          <img
            src={assets.twitter_icon}
            alt="Twitter"
            className="w-10 h-10 opacity-70 hover:opacity-100 transition"
          />
        </a>
        <a href="#" aria-label="Facebook">
          <img
            src={assets.facebook_icon}
            alt="Facebook"
            className="w-10 h-10  opacity-70 hover:opacity-100 transition"
          />
        </a>
      </div>

    </footer>
  )
}

export default Footer
