import mongoose from 'mongoose'

const pegawaiSchema = new mongoose.Schema({
  nip:    { type: String, required: true, unique: true }, // "19960152020121009"
  nama:   { type: String, required: true },
  nik:    { type: String, required: true },
  bagian: { type: String, required: true }, // fakultas/jurusan/unit
})

const Pegawai = mongoose.model('Pegawai', pegawaiSchema, 'pegawai')
export default Pegawai
