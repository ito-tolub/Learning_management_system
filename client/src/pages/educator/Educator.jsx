import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../../components/educator/Navbar'
import Sidebar from '../../components/educator/Sidebar'
import Footer from '../../components/educator/Footer'

const Educator = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    const handleSidebarShortcut = (event) => {
      const activeElement = document.activeElement
      const activeTag = activeElement?.tagName

      const isTyping =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeElement?.isContentEditable

      if (isTyping) return

      const isToggleShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b'

      if (!isToggleShortcut) return

      event.preventDefault()
      setIsSidebarOpen((previous) => !previous)
    }

    window.addEventListener('keydown', handleSidebarShortcut)

    return () => {
      window.removeEventListener('keydown', handleSidebarShortcut)
    }
  }, [])

  return (
    <div className='text-default min-h-screen bg-white'>
      <Navbar />
      <div className='flex'>
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className='flex-1 min-w-0'>
          {!isSidebarOpen && (
            <div className='px-4 pt-4'>
              <button
                type='button'
                onClick={() => setIsSidebarOpen(true)}
                title='Tampilkan sidebar (Ctrl+B)'
                aria-label='Tampilkan sidebar'
                className='flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              >
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-5 w-5' aria-hidden='true'>
                  <rect x='3' y='3' width='18' height='18' rx='2' />
                  <path d='M9 3v18' />
                  <path d='m14 9 3 3-3 3' />
                </svg>
              </button>
            </div>
          )}

          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Educator