import mongoose from "mongoose";

const keprajaanSchema = new mongoose.Schema({
  npp: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  nama: {
    type: String,
    required: true,
  },

  mentalKepribadian: {
    type: Number,
    default: 0,
  },

  samapta: {
    type: Number,
    default: 0,
  },

  nilaiAkhir: {
    type: Number,
    default: 0,
  },

  kelas: {
    type: String,
    enum: ["G1", "G2"],
    required: true,
    uppercase: true,
    trim: true,
  },
});

const Keprajaan = mongoose.model(
  "Keprajaan",
  keprajaanSchema,
  "keprajaan",
);

export default Keprajaan;