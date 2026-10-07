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

  if (ses >= 60) {
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

const PctBar = ({ value, showValue = true }) => {
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

      {showValue && (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {Math.round(pct)}%
        </span>
      )}
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

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/*
 * Diagram lingkaran komposisi objek yang dibuka praja:
 * dibaca >= 30 dtk, < 30 dtk tanpa tanda selesai, < 30 dtk tetapi ditandai selesai.
 */
const ShortAccessDonut = ({ segments, total }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg
      viewBox="0 0 120 120"
      className="h-36 w-36 shrink-0"
      role="img"
      aria-label="Komposisi durasi akses objek pembelajaran"
    >
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth="16"
      />

      {total > 0 &&
        segments
          .filter((seg) => seg.value > 0)
          .map((seg) => {
            const length = (seg.value / total) * circumference;
            const circle = (
              <circle
                key={seg.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
              >
                <title>{`${seg.label}: ${seg.value} objek`}</title>
              </circle>
            );
            offset += length;
            return circle;
          })}

      <text
        x="60"
        y="56"
        textAnchor="middle"
        className="fill-gray-800"
        fontSize="20"
        fontWeight="700"
      >
        {total}
      </text>
      <text
        x="60"
        y="72"
        textAnchor="middle"
        className="fill-gray-400"
        fontSize="9"
      >
        objek dibuka
      </text>
    </svg>
  );
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

  // Tab aktif pada panel detail per praja
  const [detailTabs, setDetailTabs] = useState({});

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

      s.shortInteraction?.count || 0,

      s.shortInteraction?.completedCount || 0,

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
                <PctBar
                  value={kelasSummary[kelas].interaksi}
                  showValue={false}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Penyelesaian Materi</span>
                  <span>{kelasSummary[kelas].penyelesaian}%</span>
                </div>
                <PctBar
                  value={kelasSummary[kelas].penyelesaian}
                  showValue={false}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Presensi</span>
                  <span>{kelasSummary[kelas].presensi}%</span>
                </div>
                <PctBar
                  value={kelasSummary[kelas].presensi}
                  showValue={false}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="font-medium text-gray-700">
                    Total Engagement Score (SES)
                  </span>
                  <span
                    className={`font-semibold ${sesColor(kelasSummary[kelas].ses)}`}
                  >
                    {kelasSummary[kelas].ses}%
                  </span>
                </div>
                <PctBar value={kelasSummary[kelas].ses} showValue={false} />
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

          // {
          //   label: "Praja dengan akses < 30 detik",

          //   value: kelasData.filter((s) => (s.shortInteraction?.count || 0) > 0)
          //     .length,

          //   note: `${kelasData.reduce(
          //     (sum, s) => sum + (s.shortInteraction?.count || 0),
          //     0,
          //   )} interaksi tidak dihitung SES`,

          //   color: "text-rose-600",
          // },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>

            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>

            {stat.note && (
              <p className="text-[11px] text-gray-400 mt-0.5">{stat.note}</p>
            )}
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

              {/* <th className="px-4 py-3 text-center">
                Akses &lt; 30 dtk
                <span className="block text-gray-400 font-normal normal-case tracking-normal">
                  Tidak dihitung SES
                </span>
              </th> */}

              <th className="px-4 py-3 text-center">Engagement Score</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-gray-400">
                  Tidak ada data praja
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => {
                const style =
                  kategoriStyle[s.kategoriColor] || kategoriStyle.red;

                const rowKey = s.npp?.toString() ?? String(i);

                const isOpen = expandedRows.has(rowKey);

                const nonMainDetail = (s.detail || []).filter(
                  (d) => d.role !== "main",
                );

                const shortCount = s.shortInteraction?.count || 0;

                const shortCompleted = s.shortInteraction?.completedCount || 0;

                const hasDetail =
                  (s.detail?.length || 0) > 0 ||
                  (s.exploration?.count || 0) > 0 ||
                  (s.shortInteraction?.totalAccessed || 0) > 0;

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
                        {s.presensi}%                        
                      </td>

                      <td className="px-4 py-3 text-center text-gray-500 font-mono text-xs">
                        {fmtDur(s.totalDurasiDetik)}
                      </td>

                      {/* <td className="px-4 py-3 text-center">
                        {shortCount === 0 ? (
                          <span className="text-gray-300">0</span>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              shortCompleted > 0
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                            title={`${shortCompleted} di antaranya ditandai selesai`}
                          >
                            {shortCount} objek
                            {shortCompleted > 0 && ` (${shortCompleted} ditandai selesai)`}
                          </span>
                        )}
                      </td> */}

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
                          colSpan={10}
                          className="px-0 py-0 border-b border-blue-100"
                        >
                          <div className="px-8 py-4 bg-blue-50">
                            {(() => {
                              const tab = detailTabs[rowKey] || "ringkasan";
                              const setTab = (value) =>
                                setDetailTabs((prev) => ({
                                  ...prev,
                                  [rowKey]: value,
                                }));
                              const isG2 = s.kelas?.toUpperCase() === "G2";
                              const total =
                                s.shortInteraction?.totalAccessed || 0;
                              const valid =
                                s.shortInteraction?.validCount ??
                                Math.max(total - shortCount, 0);
                              const threshold =
                                s.shortInteraction?.thresholdSec || 30;
                              const pct = (n) =>
                                total > 0 ? Math.round((n / total) * 100) : 0;
                              const segments = [
                                {
                                  label: `Dibaca ≥ ${threshold} detik`,
                                  value: valid,
                                  color: "#10b981",
                                  note: "Dihitung dalam SES",
                                },
                                {
                                  label: `Dibuka < ${threshold} detik`,
                                  value: shortCount - shortCompleted,
                                  color: "#f59e0b",
                                  note: "Tidak dihitung SES",
                                },
                                {
                                  label: `Dibuka < ${threshold} detik, ditandai selesai`,
                                  value: shortCompleted,
                                  color: "#e11d48",
                                  note: "Tidak dihitung SES; perlu tindak lanjut",
                                },
                              ];
                              const tabs = [
                                { id: "ringkasan", label: "Ringkasan" },
                                {
                                  id: "acuan",
                                  label: "Objek Acuan",
                                  count: nonMainDetail.length,
                                },
                                {
                                  id: "singkat",
                                  label: `Akses < ${threshold} dtk`,
                                  count: shortCount,
                                  alert: shortCompleted > 0,
                                },
                                {
                                  id: "eksplorasi",
                                  label: "Eksplorasi",
                                  count: s.exploration?.count || 0,
                                },
                                ...(isG2
                                  ? [
                                      {
                                        id: "rekomendasi",
                                        label: "Rekomendasi",
                                      },
                                    ]
                                  : []),
                              ];

                              return (
                                <>
                                  {/* TAB BAR */}
                                  <div
                                    className="mb-4 flex flex-wrap gap-1 border-b border-blue-100"
                                    role="tablist"
                                  >
                                    {tabs.map((t) => (
                                      <button
                                        key={t.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={tab === t.id}
                                        onClick={() => setTab(t.id)}
                                        className={`-mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                                          tab === t.id
                                            ? "border-blue-600 bg-white text-blue-700"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                        }`}
                                      >
                                        {t.label}
                                        {t.count > 0 && (
                                          <span
                                            className={`rounded-full px-1.5 py-0.5 text-[10px] ${t.alert ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-600"}`}
                                          >
                                            {t.count}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                  </div>

                                  {/* TAB: RINGKASAN */}
                                  {tab === "ringkasan" && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                        <StatBox
                                          label="SES"
                                          value={`${s.ses ?? 0}%`}
                                          note={s.kategori}
                                        />
                                        <StatBox
                                          label="Objek acuan selesai"
                                          value={`${s.completionEarned ?? 0}/${s.completionPossible ?? 0}`}
                                        />
                                        <StatBox
                                          label="Objek eksplorasi"
                                          value={s.exploration?.count || 0}
                                        />
                                        {isG2 ? (
                                          <StatBox
                                            label="Kepatuhan rekomendasi"
                                            value={
                                              s.recommendationAdherence
                                                ?.durationPercent == null
                                                ? "—"
                                                : `${s.recommendationAdherence.durationPercent}%`
                                            }
                                          />
                                        ) : (
                                          <StatBox
                                            label="Total durasi acuan"
                                            value={fmtDur(s.totalDurasiDetik)}
                                          />
                                        )}
                                      </div>

                                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                                        <p className="text-xs font-semibold text-gray-800">
                                          Durasi akses objek pembelajaran
                                        </p>
                                        <p className="mt-1 text-[11px] text-gray-500">
                                          Objek yang dibuka kurang dari{" "}
                                          {threshold} detik (durasi kumulatif)
                                          dianggap belum dipelajari: tidak
                                          dihitung dalam SES dan status
                                          selesainya diabaikan.
                                        </p>
                                        {total === 0 ? (
                                          <p className="mt-3 text-xs text-gray-400">
                                            Praja belum membuka objek
                                            pembelajaran.
                                          </p>
                                        ) : (
                                          <div className="mt-3 flex flex-wrap items-center gap-6">
                                            <ShortAccessDonut
                                              segments={segments}
                                              total={total}
                                            />
                                            <ul className="space-y-2.5 text-xs">
                                              {segments.map((seg) => (
                                                <li
                                                  key={seg.label}
                                                  className="flex items-start gap-2"
                                                >
                                                  <span
                                                    className="mt-0.5 h-3 w-3 shrink-0 rounded-sm"
                                                    style={{
                                                      backgroundColor:
                                                        seg.color,
                                                    }}
                                                  />
                                                  <div>
                                                    <p className="font-medium text-gray-800">
                                                      {seg.label}:{" "}
                                                      <span className="font-semibold">
                                                        {seg.value} objek
                                                      </span>{" "}
                                                      <span className="text-gray-400">
                                                        ({pct(seg.value)}%)
                                                      </span>
                                                    </p>
                                                    <p className="text-[11px] text-gray-500">
                                                      {seg.note}
                                                    </p>
                                                  </div>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {shortCount > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => setTab("singkat")}
                                            className="mt-3 text-[11px] font-medium text-rose-700 hover:underline"
                                          >
                                            Lihat {shortCount} objek yang dibuka
                                            kurang dari {threshold} detik →
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* TAB: OBJEK ACUAN */}
                                  {tab === "acuan" && (
                                    <div>
                                      {/* DETAIL TARGET */}
                                      {nonMainDetail.length > 0 && (
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
                                            {nonMainDetail.map((d, di) => (
                                              <tr
                                                key={`${d.courseId || "course"}-${d.chapterId || "chapter"}-${d.lectureId || di}`}
                                                className="hover:bg-blue-100/40"
                                              >
                                                <td className="py-2 pr-4 font-medium text-gray-700">
                                                  <div>{d.lectureTitle}</div>

                                                  <div className="text-[10px] font-normal text-gray-400">
                                                    Pertemuan{" "}
                                                    {d.chapterOrder || "—"}
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
                                              <td className="pt-2 pr-4">
                                                Total target
                                              </td>

                                              <td className="pt-2 px-4 text-center">
                                                —
                                              </td>

                                              <td className="pt-2 px-4 text-center">
                                                {nonMainDetail.reduce(
                                                  (a, d) =>
                                                    a + (d.accessCount || 0),
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
                                                    s.targetExpectedDurasiDetik ||
                                                      0,
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

                                      {nonMainDetail.length === 0 && (
                                        <p className="text-xs text-gray-400">
                                          Belum ada objek acuan.
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* TAB: AKSES SINGKAT */}
                                  {tab === "singkat" &&
                                    (shortCount > 0 ? (
                                      <div className="rounded-xl border border-rose-200 bg-white p-4">
                                        <p className="mb-3 text-[11px] text-gray-500">
                                          Objek berikut dibuka kurang dari{" "}
                                          {threshold} detik (durasi kumulatif),
                                          tidak dihitung dalam SES, dan status
                                          selesainya diabaikan. Baris dengan
                                          status "Ya" pada kolom Ditandai
                                          selesai perlu ditindaklanjuti.
                                        </p>
                                        <table className="w-full text-xs border-collapse">
                                          <thead>
                                            <tr className="text-gray-500 border-b border-rose-100">
                                              <th className="text-left pb-2 pr-4">
                                                Pertemuan
                                              </th>
                                              <th className="text-left pb-2 px-4">
                                                Objek
                                              </th>
                                              <th className="text-center pb-2 px-4">
                                                Durasi
                                              </th>
                                              <th className="text-center pb-2 px-4">
                                                Akses
                                              </th>
                                              <th className="text-center pb-2 px-4">
                                                Ditandai selesai
                                              </th>
                                              <th className="text-center pb-2 px-4">
                                                Akses pertama
                                              </th>
                                            </tr>
                                          </thead>

                                          <tbody>
                                            {(
                                              s.shortInteraction?.details || []
                                            ).map((item) => (
                                              <tr
                                                key={`${item.courseId}-${item.lectureId}`}
                                                className="border-b border-rose-50 last:border-0"
                                              >
                                                <td className="py-1.5 pr-4 text-gray-600">
                                                  {item.chapterOrder
                                                    ? `Pertemuan ${item.chapterOrder}`
                                                    : "—"}
                                                </td>
                                                <td className="py-1.5 px-4 text-gray-800">
                                                  {item.lectureTitle}
                                                  {item.isMain && (
                                                    <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                                                      Utama
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-1.5 px-4 text-center font-mono text-rose-700">
                                                  {item.durationSec} dtk
                                                </td>
                                                <td className="py-1.5 px-4 text-center text-gray-600">
                                                  {item.accessCount}x
                                                </td>
                                                <td className="py-1.5 px-4 text-center">
                                                  {item.markedCompleted ? (
                                                    <span className="text-rose-700 font-medium">
                                                      Ya
                                                    </span>
                                                  ) : (
                                                    <span className="text-gray-400">
                                                      Tidak
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-1.5 px-4 text-center text-gray-500">
                                                  {fmtDateTime(
                                                    item.firstAccessAt,
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400">
                                        Tidak ada akses kurang dari {threshold}{" "}
                                        detik.
                                      </p>
                                    ))}

                                  {/* TAB: EKSPLORASI */}
                                  {tab === "eksplorasi" &&
                                    ((s.exploration?.count || 0) > 0 ? (
                                      <div className="rounded-xl border border-gray-200 bg-white/80 p-4">
                                        <p className="text-[11px] text-gray-500">
                                          Objek di luar target SES. Berlaku
                                          untuk G1 dan G2 dan tidak menambah
                                          atau mengurangi SES utama.
                                        </p>
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
                                            value={
                                              s.exploration?.completedCount || 0
                                            }
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
                                        {(s.exploration?.top4?.length || 0) >
                                          0 && (
                                          <div className="mt-4">
                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                              Top-4 objek eksplorasi berdasarkan
                                              interaksi
                                            </p>

                                            <div className="grid gap-2 md:grid-cols-2">
                                              {s.exploration.top4.map(
                                                (item, index) => (
                                                  <div
                                                    key={`${item.courseId || "course"}-${item.lectureId}-${index}`}
                                                    className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                                                  >
                                                    <div className="flex items-start justify-between gap-3">
                                                      <div className="min-w-0">
                                                        <p className="truncate text-xs font-semibold text-gray-700">
                                                          #{index + 1}{" "}
                                                          {item.lectureTitle}
                                                        </p>

                                                        <p className="mt-0.5 text-[10px] text-gray-400">
                                                          Pertemuan{" "}
                                                          {item.chapterOrder ||
                                                            "—"}
                                                          {item.courseTitle
                                                            ? ` • ${item.courseTitle}`
                                                            : ""}
                                                        </p>
                                                      </div>

                                                      <span className="whitespace-nowrap text-xs font-bold text-gray-700">
                                                        {item.interactionPercent ??
                                                          0}
                                                        %
                                                      </span>
                                                    </div>

                                                    <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-gray-500">
                                                      <span>
                                                        {item.accessCount || 0}x
                                                        akses
                                                      </span>

                                                      <span>
                                                        {fmtDur(
                                                          item.durationSec || 0,
                                                        )}
                                                      </span>

                                                      <span>
                                                        {item.selesai
                                                          ? "✓ Selesai"
                                                          : "Belum selesai"}
                                                      </span>
                                                    </div>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400">
                                        Belum ada eksplorasi di luar objek
                                        acuan.
                                      </p>
                                    ))}

                                  {/* TAB: REKOMENDASI (G2) */}
                                  {tab === "rekomendasi" && isG2 && (
                                    <div>
                                      {/* RECOMMENDATION ADHERENCE G2 */}
                                      {s.kelas?.toUpperCase() === "G2" && (
                                        <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50 p-3">
                                          <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                              <p className="text-xs font-semibold text-purple-800">
                                                Recommendation Adherence
                                              </p>

                                              <p className="mt-1 text-[10px] text-purple-600">
                                                Proporsi durasi efektif pada
                                                Top-4 rekomendasi dibanding
                                                seluruh interaksi OBPEM
                                                tambahan.
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
                                              showValue={false}
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
                                      {s.adherenceByChapter?.length > 0 && (
                                        <div className="mt-3 space-y-1.5">
                                          {s.adherenceByChapter
                                            .slice()
                                            .sort(
                                              (a, b) =>
                                                a.chapterOrder - b.chapterOrder,
                                            )
                                            .map((c) => (
                                              <div
                                                key={c.chapterId}
                                                className="flex items-center gap-2"
                                              >
                                                <span className="w-24 shrink-0 text-[10px] text-purple-700">
                                                  Pertemuan {c.chapterOrder}
                                                </span>
                                                <div className="flex-1">
                                                  <PctBar
                                                    value={
                                                      c.durationPercent ?? 0
                                                    }
                                                    showValue={false}
                                                  />
                                                </div>
                                                <span className="w-12 shrink-0 text-right text-[10px] font-medium text-purple-700">
                                                  {c.durationPercent == null
                                                    ? "—"
                                                    : `${c.durationPercent}%`}
                                                </span>
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
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
          Target G1 = 4 objek pilihan per pertemuan. Target G2 = 4 objek
          rekomendasi per pertemuan.
        </p>

        <p className="mt-1 text-blue-500">
          Interaksi = rata-rata rasio durasi efektif pada objek target. Objek
          target yang tidak diakses bernilai 0. Objek di luar target dicatat
          sebagai eksplorasi dan tambahan perhitungan profil VARK praja.
        </p>

        <p className="mt-1 text-blue-500">
          Akses dengan durasi kumulatif kurang dari 30 detik dianggap tidak
          valid: tidak dihitung pada interaksi, status selesainya diabaikan, dan
          tidak dipilih sebagai objek target G1. Daftarnya ditampilkan pada
          detail setiap praja untuk tindak lanjut pengajar.
        </p>
      </div>
    </div>
  );
};
export default StudentEngagement;
