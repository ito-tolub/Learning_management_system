import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";

const TAGS = ["V", "A", "R", "K"];

const TAG_META = {
  V: { label: "Visual", style: "bg-blue-50 text-blue-700" },
  A: { label: "Auditory", style: "bg-purple-50 text-purple-700" },
  R: { label: "Reading/Writing", style: "bg-emerald-50 text-emerald-700" },
  K: { label: "Kinesthetic", style: "bg-orange-50 text-orange-700" },
};

const fmtDur = (detik) => {
  if (!detik) return "0 mnt";
  const m = Math.round(detik / 60);
  if (m < 60) return `${m} mnt`;
  return `${Math.floor(m / 60)}j ${m % 60}m`;
};

const formKosong = () => ({
  lectureTitle: "",
  lectureUrl: "",
  lectureDuration: 300,
  tags: "V",
  varkvektor: { V: 0, A: 0, R: 0, K: 0 },
  contentGranularity: "",
  cognitiveLevel: "",
});

const ObjekPembelajaran = () => {
  const { backendUrl } = useContext(AppContext);

  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [terbuka, setTerbuka] = useState(null);
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

  const fetchObjects = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const { data } = await axios.get(
        backendUrl + "/api/educator/learning-objects",
        { headers: headers(), params: { courseId } },
      );
      if (data.success) {
        setChapters(data.chapters || []);
        if (terbuka === null && data.chapters?.length) {
          setTerbuka(data.chapters[0].chapterId);
        }
      } else {
        toast.error(data.message);
      }
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
    fetchObjects();
  }, [courseId]);

  const bukaTambah = (chapterId) => {
    setEditor({ mode: "baru", chapterId, lectureId: null, form: formKosong() });
  };

  const bukaUbah = (chapterId, lecture) => {
    setEditor({
      mode: "ubah",
      chapterId,
      lectureId: lecture.lectureId,
      jumlahAkses: lecture.jumlahAkses,
      form: {
        lectureTitle: lecture.lectureTitle || "",
        lectureUrl: lecture.lectureUrl || "",
        lectureDuration: lecture.lectureDuration || 0,
        tags: lecture.tags || "V",
        varkvektor: lecture.varkvektor || { V: 0, A: 0, R: 0, K: 0 },
        contentGranularity: lecture.contentGranularity || "",
        cognitiveLevel: lecture.cognitiveLevel || "",
      },
    });
  };

  const ubahForm = (patch) =>
    setEditor((p) => ({ ...p, form: { ...p.form, ...patch } }));

  const ubahVark = (tag, nilai) =>
    setEditor((p) => ({
      ...p,
      form: { ...p.form, varkvektor: { ...p.form.varkvektor, [tag]: nilai } },
    }));

  const simpan = async () => {
    try {
      setSaving(true);

      const payload = {
        ...editor.form,
        varkvektor: Object.fromEntries(
          TAGS.map((t) => [t, Number(editor.form.varkvektor[t]) || 0]),
        ),
        contentGranularity: editor.form.contentGranularity || null,
        cognitiveLevel: editor.form.cognitiveLevel || null,
      };

      const { data } =
        editor.mode === "baru"
          ? await axios.post(
              `${backendUrl}/api/educator/learning-objects/${courseId}/${editor.chapterId}`,
              payload,
              { headers: headers() },
            )
          : await axios.put(
              `${backendUrl}/api/educator/learning-objects/${courseId}/${editor.chapterId}/${editor.lectureId}`,
              payload,
              { headers: headers() },
            );

      if (data.success) {
        toast.success(data.message);
        setEditor(null);
        fetchObjects();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const totalObjek = useMemo(
    () => chapters.reduce((n, c) => n + c.lectures.length, 0),
    [chapters],
  );

  if (loading && !editor) return <Loading />;

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Objek Pembelajaran</h1>
        <p className="text-sm text-gray-500 mt-1">
          {totalObjek} objek pada {chapters.length} pertemuan.
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
                {editor.mode === "baru"
                  ? "Objek Pembelajaran Baru"
                  : `Ubah ${editor.lectureId}`}
              </h2>
              {editor.mode === "ubah" && editor.jumlahAkses > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Objek ini sudah diakses {editor.jumlahAkses} praja. Mengubah
                  vektor VARK atau durasi akan memengaruhi rekomendasi dan
                  perhitungan SES.
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

          <div className="grid md:grid-cols-2 gap-4 mb-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Judul
              </label>
              <input
                type="text"
                value={editor.form.lectureTitle}
                onChange={(e) => ubahForm({ lectureTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Tautan
              </label>
              <input
                type="text"
                value={editor.form.lectureUrl}
                onChange={(e) => ubahForm({ lectureUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Estimasi waktu akses (detik)
              </label>
              <input
                type="number"
                min={1}
                value={editor.form.lectureDuration}
                onChange={(e) => ubahForm({ lectureDuration: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Modalitas utama
              </label>
              <select
                value={editor.form.tags}
                onChange={(e) => ubahForm({ tags: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                {TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t} &mdash; {TAG_META[t].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Granularitas
              </label>
              <select
                value={editor.form.contentGranularity}
                onChange={(e) =>
                  ubahForm({ contentGranularity: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                <option value="">— tidak diisi —</option>
                <option value="micro">micro</option>
                <option value="macro">macro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Tingkat kognitif
              </label>
              <select
                value={editor.form.cognitiveLevel}
                onChange={(e) => ubahForm({ cognitiveLevel: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                <option value="">— tidak diisi —</option>
                {["C1", "C2", "C3", "C4", "C5", "C6"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">
              Vektor VARK (0,00 &ndash; 1,00)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TAGS.map((t) => (
                <div key={t}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {t} &mdash; {TAG_META[t].label}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={editor.form.varkvektor[t]}
                    onChange={(e) => ubahVark(t, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              Keempat nilai ditetapkan secara independen dan tidak harus
              berjumlah satu.
            </p>
          </div>

          <div className="flex justify-end mt-5">
            <button
              type="button"
              onClick={simpan}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {chapters.map((chapter) => {
            const buka = terbuka === chapter.chapterId;

            return (
              <div
                key={chapter.chapterId}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3 p-5">
                  <button
                    type="button"
                    onClick={() => setTerbuka(buka ? null : chapter.chapterId)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-semibold text-gray-700">
                      {chapter.chapterTitle}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {chapter.chapterId} &middot; {chapter.lectures.length} objek
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => bukaTambah(chapter.chapterId)}
                    className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100"
                  >
                    + Tambah
                  </button>
                </div>

                {buka && (
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <th className="py-3 px-4 font-medium">Objek</th>
                          <th className="py-3 px-4 font-medium">Modalitas</th>
                          <th className="py-3 px-4 font-medium">V / A / R / K</th>
                          <th className="py-3 px-4 font-medium">Kategori</th>
                          <th className="py-3 px-4 font-medium text-right">
                            Akses
                          </th>
                          <th className="py-3 px-4 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {chapter.lectures.map((l) => (
                          <tr
                            key={l.lectureId}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-800 text-sm">
                                  {l.lectureTitle}
                                </p>
                                {l.isMain && (
                                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-600">
                                    Utama
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {l.lectureId} &middot;{" "}
                                {l.lectureDuration || 0} mnt
                              </p>
                            </td>

                            <td className="py-3 px-4">
                              {l.tags ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    TAG_META[l.tags]?.style || ""
                                  }`}
                                >
                                  {l.tags}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-xs font-mono text-gray-600">
                              {l.varkvektor
                                ? TAGS.map((t) =>
                                    Number(l.varkvektor[t] ?? 0).toFixed(2),
                                  ).join(" / ")
                                : "—"}
                            </td>

                            <td className="py-3 px-4 text-xs text-gray-500">
                              {l.contentGranularity || l.cognitiveLevel || "—"}
                            </td>

                            <td className="py-3 px-4 text-xs text-gray-500 text-right">
                              {l.jumlahAkses} praja
                              <br />
                              <span className="text-gray-400">
                                {fmtDur(l.totalDurationSec)}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <a
                                  href={l.lectureUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
                                >
                                  Buka
                                </a>
                                <button
                                  type="button"
                                  onClick={() => bukaUbah(chapter.chapterId, l)}
                                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
                                >
                                  Ubah
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default ObjekPembelajaran;
