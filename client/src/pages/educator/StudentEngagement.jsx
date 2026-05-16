import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";

const kategoriStyle = {
  green: { bg: "bg-green-100", text: "text-green-700", label: "Sangat Aktif" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Aktif" },
  orange: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "Kurang Aktif",
  },
  red: { bg: "bg-red-100", text: "text-red-700", label: "Tidak Aktif" },
};

const sesColor = (ses) => {
  if (ses >= 80) return "text-green-600";
  if (ses >= 65) return "text-yellow-600";
  if (ses >= 50) return "text-orange-500";
  return "text-red-500";
};

const fmtDur = (sec) => {
  if (!sec || sec === 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
};

const DurBar = ({ actual, expected }) => {
  const pct = expected > 0 ? Math.min((actual / expected) * 100, 100) : 0;
  const color =
    pct >= 80 ? "bg-green-400" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {Math.round(pct)}%
      </span>
    </div>
  );
};

const StudentEngagement = () => {
  const { backendUrl } = useContext(AppContext);
  const [sesData, setSesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const fetchSES = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("dosenToken");
      const { data } = await axios.get(backendUrl + "/api/educator/ses", {
        headers: { Authorization: `Bearer ${token}` },
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
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = sesData.filter(
    (s) =>
      s.nama?.toLowerCase().includes(search.toLowerCase()) ||
      s.npp?.toString().includes(search),
  );

  const exportCSV = () => {
    const header = [
      "No",
      "NPP",
      "Nama",
      "Interaksi (%)",
      "Feedback (%)",
      "Presensi (%)",
      "SES (%)",
      "Total Durasi",
      "Kategori",
    ];
    const rows = filtered.map((s, i) => [
      i + 1,
      s.npp,
      s.nama,
      s.interaksi,
      s.feedback,
      s.presensi,
      s.ses,
      fmtDur(s.totalDurasiDetik),
      s.kategori,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SES_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gray-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Student Engagement Score (SES)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Laporan keterlibatan praja — klik baris untuk melihat rincian
            aktivitas
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

      {/* Ringkasan statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Praja",
            value: sesData.length,
            color: "text-blue-600",
          },
          {
            label: "Sangat Aktif",
            value: sesData.filter((s) => s.kategoriColor === "green").length,
            color: "text-green-600",
          },
          {
            label: "Aktif",
            value: sesData.filter((s) => s.kategoriColor === "yellow").length,
            color: "text-yellow-600",
          },
          {
            label: "Kurang Aktif",
            value: sesData.filter((s) =>
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

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau NPP..."
          className="w-full md:w-80 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Tabel SES */}
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
                  Bobot 30% · durasi tonton
                </span>
              </th>
              <th className="px-4 py-3 text-center">
                Feedback
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
                const hasDetail = s.detail?.length > 0;

                return (
                  <React.Fragment key={rowKey}>
                    {/* Baris utama */}
                    <tr
                      onClick={() => hasDetail && toggleRow(rowKey)}
                      className={`transition-colors ${hasDetail ? "cursor-pointer hover:bg-blue-50" : "hover:bg-gray-50"} ${isOpen ? "bg-blue-50" : ""}`}
                    >
                      {/* Chevron */}
                      <td className="px-3 py-3 text-gray-300 text-center select-none">
                        {hasDetail ? (
                          <span
                            className={`inline-block transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
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
                        100%
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

                    {/* Baris detail (expandable) */}
                    {isOpen && hasDetail && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-0 py-0 border-b border-blue-100"
                        >
                          <div className="px-8 py-4 bg-blue-50">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
                              Rincian Aktivitas — {s.nama}
                            </p>
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="text-gray-500 border-b border-blue-100">
                                  <th className="text-left pb-2 pr-4">
                                    Objek Pembelajaran
                                  </th>
                                  <th className="text-center pb-2 px-4">
                                    Diakses
                                  </th>
                                  <th className="text-center pb-2 px-4">
                                    Selesai
                                  </th>
                                  <th className="text-left pb-2 px-4 w-48">
                                    Durasi Tonton
                                  </th>
                                  <th className="text-center pb-2 px-4">
                                    % Durasi
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {s.detail.map((d, di) => (
                                  <tr key={di} className="hover:bg-blue-100/40">
                                    <td className="py-2 pr-4 font-medium text-gray-700">
                                      {d.lectureTitle}
                                    </td>
                                    <td className="py-2 px-4 text-center text-gray-600">
                                      {d.accessCount}x
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
                                  <td className="pt-2 pr-4">Total</td>
                                  <td className="pt-2 px-4 text-center">
                                    {s.detail.reduce(
                                      (a, d) => a + (d.accessCount || 0),
                                      0,
                                    )}x
                                  </td>
                                  <td className="pt-2 px-4 text-center">
                                    {s.detail.reduce(
                                      (a, d) => a + (d.selesai ? 1 : 0),
                                      0,
                                    )}{" "}
                                    /{" "}
                                    {s.detail.length}
                                  </td>
                                  <td className="pt-2 px-4 font-mono">
                                    {fmtDur(s.totalDurasiDetik)}
                                    <span className="text-gray-400 ml-1">
                                      /{" "}
                                      {fmtDur(
                                        s.detail.reduce(
                                          (a, d) => a + d.expectedDurSec,
                                          0,
                                        ),
                                      )}
                                    </span>
                                  </td>
                                  <td className="pt-2 px-4">
                                    <DurBar
                                      actual={s.totalDurasiDetik}
                                      expected={s.detail.reduce(
                                        (a, d) => a + d.expectedDurSec,
                                        0,
                                      )}
                                    />
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
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

      {/* Keterangan formula */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
        <p className="font-semibold mb-1">Formula SES:</p>
        <p>SES = (Interaksi × 30%) + (Feedback × 30%) + (Presensi × 40%)</p>
        <p className="mt-1 text-blue-500">
          Interaksi = durasi tonton aktual ÷ total durasi video &nbsp;|&nbsp;
          Feedback = lecture yang ditandai selesai &nbsp;|&nbsp; Presensi = 100%
          (diasumsikan hadir)
        </p>
      </div>
    </div>
  );
};

export default StudentEngagement;
