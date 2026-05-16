import React, { useContext, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const NppInput = () => {
    const { backendUrl, getToken, setUserData, navigate } = useContext(AppContext)
    const [npp, setNpp] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!npp.trim()) {
            toast.warn('NPP tidak boleh kosong!')
            return
        }

        try {
            setLoading(true)
            const token = await getToken()
            const { data } = await axios.post(
    backendUrl + '/api/user/save-npp',
    { npp: parseFloat(npp.trim()) },
    { headers: { Authorization: `Bearer ${token}` } }
)

            if (data.success) {
                setUserData(data.user)
                toast.success(data.message)
                navigate('/vark-quiz')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center px-4'>
            <div className='bg-white rounded-2xl shadow-lg max-w-md w-full p-8'>
                <div className='text-center mb-8'>
                    <div className='text-5xl mb-3'>🪖</div>
                    <h2 className='text-2xl font-bold text-gray-800'>Masukkan NPP Anda</h2>
                    <p className='text-gray-500 mt-2 text-sm'>
                        NPP digunakan untuk mengambil data keprajaan kamu secara otomatis dari sistem.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                    <div className='flex flex-col gap-1'>
                        <label className='text-sm font-medium text-gray-700'>NPP</label>
                        <input
                            type='text'
                            value={npp}
                            onChange={e => setNpp(e.target.value)}
                            placeholder='Contoh: 33.0900'
                            className='px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-gray-700'
                        />
                    </div>

                    <button
                        type='submit'
                        disabled={loading}
                        className='w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition-all'
                    >
                        {loading ? 'Memproses...' : 'Konfirmasi NPP'}
                    </button>
                </form>

                <p className='text-xs text-gray-400 text-center mt-4'>
                    Jika NPP tidak ditemukan, hubungi administrator sistem.
                </p>
            </div>
        </div>
    )
}

export default NppInput
