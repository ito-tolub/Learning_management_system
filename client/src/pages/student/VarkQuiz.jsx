import React, { useContext, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'

const questions = [
  {
    id: 1,
    question: "Saat belajar hal baru, kamu lebih suka:",
    options: [
      { label: "A", text: "Membaca buku atau artikel tentang topik tersebut", type: "R" },
      { label: "B", text: "Menonton video atau melihat diagram/gambar", type: "V" },
      { label: "C", text: "Mendengarkan penjelasan dari orang lain", type: "A" },
      { label: "D", text: "Langsung mencoba dan mempraktikkannya", type: "K" },
    ]
  },
  {
    id: 2,
    question: "Ketika kamu lupa jalan ke suatu tempat, kamu akan:",
    options: [
      { label: "A", text: "Mencari petunjuk tertulis atau membaca peta", type: "R" },
      { label: "B", text: "Membayangkan atau melihat peta secara visual", type: "V" },
      { label: "C", text: "Menelepon seseorang untuk menjelaskan arah", type: "A" },
      { label: "D", text: "Langsung pergi dan mencari tahu sendiri di jalan", type: "K" },
    ]
  },
  {
    id: 3,
    question: "Saat menghadapi masalah kompleks, kamu cenderung:",
    options: [
      { label: "A", text: "Membaca referensi atau mencari informasi tertulis", type: "R" },
      { label: "B", text: "Membuat diagram atau mind map", type: "V" },
      { label: "C", text: "Mendiskusikan masalah dengan orang lain", type: "A" },
      { label: "D", text: "Langsung mencoba berbagai solusi", type: "K" },
    ]
  },
  {
    id: 4,
    question: "Cara kamu mengingat informasi paling baik adalah:",
    options: [
      { label: "A", text: "Dengan membaca ulang catatan", type: "R" },
      { label: "B", text: "Dengan melihat gambar atau grafik", type: "V" },
      { label: "C", text: "Dengan mengucapkan atau mendengarnya berulang kali", type: "A" },
      { label: "D", text: "Dengan mempraktikkan langsung", type: "K" },
    ]
  },
  {
    id: 5,
    question: "Saat mengikuti instruksi perakitan, kamu lebih suka:",
    options: [
      { label: "A", text: "Membaca instruksi tertulis langkah demi langkah", type: "R" },
      { label: "B", text: "Melihat diagram atau gambar ilustrasi", type: "V" },
      { label: "C", text: "Mendengarkan seseorang menjelaskan prosesnya", type: "A" },
      { label: "D", text: "Langsung mencoba merakit tanpa membaca instruksi", type: "K" },
    ]
  },
  {
    id: 6,
    question: "Ketika belajar software baru, kamu biasanya:",
    options: [
      { label: "A", text: "Membaca dokumentasi atau manual", type: "R" },
      { label: "B", text: "Melihat screenshot atau video tutorial", type: "V" },
      { label: "C", text: "Mendengarkan atau bertanya kepada yang sudah bisa", type: "A" },
      { label: "D", text: "Langsung eksplorasi sendiri fitur-fiturnya", type: "K" },
    ]
  },
  {
    id: 7,
    question: "Saat presentasi, kamu lebih nyaman:",
    options: [
      { label: "A", text: "Membagikan handout atau materi tertulis", type: "R" },
      { label: "B", text: "Menggunakan slide dengan gambar dan grafik", type: "V" },
      { label: "C", text: "Berbicara dan menjelaskan secara lisan", type: "A" },
      { label: "D", text: "Melakukan demonstrasi langsung", type: "K" },
    ]
  },
  {
    id: 8,
    question: "Untuk mengisi waktu luang, kamu lebih suka:",
    options: [
      { label: "A", text: "Membaca buku atau artikel menarik", type: "R" },
      { label: "B", text: "Menonton film atau melihat pameran seni", type: "V" },
      { label: "C", text: "Mendengarkan musik atau podcast", type: "A" },
      { label: "D", text: "Olahraga atau membuat sesuatu dengan tangan", type: "K" },
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
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleAnswer = (type) => {
    const newAnswers = { ...answers, [currentQ]: type }
    setAnswers(newAnswers)
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      calculateResult(newAnswers)
    }
  }

  const calculateResult = async (finalAnswers) => {
    const scores = { V: 0, A: 0, R: 0, K: 0 }
    Object.values(finalAnswers).forEach(type => scores[type]++)
    const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
    const varkResult = { scores, dominant }
    setResult(varkResult)

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

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1)
  }

  const progress = Math.round((currentQ / questions.length) * 100)

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
                  <span>{score} / {questions.length}</span>
                </div>
                <div className='w-full bg-gray-100 rounded-full h-3'>
                  <div className={`h-3 rounded-full ${barColorMap[typeColor[type]]}`}
                    style={{ width: `${(score / questions.length) * 100}%` }} />
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

  const q = questions[currentQ]

  return (
    <div className='min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center px-4 py-16'>
      <div className='bg-white rounded-2xl shadow-lg max-w-lg w-full p-8'>
        <div className='mb-6'>
          <div className='flex justify-between text-sm text-gray-500 mb-2'>
            <span>Pertanyaan {currentQ + 1} dari {questions.length}</span>
            <span>{progress}%</span>
          </div>
          <div className='w-full bg-gray-100 rounded-full h-2'>
            <div className='bg-blue-500 h-2 rounded-full transition-all duration-300' style={{ width: `${progress}%` }} />
          </div>
        </div>
        <h2 className='text-lg font-semibold text-gray-800 mb-6'>{q.question}</h2>
        <div className='space-y-3'>
          {q.options.map((opt) => (
            <button key={opt.label} onClick={() => handleAnswer(opt.type)}
              className='w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-gray-700'>
              <span className='font-semibold text-blue-600 mr-2'>{opt.label}.</span>
              {opt.text}
            </button>
          ))}
        </div>
        {currentQ > 0 && (
          <button onClick={handleBack} className='mt-6 text-sm text-gray-400 hover:text-gray-600'>
            ← Kembali ke pertanyaan sebelumnya
          </button>
        )}
      </div>
    </div>
  )
}

export default VarkQuiz