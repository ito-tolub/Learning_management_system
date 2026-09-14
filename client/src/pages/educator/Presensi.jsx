import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";

const TOTAL_MEETINGS = 16;
const EXPERIMENT_MEETINGS = 7;

const STATUS_OPTIONS = [
  { value: "hadir", label: "Hadir", style: "bg-emerald-500 text-white", ring: "ring-emerald-200" },
  { value: "sakit", label: "Sakit", style: "bg-amber-500 text-white", ring: "ring-amber-200" },
  { value: "izin", label: "Izin", style: "bg-blue-500 text-white", ring: "ring-blue-200" },
  { value: "alpa", label: "Alpa", style: "bg-red-500 text-white", ring: "ring-red-200" },
];

const StatusPicker = ({ value, onChange }) => (
  <div className="inline-flex gap-1">
    {STATUS_OPTIONS.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(active ? null : opt.value)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
            active
              ? `${opt.style} shadow-sm`
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const Presensi = () => {
  const { backendUrl } = useContext(AppContext);

  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [meeting, setMeeting] = useState(1);
  const [daftar, setDaftar] = useState([]);
  const [rekap, setRekap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const token = () => localStorage.getItem("dosenToken");
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  const fetchCourses = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/educator/courses", {
        headers: headers(),
      });
      if (data.success) {
        setCourses(data.courses || []);
        if (!courseId && data.courses?.length) {
          setCourseId(data.courses[0]._id);
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const fetchSheet = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const { data } = await axios.get(backendUrl + "/api/educator/attendance", {
        headers: headers(),
        params: { courseId, meeting },
      });
      if (data.success) setDaftar(data.daftar || []);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecap = async () => {
    if (!courseId) return;
    try {
      const { data } = await axios.get(
        backendUrl + "/api/educator/attendance/recap",
        { headers: headers(), params: { courseId } },
      );
      if (data.success) setRekap(data.rekap || []);
    } catch (error) {
      // rekap opsional, diamkan
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchSheet();
    fetchRecap();
  }, [courseId, meeting]);

  const setStatus = (userId, status) => {
    setDaftar((prev) =>
      prev.map((row) => (row.userId === userId ? { ...row, status } : row)),
    );
  };

  const tandaiSemuaHadir = () => {
    setDaftar((prev) => prev.map((row) => ({ ...row, status: "hadir" })));
  };

  const simpan = async () => {
    const entries = daftar
      .filter((row) => row.status)
      .map((row) => ({
        userId: row.userId,
        status: row.status,
        keterangan: row.keterangan || "",
      }));

    if (entries.length === 0) {
      toast.warn("Belum ada status yang dipilih");
      return;
    }

    try {
      setSaving(true);
      const { data } = await axios.post(
        backendUrl + "/api/educator/attendance",
        { courseId, meetingNumber: meeting, entries },
        { headers: headers() },
      );
      if (data.success) {
        toast.success(data.message);
        fetchRecap();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return daftar;
    const q = search.trim().toLowerCase();
    return daftar.filter(
      (row) =>
        row.nama?.toLowerCase().includes(q) ||
        String(row.npp || "").toLowerCase().includes(q),
    );
  }, [daftar, search]);

  const ringkasan = useMemo(() => {
    const hitung = { hadir: 0, sakit: 0, izin: 0, alpa: 0, kosong: 0 };
    daftar.forEach((row) => {
      if (row.status) hitung[row.status] += 1;
      else hitung.kosong += 1;
    });
    return hitung;
  }, [daftar]);

  const rekapByMeeting = useMemo(
    () => new Map(rekap.map((r) => [r.meetingNumber, r])),
    [rekap],
  );

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Presensi Perkuliahan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pertemuan 1&ndash;{EXPERIMENT_MEETINGS} termasuk periode penelitian dan
          dihitung dalam Student Engagement Score.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Mata Kuliah
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.courseTitle}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={tandaiSemuaHadir}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Tandai semua hadir
          </button>

          <button
            type="button"
            onClick={simpan}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Presensi"}
          </button>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-gray-500 mb-2">Pertemuan</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: TOTAL_MEETINGS }, (_, i) => i + 1).map((n) => {
              const active = meeting === n;
              const tercatat = rekapByMeeting.get(n);
              const dalamPenelitian = n <= EXPERIMENT_MEETINGS;

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMeeting(n)}
                  title={
                    tercatat
                      ? `${tercatat.hadir} hadir dari ${tercatat.total} tercatat`
                      : "Belum ada data"
                  }
                  className={`relative w-11 h-11 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : dalamPenelitian
                        ? "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50"
                        : "bg-white border border-gray-200 text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {n}
                  {tercatat && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Biru: pertemuan periode penelitian. Titik hijau: presensi sudah tercatat.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Hadir", value: ringkasan.hadir, color: "text-emerald-600" },
          { label: "Sakit", value: ringkasan.sakit, color: "text-amber-600" },
          { label: "Izin", value: ringkasan.izin, color: "text-blue-600" },
          { label: "Alpa", value: ringkasan.alpa, color: "text-red-600" },
          { label: "Belum diisi", value: ringkasan.kosong, color: "text-gray-400" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-gray-400">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Daftar Praja &mdash; Pertemuan {meeting}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {filtered.length} praja ditampilkan
            </p>
          </div>
          <input
            type="text"
            placeholder="Cari nama atau NPP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="py-3 px-4 font-medium">Praja</th>
                  <th className="py-3 px-4 font-medium">Kelas</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-sm text-gray-400">
                      Tidak ada praja yang cocok.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.userId}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800">{row.nama}</p>
                        <p className="text-xs text-gray-400">{row.npp || "-"}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {row.kelas || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <StatusPicker
                          value={row.status}
                          onChange={(status) => setStatus(row.userId, status)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 mt-6 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
        <p className="font-semibold mb-1">Catatan perhitungan:</p>
        <p>
          Hanya status <strong>Hadir</strong> yang dihitung sebagai kehadiran pada
          Student Engagement Score. Status Sakit, Izin, dan Alpa tetap tercatat
          untuk keperluan administrasi akademik, tetapi tidak menambah nilai
          komponen presensi.
        </p>
      </div>
    </div>
  );
};

export default Presensi;
