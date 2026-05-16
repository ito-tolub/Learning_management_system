/**
 * Script seed data dosen
 * Jalankan sekali: node scripts/seedDosen.js
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const collection = mongoose.connection.collection('pegawai')

  // Data dosen untuk testing — tambah lebih banyak jika perlu
  const dosenList = [
    {
      nip: '19960152020121009',
      nama: 'Muhammad Tosan Bingawaman',
      nik: '3201234567890001',
      bagian: 'Fakultas Manajemen Pemerintahan',
      password: await bcrypt.hash('dosen123', 10), // password default
    },
    // Tambah dosen lain di sini jika perlu
  ]

  for (const dosen of dosenList) {
    // Upsert: update jika NIP sudah ada, insert jika belum
    await collection.updateOne(
      { nip: dosen.nip },
      { $set: dosen },
      { upsert: true }
    )
    console.log(`✓ Dosen ${dosen.nama} (${dosen.nip}) berhasil disimpan`)
  }

  console.log('\nPassword default semua dosen: dosen123')
  console.log('Segera ganti password setelah login pertama!')

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch(console.error)