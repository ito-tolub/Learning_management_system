// ============================================================
// GANTI ISI client/src/pages/educator/VarkSummary.jsx dengan versi ini
// (menambahkan kolom Gaya Kuisioner vs Gaya Adaptif + breakdown sumber)
// ============================================================
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";

const TAG_META = {
  V: { label: "Visual", color: "bg-blue-500", light: "bg-blue-50 text-blue-700" },
  A: { label: "Auditory", color: "bg-purple-500", light: "bg-purple-50 text-purple-700" },
  R: { label: "Reading/Writing", color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700" },
  K: { label: "Kinesthetic", color: "bg-orange-500", light: "bg-orange-50 text-orange-700" },
  UNTAGGED: { label: "Belum Ditag", color: "bg-gray-400", light: "bg-gray-50 text-gray-600" },
};

const fmtMinutes = (m) => {
  if (!m || m === 0) return "0 mnt";
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  const rest = Math.round(m % 60);
  return `${h}j ${rest}m`;
};

const VarkBar = ({ tag, minutes, maxMinutes }) => {
  const meta = TAG_META[tag] || TAG_META.UNTAGGED;
  const pct = maxMinutes > 0 ? Math.max((minutes / maxMinutes) * 100, minutes > 0 ? 2 : 0) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 text-xs font-bold text-gray-500">{tag === "UNTAGGED" ? "—" : tag}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${meta.color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-20 text-right text-xs font-mono text-gray-600">{fmtMinutes(minutes)}</span>
    </div>
  );
};

const VarkCard = ({ tag, data }) => {
  const meta = TAG_META[tag] || TAG_META.UNTAGGED;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.light}`}>
        {tag === "UNTAGGED" ? meta.label : `${tag} · ${meta.label}`}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-800">{fmtMinutes(data.totalMinutes)}</p>
      <p className="text-xs text-gray-400 mt-1">
        {data.lecturesAccessed} objek diakses · {data.accessCount}x akses
      </p>
    </div>
  );
};

const TagBadgeList = ({ tags, emptyLabel = "Belum ada data" }) => {
  if (!tags || tags.length === 0) {
    return <span className="text-xs text-gray-400">{emptyLabel}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => {
        const meta = TAG_META[tag] || TAG_META.UNTAGGED;
        return (
          <span key={tag} className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.light}`}>
            {tag}
          </span>
        );
      })}
    </div>
  );
};

const StudentRow = ({ student }) => {
  const [expanded, setExpanded] = useState(false);
  const mainTags = student.tags.filter((t) => t.tag !== "UNTAGGED");
  const src = student.adaptiveSources || {};

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="py-3 px-4">
          <p className="font-medium text-gray-800">{student.nama}</p>
          <p className="text-xs text-gray-400">{student.npp}</p>
        </td>
        <td className="py-3 px-4 text-sm text-gray-500">{student.kelas}</td>
        <td className="py-3 px-4">
          <TagBadgeList tags={student.quizDominant} emptyLabel="Belum kuisioner" />
        </td>
        <td className="py-3 px-4 text-sm text-gray-600">
          {student.readingDominantTag ? (
            <TagBadgeList tags={[student.readingDominantTag]} />
          ) : (
            <span className="text-xs text-gray-400">Belum ada aktivitas</span>
          )}
        </td>
        <td className="py-3 px-4">
          <TagBadgeList tags={student.adaptiveDominant} emptyLabel="Belum ada data" />
        </td>
        <td className="py-3 px-4 text-sm font-medium text-gray-700 text-right">
          {fmtMinutes(student.totalMinutesAll)}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50/60">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Waktu akses per tag (menit)</p>
                <div className="space-y-2">
                  {mainTags.map((t) => (
                    <VarkBar
                      key={t.tag}
                      tag={t.tag}
                      minutes={t.totalMinutes}
                      maxMinutes={Math.max(...mainTags.map((x) => x.totalMinutes), 1)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  Skor adaptif (kuisioner {Math.round((src.quizWeight ?? 0.5) * 100)}% + waktu baca{" "}
                  {Math.round((src.readingWeight ?? 0.5) * 100)}%)
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left font-medium pb-1">Tag</th>
                      <th className="text-right font-medium pb-1">Kuisioner</th>
                      <th className="text-right font-medium pb-1">Waktu Baca</th>
                      <th className="text-right font-medium pb-1">Adaptif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["V", "A", "R", "K"].map((tag) => (
                      <tr key={tag} className="border-t border-gray-100">
                        <td className="py-1 font-semibold text-gray-600">{tag}</td>
                        <td className="py-1 text-right text-gray-500">{src.quizPercent?.[tag] ?? 0}%</td>
                        <td className="py-1 text-right text-gray-500">{src.readingPercent?.[tag] ?? 0}%</td>
                        <td className="py-1 text-right font-semibold text-gray-800">
                          {student.adaptiveScores?.[tag] ?? 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const VarkSummary = () => {
  const { backendUrl } = useContext(AppContext);

  const [overall, setOverall] = useState([]);
  const [byKelas, setByKelas] = useState({ G1: [], G2: [] });
  const [perStudent, setPerStudent] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("dosenToken");
      const { data } = await axios.get(backendUrl + "/api/educator/vark-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setOverall(data.overall);
        setByKelas(data.byKelas);
        setPerStudent(data.perStudent || []);
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
    fetchSummary();
  }, []);

  const activeData = selectedKelas === "ALL" ? overall : byKelas[selectedKelas] || [];
  const maxMinutes = Math.max(...activeData.map((d) => d.totalMinutes || 0), 1);
  const mainTags = activeData.filter((d) => d.tag !== "UNTAGGED");
  const untagged = activeData.find((d) => d.tag === "UNTAGGED");

  const filteredStudents = useMemo(() => {
    return perStudent
      .filter((s) => selectedKelas === "ALL" || s.kelas === selectedKelas)
      .filter((s) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return s.nama.toLowerCase().includes(q) || String(s.npp).toLowerCase().includes(q);
      });
  }, [perStudent, selectedKelas, search]);

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gray-50">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ringkasan Durasi Akses per Gaya VARK</h1>
          <p className="text-sm text-gray-500 mt-1">
            Profil VARK adaptif: 50% hasil kuisioner + 50% pola waktu baca aktual
          </p>
        </div>

        <button
          onClick={fetchSummary}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 shadow-sm h-fit"
        >
          🔄 Perbarui
        </button>
      </div>

      {/* FILTER KELAS */}
      <div className="mb-6">
        <div className="inline-flex p-1 bg-gray-100 rounded-xl">
          {["ALL", "G1", "G2"].map((kelas) => {
            const active = selectedKelas === kelas;
            return (
              <button
                key={kelas}
                type="button"
                onClick={() => setSelectedKelas(kelas)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {kelas === "ALL" ? "Semua Kelas" : `Kelas ${kelas}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* KARTU RINGKASAN PER TAG (AGREGAT DURASI, BUKAN ADAPTIF) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {["V", "A", "R", "K"].map((tag) => {
          const data = activeData.find((d) => d.tag === tag) || {
            totalMinutes: 0,
            lecturesAccessed: 0,
            accessCount: 0,
          };
          return <VarkCard key={tag} tag={tag} data={data} />;
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-4">Perbandingan Total Durasi (Semua Praja)</p>
        <div className="space-y-3">
          {mainTags.map((d) => (
            <VarkBar key={d.tag} tag={d.tag} minutes={d.totalMinutes} maxMinutes={maxMinutes} />
          ))}
        </div>
        {untagged && untagged.lecturesAccessed > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Objek tanpa tag VARK (belum dikategorikan):</p>
            <VarkBar tag="UNTAGGED" minutes={untagged.totalMinutes} maxMinutes={maxMinutes} />
          </div>
        )}
      </div>

      {/* TABEL PER SISWA */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-700">Profil VARK per Praja</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Klik baris untuk lihat breakdown skor. {filteredStudents.length} praja ditampilkan.
            </p>
          </div>
          <input
            type="text"
            placeholder="Cari nama atau NPP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-3 px-4 font-medium">Praja</th>
                <th className="py-3 px-4 font-medium">Kelas</th>
                <th className="py-3 px-4 font-medium">Gaya Kuisioner</th>
                <th className="py-3 px-4 font-medium">Gaya Waktu Baca</th>
                <th className="py-3 px-4 font-medium">Gaya Adaptif (50:50)</th>
                <th className="py-3 px-4 font-medium text-right">Total Menit</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                    Tidak ada praja yang cocok dengan pencarian/filter ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => <StudentRow key={s.userId} student={s} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CATATAN */}
      <div className="p-4 mt-6 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
        <p className="font-semibold mb-1">Cara membaca data ini:</p>
        <p>
          "Gaya Adaptif" menggabungkan hasil kuisioner VARK (bobot 50%) dengan pola waktu baca aktual di setiap
          modalitas (bobot 50%). Jika praja belum mengisi kuisioner atau belum punya riwayat akses, bobot otomatis
          dialihkan 100% ke sumber yang tersedia. Klik baris praja untuk melihat rincian persentase tiap sumber.
        </p>
      </div>
    </div>
  );
};

export default VarkSummary;
