import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";

const MEETINGS = [3, 4, 5, 6, 7];
const HURUF = ["A", "B", "C", "D"];
const JUMLAH_SOAL = 10;

const soalKosong = () => ({
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
});

const KelolaKuis = () => {
  const { backendUrl } = useContext(AppContext);

  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // null = tidak ada editor terbuka
  const [editor, setEditor] = useState(null);

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem("dosenToken")}`,
  });

  const fetchCourses = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/educator/courses", {
        headers: headers(),
      });
      if (data.success) {
        setCourses(data.courses || []);
        if (!courseId && data.courses?.length) setCourseId(data.courses[0]._id);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const fetchQuizzes = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const { data } = await axios.get(backendUrl + "/api/educator/quizzes", {
        headers: headers(),
        params: { courseId },
      });
      if (data.success) setQuizzes(data.quizzes || []);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [courseId]);

  const bukaEditorBaru = (pertemuan) => {
    setEditor({
      mode: "baru",
      quizId: null,
      pertemuan,
      title: "",
      duration: 15,
      isPublished: true,
      questions: Array.from({ length: JUMLAH_SOAL }, soalKosong),
      terkunci: false,
    });
  };

  const bukaEditorUbah = async (quizId) => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/educator/quizzes/${quizId}`,
        { headers: headers() },
      );
      if (!data.success) return toast.error(data.message);

      setEditor({
        mode: "ubah",
        quizId,
        pertemuan: data.quiz.pertemuan,
        title: data.quiz.title,
        duration: data.quiz.duration,
        isPublished: data.quiz.isPublished,
        questions: data.quiz.questions,
        terkunci: data.jumlahPengerjaan > 0,
        jumlahPengerjaan: data.jumlahPengerjaan,
      });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const ubahSoal = (index, patch) => {
    setEditor((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, ...patch } : q,
      ),
    }));
  };

  const ubahOpsi = (index, opsiIndex, nilai) => {
    setEditor((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index
          ? {
              ...q,
              options: q.options.map((o, oi) => (oi === opsiIndex ? nilai : o)),
            }
          : q,
      ),
    }));
  };

  const simpan = async () => {
    try {
      setSaving(true);

      const payload = {
        title: editor.title,
        duration: editor.duration,
        isPublished: editor.isPublished,
      };

      if (!editor.terkunci) payload.questions = editor.questions;

      const { data } =
        editor.mode === "baru"
          ? await axios.post(
              backendUrl + "/api/educator/quizzes",
              { ...payload, courseId, pertemuan: editor.pertemuan },
              { headers: headers() },
            )
          : await axios.put(
              `${backendUrl}/api/educator/quizzes/${editor.quizId}`,
              payload,
              { headers: headers() },
            );

      if (data.success) {
        toast.success(data.message);
        setEditor(null);
        fetchQuizzes();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const hapusKuis = async (quizId) => {
    if (!window.confirm("Hapus kuis ini?")) return;
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/educator/quizzes/${quizId}`,
        { headers: headers() },
      );
      if (data.success) {
        toast.success(data.message);
        fetchQuizzes();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const quizByMeeting = useMemo(() => {
    const map = new Map(MEETINGS.map((m) => [m, []]));
    quizzes.forEach((q) => {
      if (map.has(q.pertemuan)) map.get(q.pertemuan).push(q);
    });
    return map;
  }, [quizzes]);

  if (loading && !editor) return <Loading />;

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kelola Kuis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Setiap pertemuan memiliki satu kuis berisi 10 soal.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Mata Kuliah
        </label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full md:w-96 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.courseTitle}
            </option>
          ))}
        </select>
      </div>

      {editor ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {editor.mode === "baru" ? "Buat Kuis" : "Ubah Kuis"} &mdash;
                Pertemuan {editor.pertemuan}
              </h2>
              {editor.terkunci && (
                <p className="text-xs text-amber-600 mt-1">
                  Soal terkunci: kuis sudah dikerjakan {editor.jumlahPengerjaan}{" "}
                  praja. Hanya judul, durasi, dan status publikasi yang dapat
                  diubah.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditor(null)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Judul Kuis
              </label>
              <input
                type="text"
                value={editor.title}
                onChange={(e) =>
                  setEditor((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Contoh: Kuis Konteks Proyek SI Pemerintahan"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Durasi (menit)
              </label>
              <input
                type="number"
                min={1}
                value={editor.duration}
                onChange={(e) =>
                  setEditor((p) => ({ ...p, duration: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="space-y-4">
            {editor.questions.map((q, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-xs font-semibold text-gray-500">
                    Soal {index + 1} dari {JUMLAH_SOAL}
                  </span>
                </div>

                <textarea
                  value={q.question}
                  disabled={editor.terkunci}
                  onChange={(e) => ubahSoal(index, { question: e.target.value })}
                  rows={2}
                  placeholder="Tulis pertanyaan..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3 disabled:bg-gray-100"
                />

                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={editor.terkunci}
                        onClick={() => ubahSoal(index, { correctAnswer: oi })}
                        title="Tandai sebagai kunci jawaban"
                        className={`w-8 h-8 rounded-lg text-xs font-bold shrink-0 transition ${
                          q.correctAnswer === oi
                            ? "bg-emerald-500 text-white"
                            : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {HURUF[oi]}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        disabled={editor.terkunci}
                        onChange={(e) => ubahOpsi(index, oi, e.target.value)}
                        placeholder={`Pilihan ${HURUF[oi]}`}
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:bg-gray-100"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Klik huruf untuk menandai kunci jawaban.
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={editor.isPublished}
                onChange={(e) =>
                  setEditor((p) => ({ ...p, isPublished: e.target.checked }))
                }
              />
              Tampilkan ke praja
            </label>

            <button
              type="button"
              onClick={simpan}
              disabled={saving}
              className="ml-auto px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Kuis"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {MEETINGS.map((pertemuan) => {
            const daftar = quizByMeeting.get(pertemuan) || [];

            return (
              <div
                key={pertemuan}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      Pertemuan {pertemuan}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {daftar.length > 0 ? "Kuis tersedia" : "Belum ada kuis"}
                    </p>
                  </div>
                  {daftar.length === 0 && (
                    <button
                      type="button"
                      onClick={() => bukaEditorBaru(pertemuan)}
                      className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100"
                    >
                      + Buat Kuis
                    </button>
                  )}
                </div>

                {daftar.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Belum ada kuis untuk pertemuan ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {daftar.map((q) => (
                      <div
                        key={q._id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 p-3"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <p className="text-sm font-medium text-gray-800">
                            {q.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {q.jumlahSoal} soal &middot; {q.duration} menit
                            &middot; {q.jumlahPengerjaan} praja mengerjakan
                          </p>
                        </div>

                        {!q.isPublished && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-500">
                            Disembunyikan
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => bukaEditorUbah(q._id)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Lihat / Ubah
                        </button>

                        <button
                          type="button"
                          onClick={() => hapusKuis(q._id)}
                          disabled={q.jumlahPengerjaan > 0}
                          title={
                            q.jumlahPengerjaan > 0
                              ? "Sudah dikerjakan praja"
                              : "Hapus kuis"
                          }
                          className="px-3 py-1.5 rounded-lg border border-red-100 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KelolaKuis;
