import React, { useContext, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'

const questions = [
  {
    id: 1,
    question: "Saat kamu mempelajari keterampilan baru di tempat kerja, kamu lebih suka:",
    options: [
      { label: "A", text: "Membaca panduan atau prosedur tertulis", type: "R" },
      { label: "B", text: "Melihat demonstrasi atau diagram alur kerja", type: "V" },
      { label: "C", text: "Mendengarkan penjelasan langsung dari rekan atau atasan", type: "A" },
      { label: "D", text: "Langsung mencoba dan belajar dari pengalaman", type: "K" },
    ]
  },
  {
    id: 2,
    question: "Ketika kamu perlu memahami peraturan atau kebijakan baru, kamu cenderung:",
    options: [
      { label: "A", text: "Membaca dokumen peraturan secara lengkap", type: "R" },
      { label: "B", text: "Melihat infografis atau bagan yang menjelaskan peraturan", type: "V" },
      { label: "C", text: "Bertanya langsung kepada yang lebih berpengalaman", type: "A" },
      { label: "D", text: "Langsung menerapkan dan menyesuaikan di lapangan", type: "K" },
    ]
  },
  {
    id: 3,
    question: "Dalam rapat atau pertemuan, kamu lebih mudah mengingat informasi dengan cara:",
    options: [
      { label: "A", text: "Mencatat poin-poin penting secara tertulis", type: "R" },
      { label: "B", text: "Melihat presentasi visual atau slide", type: "V" },
      { label: "C", text: "Mendengarkan diskusi dan penjelasan", type: "A" },
      { label: "D", text: "Terlibat aktif dalam diskusi dan simulasi", type: "K" },
    ]
  },
  {
    id: 4,
    question: "Saat kamu mendapat tugas baru yang belum pernah dikerjakan, kamu akan:",
    options: [
      { label: "A", text: "Mencari referensi tertulis atau contoh laporan sebelumnya", type: "R" },
      { label: "B", text: "Meminta contoh hasil kerja atau melihat template visual", type: "V" },
      { label: "C", text: "Mendiskusikan langkah-langkahnya dengan rekan kerja", type: "A" },
      { label: "D", text: "Langsung mulai mengerjakan sambil belajar", type: "K" },
    ]
  },
  {
    id: 5,
    question: "Ketika menghadapi masalah di tempat kerja, cara kamu mencari solusi adalah:",
    options: [
      { label: "A", text: "Membaca literatur atau dokumentasi terkait masalah", type: "R" },
      { label: "B", text: "Membuat diagram atau peta konsep untuk memahami masalah", type: "V" },
      { label: "C", text: "Berdiskusi dengan tim untuk mendapatkan berbagai sudut pandang", type: "A" },
      { label: "D", text: "Mencoba berbagai solusi secara langsung", type: "K" },
    ]
  },
  {
    id: 6,
    question: "Saat mengikuti pelatihan atau diklat, kamu merasa paling banyak belajar ketika:",
    options: [
      { label: "A", text: "Mendapatkan modul atau bahan bacaan yang lengkap", type: "R" },
      { label: "B", text: "Materi disajikan dengan video atau visualisasi menarik", type: "V" },
      { label: "C", text: "Ada sesi tanya jawab dan diskusi kelompok", type: "A" },
      { label: "D", text: "Ada praktik langsung atau studi kasus nyata", type: "K" },
    ]
  },
  {
    id: 7,
    question: "Untuk mengingat informasi penting dalam pekerjaan, kamu biasanya:",
    options: [
      { label: "A", text: "Menuliskan ringkasan atau catatan di buku atau dokumen", type: "R" },
      { label: "B", text: "Membuat mind map atau diagram visual", type: "V" },
      { label: "C", text: "Mengulang informasi dengan cara menyampaikannya kepada orang lain", type: "A" },
      { label: "D", text: "Langsung mempraktikkan agar tidak lupa", type: "K" },
    ]
  },
  {
    id: 8,
    question: "Ketika harus menyampaikan laporan kepada atasan, kamu lebih suka:",
    options: [
      { label: "A", text: "Membuat laporan tertulis yang detail dan terstruktur", type: "R" },
      { label: "B", text: "Menyajikan dengan grafik, tabel, atau presentasi visual", type: "V" },
      { label: "C", text: "Menyampaikan secara lisan dengan penjelasan langsung", type: "A" },
      { label: "D", text: "Mendemonstrasikan hasil kerja secara langsung", type: "K" },
    ]
  },
  {
    id: 9,
    question: "Saat belajar menggunakan aplikasi atau sistem baru di kantor, kamu lebih suka:",
    options: [
      { label: "A", text: "Membaca manual atau panduan penggunaan", type: "R" },
      { label: "B", text: "Melihat video tutorial atau screenshot langkah demi langkah", type: "V" },
      { label: "C", text: "Minta dijelaskan langsung oleh rekan yang sudah paham", type: "A" },
      { label: "D", text: "Langsung eksplorasi sendiri fitur-fiturnya", type: "K" },
    ]
  },
  {
    id: 10,
    question: "Ketika kamu perlu memahami data atau statistik, kamu lebih mudah dengan:",
    options: [
      { label: "A", text: "Membaca penjelasan tertulis tentang data tersebut", type: "R" },
      { label: "B", text: "Melihat grafik, diagram, atau visualisasi data", type: "V" },
      { label: "C", text: "Mendengarkan seseorang menjelaskan arti dari data tersebut", type: "A" },
      { label: "D", text: "Mengolah dan menganalisis data sendiri secara langsung", type: "K" },
    ]
  },
  {
    id: 11,
    question: "Dalam situasi darurat atau krisis di tempat kerja, kamu cenderung:",
    options: [
      { label: "A", text: "Merujuk pada prosedur atau SOP tertulis", type: "R" },
      { label: "B", text: "Mengingat diagram alur atau peta prosedur yang pernah dilihat", type: "V" },
      { label: "C", text: "Berkomunikasi dengan tim untuk koordinasi cepat", type: "A" },
      { label: "D", text: "Langsung bertindak berdasarkan pengalaman sebelumnya", type: "K" },
    ]
  },
  {
    id: 12,
    question: "Saat memberikan instruksi kepada bawahan atau rekan, kamu lebih suka:",
    options: [
      { label: "A", text: "Memberikan instruksi tertulis yang jelas dan detail", type: "R" },
      { label: "B", text: "Menunjukkan dengan gambar, diagram, atau contoh visual", type: "V" },
      { label: "C", text: "Menjelaskan secara lisan dengan detail", type: "A" },
      { label: "D", text: "Mendemonstrasikan langsung cara melakukannya", type: "K" },
    ]
  },
  {
    id: 13,
    question: "Ketika menghadiri seminar atau konferensi, kamu paling banyak mendapat manfaat dari:",
    options: [
      { label: "A", text: "Makalah atau artikel yang dibagikan", type: "R" },
      { label: "B", text: "Slide presentasi yang informatif dan menarik", type: "V" },
      { label: "C", text: "Sesi diskusi panel dan tanya jawab", type: "A" },
      { label: "D", text: "Workshop atau sesi praktik langsung", type: "K" },
    ]
  },
  {
    id: 14,
    question: "Untuk meningkatkan kompetensi diri, kamu lebih memilih:",
    options: [
      { label: "A", text: "Membaca buku atau jurnal terkait bidang kerja", type: "R" },
      { label: "B", text: "Menonton video pembelajaran atau dokumenter", type: "V" },
      { label: "C", text: "Mengikuti podcast atau diskusi online", type: "A" },
      { label: "D", text: "Mengikuti magang atau program on-the-job training", type: "K" },
    ]
  },
  {
    id: 15,
    question: "Saat mengevaluasi hasil pekerjaan tim, kamu lebih suka:",
    options: [
      { label: "A", text: "Membaca laporan evaluasi tertulis secara menyeluruh", type: "R" },
      { label: "B", text: "Melihat dashboard atau visualisasi performa tim", type: "V" },
      { label: "C", text: "Mendiskusikan hasil evaluasi bersama tim", type: "A" },
      { label: "D", text: "Langsung melakukan perbaikan berdasarkan temuan di lapangan", type: "K" },
    ]
  },
]

const typeLabels = {
  V: { label: "Visual", color: "blue", desc: "Kamu belajar paling baik melalui gambar, diagram, grafik, dan representasi visual lainnya." },
  A: { label: "Auditory", color: "green", desc: "Kamu belajar paling baik melalui mendengarkan, diskusi, dan penjelasan lisan." },
  R: { label: "Read/Write", color: "purple", desc: "Kamu belajar paling baik melalui membaca dan menulis teks." },
  K: { label: "Kinesthetic", color: "orange", desc: "Kamu belajar paling baik melalui pengalaman langsung dan praktik nyata." },
}

const VarkQuiz = () => {
  const { backendUrl, getToken, setUserData } = useContext(AppContext)
  const navigate = useNavigate()

  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({}) // { questionIndex: [type1, type2, ...] }
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const toggleOption = (type) => {
    const current = answers[currentQ] || []
    const already = current.includes(type)
    const updated = already ? current.filter(t => t !== type) : [...current, type]
    setAnswers({ ...answers, [currentQ]: updated })
  }

  const isSelected = (type) => (answers[currentQ] || []).includes(type)

  const handleNext = () => {
    if (!answers[currentQ] || answers[currentQ].length === 0) {
      toast.warn('Pilih minimal satu jawaban!')
      return
    }
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      calculateResult()
    }
  }

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1)
  }

  const calculateResult = async () => {
    // Hitung skor mentah
    const rawScores = { V: 0, A: 0, R: 0, K: 0 }
    Object.values(answers).forEach(types => {
      types.forEach(type => rawScores[type]++)
    })

    // Normalisasi L1: bagi setiap skor dengan total seluruh pilihan
    // Menghasilkan distribusi proporsional [0,1] yang sebanding antar praja
    const total = Object.values(rawScores).reduce((a, b) => a + b, 0)
    const normalizedScores = {
      V: total > 0 ? parseFloat((rawScores.V / total).toFixed(4)) : 0,
      A: total > 0 ? parseFloat((rawScores.A / total).toFixed(4)) : 0,
      R: total > 0 ? parseFloat((rawScores.R / total).toFixed(4)) : 0,
      K: total > 0 ? parseFloat((rawScores.K / total).toFixed(4)) : 0,
    }

    const dominant = Object.entries(normalizedScores).sort((a, b) => b[1] - a[1])[0][0]

    // Yang dikirim ke database: skor ternormalisasi [0,1]
    const varkResult = { scores: normalizedScores, dominant }

    // Yang ditampilkan di UI: skor mentah agar poin terbaca natural oleh praja
    setResult({ scores: rawScores, dominant })

    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.post(
        backendUrl + '/api/user/save-vark',
        { varkResult },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success) {
        setUserData(data.user)
        toast.success('Hasil VARK berhasil disimpan!')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const progress = Math.round(((currentQ + 1) / questions.length) * 100)

  // Tampilan Hasil
  if (result) {
    const dominant = typeLabels[result.dominant]
    const colorMap = {
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      green: 'bg-green-100 text-green-700 border-green-300',
      purple: 'bg-purple-100 text-purple-700 border-purple-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300'
    }
    const barColorMap = { blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', orange: 'bg-orange-500' }
    const typeColor = { V: 'blue', A: 'green', R: 'purple', K: 'orange' }
    const totalAnswers = Object.values(result.scores).reduce((a, b) => a + b, 0)

    return (
      <div className='min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center px-4 py-16'>
        <div className='bg-white rounded-2xl shadow-lg max-w-lg w-full p-8'>
          <div className='text-center mb-6'>
            <div className='text-5xl mb-3'>🎉</div>
            <h2 className='text-2xl font-bold text-gray-800'>Hasil Kuesioner VARK</h2>
            <p className='text-gray-500 mt-1'>Gaya belajar dominan kamu:</p>
          </div>

          <div className={`border-2 rounded-xl p-5 text-center mb-6 ${colorMap[dominant.color]}`}>
            <p className='text-3xl font-bold'>{dominant.label}</p>
            <p className='mt-2 text-sm'>{dominant.desc}</p>
          </div>

          <div className='space-y-3 mb-8'>
            {Object.entries(result.scores).map(([type, score]) => (
              <div key={type}>
                <div className='flex justify-between text-sm text-gray-600 mb-1'>
                  <span>{typeLabels[type].label}</span>
                  <span>{score} poin ({totalAnswers > 0 ? Math.round(score / totalAnswers * 100) : 0}%)</span>
                </div>
                <div className='w-full bg-gray-100 rounded-full h-3'>
                  <div
                    className={`h-3 rounded-full ${barColorMap[typeColor[type]]}`}
                    style={{ width: `${totalAnswers > 0 ? (score / totalAnswers) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className='flex gap-3'>
            <button onClick={() => navigate('/')}
              className='flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium'>
              Kembali ke Beranda
            </button>
            <button onClick={() => { setResult(null); setAnswers({}); setCurrentQ(0) }}
              className='flex-1 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium'>
              Ulangi Quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tampilan Pertanyaan
  const q = questions[currentQ]
  const selected = answers[currentQ] || []

  return (
    <div className='min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center px-4 py-16'>
      <div className='bg-white rounded-2xl shadow-lg max-w-lg w-full p-8'>
        {/* Header */}
        <div className='mb-6'>
          <div className='flex justify-between text-sm text-gray-500 mb-2'>
            <span>Pertanyaan {currentQ + 1} dari {questions.length}</span>
            <span>{progress}%</span>
          </div>
          <div className='w-full bg-gray-100 rounded-full h-2'>
            <div className='bg-blue-500 h-2 rounded-full transition-all duration-300' style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Pertanyaan */}
        <h2 className='text-lg font-semibold text-gray-800 mb-2'>{q.question}</h2>
        <p className='text-xs text-gray-400 mb-4'>Kamu boleh memilih lebih dari satu jawaban</p>

        {/* Pilihan */}
        <div className='space-y-3'>
          {q.options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => toggleOption(opt.type)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 text-gray-700 ${
                isSelected(opt.type)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className='flex items-center gap-3'>
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${
                  isSelected(opt.type) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                }`}>
                  {isSelected(opt.type) && <span className='text-white text-xs'>✓</span>}
                </div>
                <span>
                  <span className='font-semibold text-blue-600 mr-1'>{opt.label}.</span>
                  {opt.text}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Navigasi */}
        <div className='flex justify-between items-center mt-6'>
          <button
            onClick={handleBack}
            className={`text-sm text-gray-400 hover:text-gray-600 ${currentQ === 0 ? 'invisible' : ''}`}
          >
            ← Sebelumnya
          </button>
          <button
            onClick={handleNext}
            disabled={loading}
            className='px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50'
          >
            {currentQ === questions.length - 1 ? 'Selesai' : 'Selanjutnya →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VarkQuiz
