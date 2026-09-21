import mongoose from "mongoose";

/**
 * Parameter sistem yang dihitung dari data, lalu DIBEKUKAN.
 *
 * Nilai disimpan agar tidak bergeser setiap kali data keprajaan berubah.
 * Tanpa pembekuan, praja yang sama bisa berpindah profil instruksional
 * hanya karena ada data baru yang masuk, sehingga rekomendasi yang sudah
 * dibekukan menjadi tidak konsisten dengan yang dihitung sesudahnya.
 */

const systemParameterSchema = new mongoose.Schema(
  {
    // Kunci parameter, mis. "mentalReference"
    key: { type: String, required: true, unique: true },

    value: { type: Number, required: true },

    // Rincian perhitungan
    method: { type: String, default: "" },
    sampleSize: { type: Number, default: 0 },
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    stdDev: { type: Number, default: null },

    // Sekali true, nilai tidak dihitung ulang otomatis
    frozen: { type: Boolean, default: true },

    computedBy: { type: String, default: null },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

export const SystemParameter = mongoose.model(
  "SystemParameter",
  systemParameterSchema,
);
