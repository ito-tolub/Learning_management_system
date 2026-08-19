import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const questions = [
  {
    id: 1,
    question:
      "Kamu sedang belajar satu gerakan atau teknik baru dalam kegiatan samapta. Kamu akan lebih memilih:",
    options: [
      {
        label: "A",
        text: "Mendengarkan pelatih atau pengasuh menjelaskan tekniknya dan mengajukan pertanyaan.",
        type: "A",
      },
      {
        label: "B",
        text: "Langsung mencoba gerakan tersebut dan memperbaikinya setelah mengetahui bagian yang keliru.",
        type: "K",
      },
      {
        label: "C",
        text: "Melihat gambar posisi tubuh atau urutan gerakan.",
        type: "V",
      },
      {
        label: "D",
        text: "Membaca petunjuk tertulis mengenai tahapan gerakan yang benar.",
        type: "R",
      },
    ],
  },
  {
    id: 2,
    question:
      "Kamu akan mengikuti kegiatan berkemah di lokasi yang belum pernah kamu kunjungi. Sebelum berangkat, kamu ingin:",
    options: [
      {
        label: "A",
        text: "Bertanya kepada pengasuh, panitia, atau teman yang sudah mengenal lokasi tersebut.",
        type: "A",
      },
      {
        label: "B",
        text: "Melihat peta lokasi, jalur perjalanan, dan posisi tempat-tempat penting.",
        type: "V",
      },
      {
        label: "C",
        text: "Mengetahui kondisi lokasi melalui contoh pengalaman nyata atau kegiatan serupa sebelumnya.",
        type: "K",
      },
      {
        label: "D",
        text: "Membaca informasi tertulis mengenai lokasi, jadwal, dan ketentuan kegiatan.",
        type: "R",
      },
    ],
  },
  {
    id: 3,
    question:
      "Dalam kegiatan berkemah, kamu diminta memasang perlengkapan yang belum pernah kamu gunakan sebelumnya. Kamu akan:",
    options: [
      {
        label: "A",
        text: "Membaca petunjuk pemasangan langkah demi langkah.",
        type: "R",
      },
      {
        label: "B",
        text: "Meminta seseorang menjelaskan cara memasangnya.",
        type: "A",
      },
      {
        label: "C",
        text: "Melihat gambar tahapan pemasangan dan posisi setiap bagiannya.",
        type: "V",
      },
      {
        label: "D",
        text: "Mencoba memasangnya terlebih dahulu sambil menyesuaikan bagian-bagiannya.",
        type: "K",
      },
    ],
  },
  {
    id: 4,
    question:
      "Ketika mempelajari materi baru di kelas, kamu biasanya lebih mudah memahaminya melalui:",
    options: [
      {
        label: "A",
        text: "Diagram, bagan, grafik, atau peta konsep yang menunjukkan hubungan antarbagian materi.",
        type: "V",
      },
      {
        label: "B",
        text: "Diskusi, tanya jawab, atau penjelasan lisan dari dosen dan teman.",
        type: "A",
      },
      {
        label: "C",
        text: "Contoh penerapan materi dalam situasi nyata.",
        type: "K",
      },
      {
        label: "D",
        text: "Buku, modul, artikel, atau catatan tertulis.",
        type: "R",
      },
    ],
  },
  {
    id: 5,
    question:
      "Kamu mendapat tugas untuk mempelajari sejarah atau perkembangan suatu tradisi dan kegiatan di lingkungan kampus. Kamu akan lebih tertarik untuk:",
    options: [
      {
        label: "A",
        text: "Mengunjungi lokasi atau mengamati langsung kegiatan yang masih dilaksanakan sekarang.",
        type: "K",
      },
      {
        label: "B",
        text: "Membaca arsip, dokumen, atau sumber tertulis yang berkaitan dengan topik tersebut.",
        type: "R",
      },
      {
        label: "C",
        text: "Melihat foto lama atau dokumentasi visual untuk membandingkan perkembangannya.",
        type: "V",
      },
      {
        label: "D",
        text: "Mendengarkan cerita atau penjelasan dari pengasuh, dosen, alumni, atau civitas akademika yang mengetahuinya.",
        type: "A",
      },
    ],
  },
  {
    id: 6,
    question:
      "Saat harus memilih kegiatan pengembangan diri atau bidang yang ingin lebih kamu dalami, hal yang paling membantu pertimbanganmu adalah:",
    options: [
      {
        label: "A",
        text: "Membaca uraian tertulis mengenai tujuan, kegiatan, dan kompetensi yang akan dipelajari.",
        type: "R",
      },
      {
        label: "B",
        text: "Mengikuti atau mencoba kegiatan tersebut terlebih dahulu untuk mengetahui kecocokannya.",
        type: "K",
      },
      {
        label: "C",
        text: "Berdiskusi dengan dosen, pengasuh, senior, atau teman mengenai pilihan yang tersedia.",
        type: "A",
      },
      {
        label: "D",
        text: "Melihat bagan yang membandingkan karakteristik dan kegiatan dari setiap pilihan.",
        type: "V",
      },
    ],
  },
  {
    id: 7,
    question:
      "Sebelum pertama kali mengikuti kegiatan di gedung, lapangan, atau fasilitas kampus yang belum kamu kenal, kamu ingin:",
    options: [
      {
        label: "A",
        text: "Melihat denah lokasi dan posisi tempat yang akan dituju.",
        type: "V",
      },
      {
        label: "B",
        text: "Berkeliling langsung untuk mengenali lokasi dan fasilitas yang ada.",
        type: "K",
      },
      {
        label: "C",
        text: "Mendengarkan penjelasan arah dari orang yang sudah mengetahui tempat tersebut.",
        type: "A",
      },
      {
        label: "D",
        text: "Membaca keterangan tertulis mengenai ruangan atau fasilitas yang tersedia.",
        type: "R",
      },
    ],
  },
  {
    id: 8,
    question:
      "Kamu perlu memahami prosedur perizinan untuk mengikuti suatu kegiatan atau meninggalkan asrama. Kamu akan lebih memilih:",
    options: [
      {
        label: "A",
        text: "Mendengarkan pengasuh menjelaskan prosedur tersebut dan menanyakan bagian yang belum jelas.",
        type: "A",
      },
      {
        label: "B",
        text: "Membaca ketentuan dan langkah-langkah perizinan secara tertulis.",
        type: "R",
      },
      {
        label: "C",
        text: "Melihat gambar alur yang menunjukkan tahapan proses perizinan.",
        type: "V",
      },
      {
        label: "D",
        text: "Mengikuti contoh proses perizinan yang pernah dilakukan agar memahami tahapannya secara langsung.",
        type: "K",
      },
    ],
  },
  {
    id: 9,
    question:
      "Kamu harus menggunakan aplikasi atau sistem digital baru untuk kegiatan akademik atau administrasi. Kamu akan:",
    options: [
      {
        label: "A",
        text: "Melihat diagram alur atau tampilan yang menunjukkan fungsi setiap menu.",
        type: "V",
      },
      {
        label: "B",
        text: "Bertanya kepada teman atau civitas akademika yang sudah memahami sistem tersebut.",
        type: "A",
      },
      {
        label: "C",
        text: "Membaca panduan penggunaan yang tersedia.",
        type: "R",
      },
      {
        label: "D",
        text: "Langsung mencoba fitur-fiturnya dan belajar dari hasil percobaan.",
        type: "K",
      },
    ],
  },
  {
    id: 10,
    question:
      "Kelompokmu harus menentukan penggunaan anggaran sederhana untuk suatu kegiatan. Agar dapat membandingkan beberapa pilihan, kamu lebih memilih:",
    options: [
      {
        label: "A",
        text: "Menggunakan contoh anggaran nyata dan mencoba menghitung dampak setiap pilihan.",
        type: "K",
      },
      {
        label: "B",
        text: "Melihat grafik atau tabel visual yang membandingkan biaya setiap pilihan.",
        type: "V",
      },
      {
        label: "C",
        text: "Membaca rincian tertulis mengenai biaya dan kebutuhan setiap pilihan.",
        type: "R",
      },
      {
        label: "D",
        text: "Membicarakan kelebihan dan kekurangan setiap pilihan bersama anggota kelompok.",
        type: "A",
      },
    ],
  },
  {
    id: 11,
    question:
      "Saat mencari materi pembelajaran melalui internet, kamu lebih menyukai sumber yang:",
    options: [
      {
        label: "A",
        text: "Menampilkan diagram, bagan, peta konsep, atau visualisasi hubungan antaride.",
        type: "V",
      },
      {
        label: "B",
        text: "Menyediakan artikel atau uraian tertulis yang rinci.",
        type: "R",
      },
      {
        label: "C",
        text: "Memberikan contoh penerapan, simulasi, atau kasus nyata yang dapat dicoba.",
        type: "K",
      },
      {
        label: "D",
        text: "Menyediakan penjelasan dalam bentuk audio, diskusi, atau rekaman penjelasan.",
        type: "A",
      },
    ],
  },
  {
    id: 12,
    question:
      "Kamu menemukan materi daring yang menjelaskan tata cara suatu kegiatan melalui narasi suara, tulisan, diagram, dan contoh praktik. Bagian yang paling kamu perhatikan adalah:",
    options: [
      {
        label: "A",
        text: "Penjelasan yang disampaikan melalui suara.",
        type: "A",
      },
      {
        label: "B",
        text: "Contoh praktik yang menunjukkan bagaimana kegiatan dilakukan.",
        type: "K",
      },
      {
        label: "C",
        text: "Tulisan yang menjelaskan langkah-langkah kegiatan.",
        type: "R",
      },
      {
        label: "D",
        text: "Diagram yang menunjukkan urutan atau hubungan antarbagian.",
        type: "V",
      },
    ],
  },
  {
    id: 13,
    question:
      "Setelah mengikuti tes, latihan, atau kegiatan samapta, kamu ingin mengetahui bagian yang perlu diperbaiki. Kamu lebih memilih menerima umpan balik melalui:",
    options: [
      {
        label: "A",
        text: "Catatan tertulis mengenai hasil dan bagian yang perlu diperbaiki.",
        type: "R",
      },
      {
        label: "B",
        text: "Grafik atau diagram yang menunjukkan perkembangan hasilmu.",
        type: "V",
      },
      {
        label: "C",
        text: "Contoh konkret dari bagian yang sudah dilakukan dengan baik dan yang perlu diperbaiki.",
        type: "K",
      },
      {
        label: "D",
        text: "Pembahasan langsung dengan dosen, pelatih, atau pengasuh.",
        type: "A",
      },
    ],
  },
  {
    id: 14,
    question:
      "Kamu diminta mendokumentasikan kegiatan apel, upacara, drumband, atau kegiatan kampus lainnya dan ingin menghasilkan foto yang lebih baik. Kamu akan:",
    options: [
      {
        label: "A",
        text: "Membaca petunjuk tertulis mengenai cara menggunakan kamera atau perangkat yang digunakan.",
        type: "R",
      },
      {
        label: "B",
        text: "Melihat gambar atau video yang menunjukkan fungsi tombol, posisi kamera, atau pengaturan yang digunakan.",
        type: "V",
      },
      {
        label: "C",
        text: "Bertanya kepada orang yang memahami teknik pengambilan foto dan berdiskusi tentang pengaturan kamera.",
        type: "A",
      },
      {
        label: "D",
        text: "Mencoba mengambil beberapa foto dengan pengaturan berbeda lalu membandingkan hasilnya.",
        type: "K",
      },
    ],
  },
  {
    id: 15,
    question:
      "Kamu mendapat tanggung jawab dalam sebuah kegiatan baru, misalnya kepanitiaan, curvei, atau kegiatan bersama di asrama. Untuk memahami tugas tersebut, kamu akan meminta:",
    options: [
      {
        label: "A",
        text: "Contoh kegiatan sebelumnya yang dapat dijadikan gambaran nyata.",
        type: "K",
      },
      {
        label: "B",
        text: "Pedoman atau uraian tertulis mengenai tugas dan ketentuan kegiatan.",
        type: "R",
      },
      {
        label: "C",
        text: "Kesempatan berdiskusi dengan pengasuh, panitia, atau anggota yang pernah melaksanakan kegiatan tersebut.",
        type: "A",
      },
      {
        label: "D",
        text: "Diagram atau bagan yang menunjukkan tahapan kegiatan dan pembagian tugas.",
        type: "V",
      },
    ],
  },
  {
    id: 16,
    question:
      "Kamu sedang mempelajari prosedur yang harus dilakukan jika terjadi keadaan darurat di asrama atau lingkungan kampus. Kamu lebih mudah memahaminya dengan:",
    options: [
      {
        label: "A",
        text: "Mengikuti simulasi atau latihan secara langsung.",
        type: "K",
      },
      {
        label: "B",
        text: "Mendengarkan pengarahan dari pengasuh atau petugas terkait.",
        type: "A",
      },
      {
        label: "C",
        text: "Membaca prosedur dan langkah-langkah tertulis.",
        type: "R",
      },
      {
        label: "D",
        text: "Melihat denah jalur evakuasi dan diagram tahapan tindakan.",
        type: "V",
      },
    ],
  },
];

const typeLabels = {
  V: {
    label: "Visual",
    desc: "Menunjukkan preferensi terhadap diagram, grafik, peta, pola, dan representasi visual.",
  },
  A: {
    label: "Aural",
    desc: "Menunjukkan preferensi terhadap penjelasan lisan, diskusi, tanya jawab, dan percakapan.",
  },
  R: {
    label: "Read/Write",
    desc: "Menunjukkan preferensi terhadap teks, daftar, catatan, dan kegiatan membaca atau menulis.",
  },
  K: {
    label: "Kinesthetic",
    desc: "Menunjukkan preferensi terhadap contoh nyata, pengalaman, praktik, simulasi, dan penerapan langsung.",
  },
};

const typeOrder = ["V", "A", "R", "K"];

const VarkQuiz = () => {
  const { backendUrl, getToken, setUserData } = useContext(AppContext);
  const navigate = useNavigate();

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentQuestion = questions[currentQ];

  const displayedOptions = currentQuestion.options;

  const selectedTypes = answers[currentQ] || [];

  const answeredQuestionCount = useMemo(
    () =>
      Object.values(answers).filter(
        (selected) => Array.isArray(selected) && selected.length > 0,
      ).length,
    [answers],
  );

  const toggleOption = (type) => {
    setAnswers((previous) => {
      const current = previous[currentQ] || [];
      const updated = current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type];

      return { ...previous, [currentQ]: updated };
    });
  };

  const isSelected = (type) => selectedTypes.includes(type);

  const goToNextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((previous) => previous + 1);
      return;
    }

    calculateResult(answers);
  };

  const handleSkip = () => {
    const updatedAnswers = { ...answers, [currentQ]: [] };
    setAnswers(updatedAnswers);

    if (currentQ < questions.length - 1) {
      setCurrentQ((previous) => previous + 1);
      return;
    }

    calculateResult(updatedAnswers);
  };

  const handleBack = () => {
    if (currentQ > 0) {
      setCurrentQ((previous) => previous - 1);
    }
  };

  const calculateResult = async (answerSnapshot = answers) => {
    const rawScores = { V: 0, A: 0, R: 0, K: 0 };

    Object.values(answerSnapshot).forEach((types) => {
      if (!Array.isArray(types)) return;
      types.forEach((type) => {
        if (Object.prototype.hasOwnProperty.call(rawScores, type)) {
          rawScores[type] += 1;
        }
      });
    });

    const totalSelections = Object.values(rawScores).reduce(
      (sum, value) => sum + value,
      0,
    );

    if (totalSelections === 0) {
      toast.warn("Pilih setidaknya satu jawaban sebelum melihat hasil.");
      return;
    }

    const highestScore = Math.max(...Object.values(rawScores));
    const highestModalities = typeOrder.filter(
      (type) => rawScores[type] === highestScore,
    );

    const completedQuestions = Object.values(answerSnapshot).filter(
      (types) => Array.isArray(types) && types.length > 0,
    ).length;

    const varkResult = {
      instrument: "adapted-vark-modalities",
      scoringMethod: "raw-count-vector",
      questionnaireVersion: "custom-praja-1.0",
      rawScores,
      highestModalities,
      // Kompatibilitas dengan struktur backend lama.
      // Field `scores` sekarang menyimpan skor mentah VARK.
      scores: rawScores,
      dominant: highestModalities,
      completedQuestions,
      skippedQuestions: questions.length - completedQuestions,
      totalQuestions: questions.length,
      totalSelections,
      officialPreference: null,
    };

    setResult(varkResult);

    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/user/save-vark`,
        { varkResult },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (data.success) {
        setUserData((previousUser) => ({
          ...previousUser,
          ...data.user,

          // Pertahankan data Keprajaan
          // yang tidak terdapat langsung
          // pada collection User.
          kelas: previousUser?.kelas || data.user?.kelas || null,

          namaKeprajaan:
            previousUser?.namaKeprajaan || data.user?.namaKeprajaan || null,

          mentalKepribadian:
            previousUser?.mentalKepribadian ??
            data.user?.mentalKepribadian ??
            null,

          samapta: previousUser?.samapta ?? data.user?.samapta ?? null,

          nilaiAkhir: previousUser?.nilaiAkhir ?? data.user?.nilaiAkhir ?? null,
        }));

        toast.success("Profil preferensi VARK berhasil disimpan.");
      } else {
        toast.error(data.message || "Hasil VARK gagal disimpan.");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Terjadi kesalahan saat menyimpan hasil.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setResult(null);
    setAnswers({});
    setCurrentQ(0);
  };

  const progress = Math.round(((currentQ + 1) / questions.length) * 100);

  if (result) {
    const highestNames = result.highestModalities
      .map((type) => typeLabels[type]?.label)
      .filter(Boolean);

    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg max-w-xl w-full p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">✓</div>
            <h2 className="text-2xl font-bold text-gray-800">
              Profil Preferensi VARK
            </h2>
            <p className="text-gray-500 mt-2">
              Modalitas dengan skor mentah tertinggi:
            </p>
          </div>

          <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-5 text-center mb-6">
            <p className="text-2xl font-bold text-blue-700">
              {highestNames.join(" / ")}
            </p>
            <p className="mt-2 text-sm text-blue-700">
              {result.highestModalities.length > 1
                ? "Beberapa modalitas memperoleh skor tertinggi yang sama."
                : typeLabels[result.highestModalities[0]]?.desc}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {typeOrder.map((type) => {
              const rawScore = result.rawScores[type];
              const percentage =
                result.totalSelections > 0
                  ? (rawScore / result.totalSelections) * 100
                  : 0;

              return (
                <div key={type}>
                  <div className="flex justify-between text-sm text-gray-700 mb-1">
                    <span className="font-medium">
                      {typeLabels[type].label}
                    </span>
                    <span>
                      {rawScore} poin ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-6">
            <p className="font-semibold mb-1">Catatan metodologis</p>
            <p>
              Hasil dan data yang disimpan menggunakan skor mentah VARK.
              Persentase pada tampilan hanya membantu interpretasi dan tidak
              disimpan sebagai vektor rekomendasi. Aplikasi ini tidak
              menghasilkan kategori resmi VARK seperti “mild Visual”, “VRK”,
              atau kategori resmi lainnya.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-8">
            <div className="rounded-lg bg-gray-50 p-3">
              <span className="block text-xs text-gray-400">Terjawab</span>
              <strong>{result.completedQuestions} pertanyaan</strong>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <span className="block text-xs text-gray-400">Dilewati</span>
              <strong>{result.skippedQuestions} pertanyaan</strong>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Kembali ke Beranda
            </button>
            <button
              type="button"
              onClick={resetQuiz}
              className="flex-1 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
            >
              Ulangi Kuis
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-lg max-w-xl w-full p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Formulir Gaya Belajar VARK <br/>(Visual, Aural, Reading/Write, Khinestetic)</h1>

          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Sebelum masuk ke LMS, silakan lengkapi formulir VARK terlebih
            dahulu.
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>
              Pertanyaan {currentQ + 1} dari {questions.length}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {answeredQuestionCount} pertanyaan telah dijawab
          </p>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          {currentQuestion.question}
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Pilih satu atau beberapa jawaban yang paling sesuai. Lewati pertanyaan
          apabila tidak ada pilihan yang sesuai.
        </p>

        <div className="space-y-3">
          {displayedOptions.map((option, index) => {
            const displayLabel = String.fromCharCode(65 + index);
            const selected = isSelected(option.type);

            return (
              <button
                type="button"
                key={`${currentQuestion.id}-${option.type}`}
                onClick={() => toggleOption(option.type)}
                aria-pressed={selected}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 text-gray-700 ${
                  selected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${
                      selected
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {selected && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span>
                    <span className="font-semibold text-blue-600 mr-1">
                      {displayLabel}.
                    </span>
                    {option.text}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3 mt-7">
          <button
            type="button"
            onClick={handleBack}
            className={`text-sm text-gray-500 hover:text-gray-700 ${
              currentQ === 0 ? "invisible" : ""
            }`}
          >
            ← Sebelumnya
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium disabled:opacity-50"
            >
              Lewati
            </button>
            <button
              type="button"
              onClick={goToNextQuestion}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {currentQ === questions.length - 1
                ? loading
                  ? "Menyimpan..."
                  : "Lihat Hasil"
                : "Selanjutnya →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VarkQuiz;
