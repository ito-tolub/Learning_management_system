import React, { useContext, useState } from 'react'
import { assets } from '../../assets/assets'
import { Link } from 'react-router-dom'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const Navbar = () => {
  const { navigate, backendUrl } = useContext(AppContext)
  const isCourseListPage = location.pathname.includes('/course-list')
  const { openSignIn } = useClerk()
  const { user } = useUser()

  const [showDosenModal, setShowDosenModal] = useState(false)
  const [nip, setNip] = useState('')
  const [loadingDosen, setLoadingDosen] = useState(false)

  const loginDosen = async () => {
    if (!nip.trim()) return toast.error('NIP tidak boleh kosong')
    try {
      setLoadingDosen(true)
      const { data } = await axios.post(backendUrl + '/api/educator/login', { nip })
      console.log('login response:', data)
      if (data.success) {
        localStorage.setItem('dosenToken', data.token)
        setShowDosenModal(false)
        setNip('')
        toast.success(`Selamat datang, ${data.nama}`)
        navigate('/educator/student-engagement')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoadingDosen(false)
    }
  }

  return (
    <>
      <div className={`flex items-center justify-between px-4 sm:px-10 md:px-14 lg:px-36 border-b border-gray-500 py-4 ${isCourseListPage ? 'bg-white' : 'bg-cyan-100/70'}`}>
        <img onClick={() => navigate('/')} src={assets.logo} alt="Logo" className='w-16 lg:w-16 cursor-pointer' />

        <div className='hidden md:flex items-center gap-5 text-gray-500'>
          {!user && (
            <button
              onClick={() => setShowDosenModal(true)}
              className='text-sm border border-gray-400 px-4 py-1.5 rounded-full hover:bg-gray-100'
            >
              Login sebagai Dosen
            </button>
          )}

          {user && (
            <>
              <Link to='/my-enrollments'>My Enrollments</Link>
            </>
          )}

          {user
            ? <UserButton />
            : <button onClick={() => openSignIn()} className='bg-blue-600 text-white px-5 py-2 rounded-full'>
                Masuk sebagai Praja
              </button>
          }
        </div>

        {/* Mobile */}
        <div className='md:hidden flex items-center gap-2 sm:gap-5 text-gray-500'>
          {!user && (
            <button
              onClick={() => setShowDosenModal(true)}
              className='text-xs border border-gray-400 px-3 py-1 rounded-full'
            >
              Login Dosen
            </button>
          )}
          {user
            ? <UserButton />
            : <button onClick={() => openSignIn()}><img src={assets.user_icon} alt="" /></button>
          }
        </div>
      </div>

      {/* Modal Login Dosen */}
      {showDosenModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
          <div className='bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4'>
            <h2 className='text-xl font-bold text-gray-800 mb-1'>Login Dosen</h2>
            <p className='text-sm text-gray-500 mb-5'>Masukkan NIP Anda untuk mengakses dashboard</p>
            <input
              type='text'
              value={nip}
              onChange={e => setNip(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loginDosen()}
              placeholder='Masukkan NIP'
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-blue-400'
            />
            <div className='flex gap-3'>
              <button
                onClick={() => { setShowDosenModal(false); setNip('') }}
                className='flex-1 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50'
              >
                Batal
              </button>
              <button
                onClick={loginDosen}
                disabled={loadingDosen}
                className='flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50'
              >
                {loadingDosen ? 'Memuat...' : 'Masuk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar