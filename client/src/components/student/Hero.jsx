import React from 'react'
import { assets } from '../../assets/assets'
import SearchBar from './SearchBar'

const Hero = () => {
  return (
    <div className='flex flex-col items-center justify-center w-full md:pt-36 pt-20 px-7 md:px-0 space-y-7 text-center bg-gradient-to-b from-cyan-100/70'>
        <h1 className='text-4xl md:text-6xl lg:text-7xl font-bold text-gray-700 max-w-3xl mx-auto'>Institut Pemerintahan Dalam Negeri</h1>

        <p className='md:block hidden text-gray-500 max-w-2x1 mx-auto'>Sekolah kedinasan dibawah naungan Kementerian Dalam Negeri</p>

        <p className='md:hidden text-gray-500 max-w-sm mx-auto'>Rajut mimpimu menjadi ASN bersama Kami 
        </p>
        <SearchBar/>
        
    </div>
  )
}

export default Hero