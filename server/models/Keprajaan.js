import mongoose from 'mongoose'

const keprajaanSchema = new mongoose.Schema({
    npp: { type: mongoose.Schema.Types.Mixed, required: true, unique: true },
    nama: { type: String, required: true },
    mentalKepribadian: { type: Number, default: 0 },
    samapta: { type: Number, default: 0 },
    nilaiAkhir: { type: Number, default: 0 },
 })

const Keprajaan = mongoose.model('Keprajaan', keprajaanSchema, 'keprajaan')
export default Keprajaan
