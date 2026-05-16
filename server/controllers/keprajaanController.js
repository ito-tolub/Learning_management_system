import Keprajaan from '../models/Keprajaan.js'
import User from '../models/User.js'

export const syncKeprajaan = async (req, res) => {
    try {
        const userId = req.auth.userId
        const { npp } = req.body

        if (!npp) {
            return res.json({ success: false, message: 'NPP tidak boleh kosong' })
        }

        const nppStr = String(npp).trim()
        const nppNum = parseFloat(nppStr)

        // Cari semua kemungkinan format NPP
        const keprajaan = await Keprajaan.findOne({
            $or: [
                { npp: nppStr },
                { npp: nppNum },
                { npp: { $regex: `^${nppStr.replace('.', '\\.')}$` } },
            ]
        })

        // Debug log
        console.log('Mencari NPP:', nppStr, '| Sebagai angka:', nppNum)
        console.log('Hasil:', keprajaan)

        if (!keprajaan) {
            // Cari semua data untuk debug
            const semua = await Keprajaan.find().limit(3)
            console.log('Contoh data di DB:', semua.map(k => ({ npp: k.npp, type: typeof k.npp })))
            return res.json({ success: false, message: 'NPP tidak ditemukan dalam sistem' })
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                npp: String(keprajaan.npp),
                mentalKepribadian: keprajaan.mentalKepribadian,
                samapta: keprajaan.samapta,
                nilaiAkhir: keprajaan.nilaiAkhir,
            },
            { new: true }
        )

        res.json({ success: true, user, message: 'Data keprajaan berhasil disinkronkan' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const checkKeprajaan = async (req, res) => {
    try {
        const userId = req.auth.userId
        const user = await User.findById(userId).lean()
        const sudahAda = !!user?.npp
        res.json({ success: true, sudahAda })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}