import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";

const kategoriStyle = {
  green: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Sangat Aktif",
  },

  yellow: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "Aktif",
  },

  orange: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "Kurang Aktif",
  },

  red: {
    bg: "bg-red-100",
    text: "text-red-700",
    label: "Tidak Aktif",
  },
};

const sesColor = (ses) => {
  if (ses >= 80) {
    return "text-green-600";
  }

  if (ses >= 65) {
    return "text-yellow-600";
  }

  if (ses >= 50) {
    return "text-orange-500";
  }

  return "text-red-500";
};

const fmtDur = (sec) => {
  if (!sec || sec === 0) {
    return "—";
  }

  const h = Math.floor(sec / 3600);

  const m = Math.floor((sec % 3600) / 60);

  const s = sec % 60;

  if (h > 0) {
    return `${h}j ${m}m`;
  }

  if (m > 0) {
    return `${m}m ${s}d`;
  }

  return `${s}d`;
};

const PctBar = ({ value }) => {
  const pct = Math.max(0, Math.min(Number(value || 0), 100));

  const color =
    pct >= 80 ? "bg-green-400" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{
            width: `${pct}%`,
          }}
        />
      </div>

      <span className="text-xs text-gray-500 whitespace-nowrap">
        {Math.round(pct)}%
      </span>
    </div>
  );
};

const DurBar = ({ actual, expected }) => {
  const pct = expected > 0 ? Math.min((actual / expected) * 100, 100) : 0;

  return <PctBar value={pct} />;
};

const roleLabel = (role) => {
  if (role === "main") {
    return "Utama";
  }

  if (role === "recommended") {
    return "Rekomendasi";
  }

  if (role === "free-choice") {
    return "Pilihan";
  }

  return "Target";
};

const roleClass = (role) => {
  if (role === "main") {
    return "bg-slate-100 text-slate-700";
  }

  if (role === "recommended") {
    return "bg-purple-100 text-purple-700";
  }

  if (role === "free-choice") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-gray-100 text-gray-600";
};

const StatBox = ({ label, value, note }) => (
  <div className="rounded-lg border border-gray-100 bg-white p-3">
    <p className="text-lg font-bold text-gray-800">{value}</p>

    <p className="text-[11px] font-medium text-gray-600">{label}</p>

    {note ? <p className="mt-0.5 text-[10px] text-gray-400">{note}</p> : null}
  </div>
);

const StudentEngagement = () => {
  const { backendUrl } = useContext(AppContext);

  const [sesData, setSesData] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [selectedKelas, setSelectedKelas] = useState("G1");

  const [lastUpdated, setLastUpdated] = useState(null);

  const [expandedRows, setExpandedRows] = useState(new Set());

  const fetchSES = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("dosenToken");

      const { data } = await axios.get(backendUrl + "/api/educator/ses", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setSesData(data.sesData);

        setLastUpdated(new Date().toLocaleString("id-ID"));

        setExpandedRows(new Set());
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
    fetchSES();
  }, []);

  const toggleRow = (key) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  const kelasData = sesData.filter(
    (s) => s.kelas?.toUpperCase() === selectedKelas,
  );

  const filtered = kelasData.filter(
    (s) =>
      s.nama?.toLowerCase().includes(search.toLowerCase()) ||
      s.npp?.toString().includes(search),
  );

  const jumlahPerKelas = {
    G1: sesData.filter((s) => s.kelas?.toUpperCase() === "G1").length,

    G2: sesData.filter((s) => s.kelas?.toUpperCase() === "G2").length,
  };

    const avgPct = (list, key) => {
    if (!list.length) return 0;

    const total = list.reduce((sum, s) => sum + Number(s[key] || 0), 0);

    return Math.round((total / list.length) * 10) / 10;
  };

  const kelasSummary = ["G1", "G2"].reduce((acc, kelas) => {
    const list = sesData.filter((s) => s.kelas?.toUpperCase() === kelas);

    acc[kelas] = {
      interaksi: avgPct(list, "interaksi"),
      penyelesaian: avgPct(list, "feedback"),
      presensi: avgPct(list, "presensi"),
      ses: avgPct(list, "ses"),
    };

    return acc;
  }, {});

  const handleKelasChange = (kelas) => {
    setSelectedKelas(kelas);

    setSearch("");

    setExpandedRows(new Set());
  };
  const exportCSV = () => {
    const header = [
      "No",
      "Kelas",
      "NPP",
      "Nama",
      "Interaksi Target (%)",
      "Penyelesaian Materi Target (%)",
      "Presensi (%)",
      "SES (%)",
      "Total Durasi",
      "Objek Eksplorasi",
      "Akses Eksplorasi",
      "Eksplorasi Selesai",
      "Rata-rata Interaksi Eksplorasi (%)",
      "Durasi Eksplorasi",
      "Recommendation Adherence (%)",
      "Kategori",
    ];

    const rows = filtered.map((s, i) => [
      i + 1,
      s.kelas,
      s.npp,
      s.nama,
      s.interaksi,
      s.feedback,
      s.presensi,
      s.ses,

      fmtDur(s.totalDurasiDetik),

      s.exploration?.count || 0,

      s.exploration?.accessCount || 0,

      s.exploration?.completedCount || 0,

      s.exploration?.averageInteractionPercent || 0,

      fmtDur(s.exploration?.durationSec || 0),

      s.recommendationAdherence?.durationPercent ?? "",

      s.kategori,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = `SES_${selectedKelas}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gray-50">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Student Engagement Score (SES)
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Laporan keterlibatan praja pada learning path eksperimen
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <p className="text-xs text-gray-400">Diperbarui: {lastUpdated}</p>
          )}

          <button
            onClick={fetchSES}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 shadow-sm"
          >
            🔄 Perbarui
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 shadow-sm"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* FILTER KELAS */}
      <div className="mb-6">
        <div className="inline-flex p-1 bg-gray-100 rounded-xl">
          {["G1", "G2"].map((kelas) => {
            const active = selectedKelas === kelas;

            return (
              <button
                key={kelas}
                type="button"
                onClick={() => handleKelasChange(kelas)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Kelas {kelas}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    active
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {jumlahPerKelas[kelas]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RINGKASAN */}
            {/* RINGKASAN PERSENTASE PER KELAS */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {["G1", "G2"].map((kelas) => (
          <div
            key={kelas}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
          >
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Kelas {kelas}{" "}
              <span className="text-gray-400 font-normal">
                ({jumlahPerKelas[kelas]} praja)
              </span>
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Interaksi</span>
                  <span>{kelasSummary[kelas].interaksi}%</span>
                </div>
                <PctBar value={kelasSummary[kelas].interaksi} />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Penyelesaian Materi</span>
                  <span>{kelasSummary[kelas].penyelesaian}%</span>
                </div>
                <PctBar value={kelasSummary[kelas].penyelesaian} />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Presensi</span>
                  <span>{kelasSummary[kelas].presensi}%</span>
                </div>
                <PctBar value={kelasSummary[kelas].presensi} />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="font-medium text-gray-700">
                    Total Engagement Score (SES)
                  </span>
                  <span className={`font-semibold ${sesColor(kelasSummary[kelas].ses)}`}>
                    {kelasSummary[kelas].ses}%
                  </span>
                </div>
                <PctBar value={kelasSummary[kelas].ses} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: `Total Praja ${selectedKelas}`,

            value: kelasData.length,

            color: "text-blue-600",
          },

          {
            label: "Sangat Aktif",

            value: kelasData.filter((s) => s.kategoriColor === "green").length,

            color: "text-green-600",
          },

          {
            label: "Aktif",

            value: kelasData.filter((s) => s.kategoriColor === "yellow").length,

            color: "text-yellow-600",
          },

          {
            label: "Kurang Aktif",

            value: kelasData.filter((s) =>
              ["orange", "red"].includes(s.kategoriColor),
            ).length,

            color: "text-red-500",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>

            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* SEARCH */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Cari nama atau NPP kelas ${selectedKelas}...`}
          className="w-full md:w-80 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* TABEL */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 w-6"></th>

              <th className="px-4 py-3 text-center">No.</th>

              <th className="px-4 py-3 text-left">NPP</th>

              <th className="px-4 py-3 text-left">Nama Praja</th>

              <th className="px-4 py-3 text-center">
                Interaksi
                <span className="block text-gray-400 font-normal normal-case tracking-normal">
                  Bobot 30%
                </span>
              </th>

              <th className="px-4 py-3 text-center">
                Penyelesaian Materi
                <span className="block text-gray-400 font-normal normal-case tracking-normal">
                  Bobot 30%
                </span>
              </th>

              <th className="px-4 py-3 text-center">
                Presensi
                <span className="block text-gray-400 font-normal normal-case tracking-normal">
                  Bobot 40%
                </span>
              </th>

              <th className="px-4 py-3 text-center">Total Durasi</th>

              <th className="px-4 py-3 text-center">Engagement Score</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-400">
                  Tidak ada data praja
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => {
                const style =
                  kategoriStyle[s.kategoriColor] || kategoriStyle.red;

                const rowKey = s.npp?.toString() ?? String(i);

                const isOpen = expandedRows.has(rowKey);

                const hasDetail =
                  (s.detail?.length || 0) > 0 ||
                  (s.exploration?.count || 0) > 0;

                return (
                  <React.Fragment key={rowKey}>
                    {/* BARIS UTAMA */}
                    <tr
                      onClick={() => hasDetail && toggleRow(rowKey)}
                      className={`transition-colors ${
                        hasDetail
                          ? "cursor-pointer hover:bg-blue-50"
                          : "hover:bg-gray-50"
                      } ${isOpen ? "bg-blue-50" : ""}`}
                    >
                      <td className="px-3 py-3 text-gray-300 text-center select-none">
                        {hasDetail ? (
                          <span
                            className={`inline-block transition-transform duration-200 ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          >
                            ▶
                          </span>
                        ) : (
                          <span className="opacity-20">▶</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center text-gray-400">
                        {i + 1}
                      </td>

                      <td className="px-4 py-3 text-gray-600 font-mono">
                        {s.npp || "—"}
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-800">
                        {s.nama}
                      </td>

                      <td className="px-4 py-3 text-center text-gray-600">
                        {s.interaksi}%
                      </td>

                      <td className="px-4 py-3 text-center text-gray-600">
                        {s.feedback}%
                      </td>

                      <td className="px-4 py-3 text-center text-gray-600">
                        -
                      </td>

                      <td className="px-4 py-3 text-center text-gray-500 font-mono text-xs">
                        {fmtDur(s.totalDurasiDetik)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`text-base font-bold ${sesColor(s.ses)}`}
                          >
                            {s.ses}%
                          </span>

                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}
                          >
                            {s.kategori}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* DETAIL */}
                    {isOpen && hasDetail && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-0 py-0 border-b border-blue-100"
                        >
                          <div className="px-8 py-4 bg-blue-50">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                  Target SES — {s.nama}
                                </p>
                                <p className="mt-1 text-[11px] text-blue-500">
                                  {s.kelas?.toUpperCase() === "G2"
                                    ? "Materi utama + Top-4 rekomendasi hybrid per pertemuan"
                                    : "Materi utama + 4 OBPEM pertama yang benar-benar diakses per pertemuan"}
                                </p>
                              </div>

                              <div className="flex gap-2 text-[11px]">
                                <span className="rounded-full bg-white px-3 py-1 text-blue-700 ring-1 ring-blue-100">
                                  Selesai {s.completionEarned ?? 0}/
                                  {s.completionPossible ?? 0}
                                </span>

                                <span className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-blue-100">
                                  Eksplorasi {s.exploration?.count || 0} objek
                                </span>
                              </div>
                            </div>

                            {/* DETAIL TARGET */}
                            {(s.detail?.length || 0) > 0 && (
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="text-gray-500 border-b border-blue-100">
                                    <th className="text-left pb-2 pr-4">
                                      Objek Pembelajaran
                                    </th>

                                    <th className="text-center pb-2 px-4">
                                      Peran
                                    </th>

                                    <th className="text-center pb-2 px-4">
                                      Diakses
                                    </th>

                                    <th className="text-center pb-2 px-4">
                                      Selesai
                                    </th>

                                    <th className="text-left pb-2 px-4 w-48">
                                      Durasi Baca Materi
                                    </th>

                                    <th className="text-center pb-2 px-4">
                                      % Durasi
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {s.detail.map((d, di) => (
                                    <tr
                                      key={`${d.courseId || "course"}-${d.chapterId || "chapter"}-${d.lectureId || di}`}
                                      className="hover:bg-blue-100/40"
                                    >
                                      <td className="py-2 pr-4 font-medium text-gray-700">
                                        <div>{d.lectureTitle}</div>

                                        <div className="text-[10px] font-normal text-gray-400">
                                          Pertemuan {d.chapterOrder || "—"}
                                          {d.courseTitle
                                            ? ` • ${d.courseTitle}`
                                            : ""}
                                        </div>
                                      </td>

                                      <td className="py-2 px-4 text-center">
                                        <span
                                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${roleClass(
                                            d.role,
                                          )}`}
                                        >
                                          {roleLabel(d.role)}
                                        </span>
                                      </td>

                                      <td className="py-2 px-4 text-center text-gray-600">
                                        {d.accessCount || 0}x
                                      </td>

                                      <td className="py-2 px-4 text-center text-gray-600">
                                        {d.selesai ? "✓" : "—"}
                                      </td>

                                      <td className="py-2 px-4">
                                        <span className="font-mono text-gray-700">
                                          {fmtDur(d.actualDurSec)}
                                        </span>

                                        <span className="text-gray-400 ml-1">
                                          / {fmtDur(d.expectedDurSec)}
                                        </span>
                                      </td>

                                      <td className="py-2 px-4">
                                        <DurBar
                                          actual={d.actualDurSec}
                                          expected={d.expectedDurSec}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>

                                <tfoot>
                                  <tr className="border-t-2 border-blue-200 font-semibold text-gray-700">
                                    <td className="pt-2 pr-4">Total target</td>

                                    <td className="pt-2 px-4 text-center">—</td>

                                    <td className="pt-2 px-4 text-center">
                                      {s.detail.reduce(
                                        (a, d) => a + (d.accessCount || 0),
                                        0,
                                      )}
                                      x
                                    </td>

                                    <td className="pt-2 px-4 text-center">
                                      {s.completionEarned ?? 0}

                                      {" / "}

                                      {s.completionPossible ?? 0}
                                    </td>

                                    <td className="pt-2 px-4 font-mono">
                                      {fmtDur(s.totalDurasiDetik)}

                                      <span className="text-gray-400 ml-1">
                                        /{" "}
                                        {fmtDur(
                                          s.targetExpectedDurasiDetik || 0,
                                        )}
                                      </span>
                                    </td>

                                    <td className="pt-2 px-4">
                                      <PctBar value={s.interaksi} />
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            )}

                            {/* EXPLORATION */}
                            {(s.exploration?.count || 0) > 0 && (
                              <div className="mt-5 rounded-xl border border-gray-200 bg-white/80 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-800">
                                      Eksplorasi di luar target SES
                                    </p>

                                    <p className="mt-1 text-[11px] text-gray-500">
                                      Berlaku untuk G1 dan G2. Data ini tidak
                                      menambah atau mengurangi SES utama.
                                    </p>
                                  </div>

                                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600">
                                    Metrik sekunder
                                  </span>
                                </div>

                                {/* METRIK EXPLORATION */}
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                                  <StatBox
                                    label="Objek dieksplorasi"
                                    value={s.exploration?.count || 0}
                                  />

                                  <StatBox
                                    label="Total akses"
                                    value={`${s.exploration?.accessCount || 0}x`}
                                  />

                                  <StatBox
                                    label="Objek selesai"
                                    value={s.exploration?.completedCount || 0}
                                  />

                                  <StatBox
                                    label="Rata-rata interaksi"
                                    value={`${s.exploration?.averageInteractionPercent || 0}%`}
                                  />

                                  <StatBox
                                    label="Durasi eksplorasi"
                                    value={fmtDur(
                                      s.exploration?.durationSec || 0,
                                    )}
                                  />
                                </div>

                                {/* TOP 4 EXPLORATION */}
                                {(s.exploration?.top4?.length || 0) > 0 && (
                                  <div className="mt-4">
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                      Top-4 objek eksplorasi berdasarkan
                                      interaksi
                                    </p>

                                    <div className="grid gap-2 md:grid-cols-2">
                                      {s.exploration.top4.map((item, index) => (
                                        <div
                                          key={`${item.courseId || "course"}-${item.lectureId}-${index}`}
                                          className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="truncate text-xs font-semibold text-gray-700">
                                                #{index + 1} {item.lectureTitle}
                                              </p>

                                              <p className="mt-0.5 text-[10px] text-gray-400">
                                                Pertemuan{" "}
                                                {item.chapterOrder || "—"}
                                                {item.courseTitle
                                                  ? ` • ${item.courseTitle}`
                                                  : ""}
                                              </p>
                                            </div>

                                            <span className="whitespace-nowrap text-xs font-bold text-gray-700">
                                              {item.interactionPercent ?? 0}%
                                            </span>
                                          </div>

                                          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-gray-500">
                                            <span>
                                              {item.accessCount || 0}x akses
                                            </span>

                                            <span>
                                              {fmtDur(item.durationSec || 0)}
                                            </span>

                                            <span>
                                              {item.selesai
                                                ? "✓ Selesai"
                                                : "Belum selesai"}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* RECOMMENDATION ADHERENCE G2 */}
                                {s.kelas?.toUpperCase() === "G2" && (
                                  <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-xs font-semibold text-purple-800">
                                          Recommendation Adherence
                                        </p>

                                        <p className="mt-1 text-[10px] text-purple-600">
                                          Proporsi durasi efektif pada Top-4
                                          rekomendasi dibanding seluruh
                                          interaksi OBPEM tambahan.
                                        </p>
                                      </div>

                                      <span className="text-lg font-bold text-purple-700">
                                        {s.recommendationAdherence
                                          ?.durationPercent == null
                                          ? "—"
                                          : `${s.recommendationAdherence.durationPercent}%`}
                                      </span>
                                    </div>

                                    <div className="mt-2">
                                      <PctBar
                                        value={
                                          s.recommendationAdherence
                                            ?.durationPercent || 0
                                        }
                                      />
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-purple-600">
                                      <span>
                                        Rekomendasi:{" "}
                                        {fmtDur(
                                          s.recommendationAdherence
                                            ?.recommendedDurationSec || 0,
                                        )}
                                      </span>

                                      <span>
                                        Di luar rekomendasi:{" "}
                                        {fmtDur(
                                          s.recommendationAdherence
                                            ?.outsideRecommendationDurationSec ||
                                            0,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FORMULA */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
        <p className="font-semibold mb-1">Formula SES:</p>

        <p>
          SES = (Interaksi × 30%) + (Penyelesaian Materi × 30%) + (Presensi ×
          40%)
        </p>

        <p className="mt-1 text-blue-500">
          Target G1 = materi utama + maksimal 4 objek tambahan bebas per
          pertemuan. Target G2 = materi utama + maksimal 4 objek rekomendasi
          hybrid per pertemuan.
        </p>

        <p className="mt-1 text-blue-500">
          Interaksi = rata-rata rasio durasi efektif pada objek target. Objek
          target yang tidak diakses bernilai 0. Objek di luar target hanya
          dicatat sebagai eksplorasi dan tidak masuk SES.
        </p>
      </div>
    </div>
  );
};
export default StudentEngagement;
