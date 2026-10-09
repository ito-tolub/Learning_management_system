import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/student/Loading";

const INDICATORS = [
  { key: "F", label: "Frekuensi akses", unit: "kali" },
  { key: "U", label: "OP unik diakses", unit: "OP" },
  { key: "T", label: "Total durasi akses", unit: "menit" },
  { key: "D", label: "Durasi per OP", unit: "menit" },
];

const CLASS_STYLE = {
  G1: { bar: "bg-slate-400", text: "text-slate-700", chip: "bg-slate-100 text-slate-700" },
  G2: { bar: "bg-indigo-500", text: "text-indigo-700", chip: "bg-indigo-50 text-indigo-700" },
};

const fmt = (v, digits = 2) =>
  v == null ? "—" : Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const CompareCard = ({ indicator, stats }) => {
  const g1 = stats?.G1?.[indicator.key];
  const g2 = stats?.G2?.[indicator.key];
  const max = Math.max(g1?.mean || 0, g2?.mean || 0, 0.0001);
  const diff =
    g1?.mean && g2?.mean ? ((g2.mean - g1.mean) / g1.mean) * 100 : null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">{indicator.label}</p>
          <p className="text-xs text-gray-400">rerata per praja ({indicator.unit})</p>
        </div>
        {diff != null && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              diff >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
            title="Selisih rerata G2 terhadap G1"
          >
            G2 {diff >= 0 ? "+" : ""}
            {fmt(diff, 1)}%
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {["G1", "G2"].map((kelas) => {
          const s = stats?.[kelas]?.[indicator.key];
          const pct = ((s?.mean || 0) / max) * 100;

          return (
            <div key={kelas}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className={`font-semibold ${CLASS_STYLE[kelas].text}`}>{kelas}</span>
                <span className="font-mono text-gray-700">
                  <span className="text-sm font-bold">{fmt(s?.mean)}</span>
                  <span className="text-gray-400"> (SD {fmt(s?.sd)}) · Md {fmt(s?.median)}</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${CLASS_STYLE[kelas].bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TrendChart = ({ perMeeting, indicatorKey }) => {
  const max = Math.max(
    0.0001,
    ...perMeeting.flatMap((m) => ["G1", "G2"].map((k) => m.stats[k][indicatorKey].mean || 0)),
  );

  return (
    <div className="flex h-48 items-end gap-4 overflow-x-auto pb-1">
      {perMeeting.map((m) => (
        <div key={m.meeting} className="flex min-w-[56px] flex-1 flex-col items-center gap-1">
          <div className="flex h-40 w-full items-end justify-center gap-1">
            {["G1", "G2"].map((kelas) => {
              const v = m.stats[kelas][indicatorKey].mean || 0;
              return (
                <div key={kelas} className="flex h-full w-5 flex-col items-center justify-end">
                  <span className="mb-0.5 text-[10px] text-gray-500">{fmt(v, 1)}</span>
                  <div
                    className={`w-full rounded-t ${CLASS_STYLE[kelas].bar}`}
                    style={{ height: `${(v / max) * 100}%` }}
                    title={`${kelas} · P${m.meeting}: ${fmt(v)}`}
                  />
                </div>
              );
            })}
          </div>
          <span className="text-xs text-gray-500">P{m.meeting}</span>
        </div>
      ))}
    </div>
  );
};

const InteractionMonitor = () => {
  const { backendUrl } = useContext(AppContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("ALL"); // "ALL" atau nomor pertemuan
  const [trendKey, setTrendKey] = useState("T");
  const [kelasFilter, setKelasFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("dosenToken");
        const { data: res } = await axios.get(
          backendUrl + "/api/educator/interaction-stats",
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.success) setData(res);
        else toast.error(res.message);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [backendUrl]);

  const meetingsWithData = useMemo(
    () => (data?.perMeeting || []).filter((m) => m.totalSupport > 0),
    [data],
  );

  const activeStats = useMemo(() => {
    if (!data) return null;
    if (scope === "ALL") return data.overall;
    return meetingsWithData.find((m) => m.meeting === scope)?.stats || null;
  }, [data, scope, meetingsWithData]);

  const students = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();

    return data.students
      .map((s) => {
        if (scope === "ALL") return s;
        const b = s.perMeeting[scope] || { F: 0, U: 0, T: 0 };
        return { ...s, ...b, D: b.U > 0 ? b.T / b.U : null };
      })
      .filter((s) => kelasFilter === "ALL" || s.kelas === kelasFilter)
      .filter((s) => !q || s.nama.toLowerCase().includes(q) || s.npp.includes(q))
      .sort((a, b) => a.kelas.localeCompare(b.kelas) || b.T - a.T);
  }, [data, scope, kelasFilter, search]);

  if (loading) return <Loading />;
  if (!data) return <p className="p-8 text-gray-500">Data tidak tersedia.</p>;

  return (
    <div className="min-h-screen w-full space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Pemantauan Interaksi OP Pendukung</h1>
        <p className="mt-1 text-sm text-gray-500">
          Perbandingan G1 dan G2. Hanya OP pendukung, akses ≥ {data.rules.minValidSec} detik,
          durasi tiap OP dibatasi {data.rules.durationCap}. Angka: rerata (SD) · median.
        </p>
      </div>

      {/* Pilih cakupan */}
      <div className="flex flex-wrap gap-2">
        {[{ meeting: "ALL" }, ...meetingsWithData].map((m) => (
          <button
            key={m.meeting}
            type="button"
            onClick={() => setScope(m.meeting)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              scope === m.meeting
                ? "border-gray-800 bg-gray-800 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {m.meeting === "ALL" ? "Keseluruhan" : `Pertemuan ${m.meeting}`}
          </button>
        ))}
      </div>

      {/* Kartu perbandingan */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {INDICATORS.map((ind) => (
          <CompareCard key={ind.key} indicator={ind} stats={activeStats} />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {["G1", "G2"].map((k) => (
          <span key={k}>
            {k}: {activeStats?.[k]?.F?.n ?? 0} praja,{" "}
            <b>{activeStats?.[k]?.zeroCount ?? 0}</b> tanpa interaksi valid
          </span>
        ))}
        <span>{data.shortCount} akses &lt; {data.rules.minValidSec} detik diabaikan</span>
      </div>

      {/* Tren per pertemuan */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800">Rerata per pertemuan</p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={trendKey}
              onChange={(e) => setTrendKey(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
            >
              {INDICATORS.map((i) => (
                <option key={i.key} value={i.key}>
                  {i.label} ({i.unit})
                </option>
              ))}
            </select>
            {["G1", "G2"].map((k) => (
              <span key={k} className="flex items-center gap-1 text-xs text-gray-500">
                <span className={`h-2.5 w-2.5 rounded-sm ${CLASS_STYLE[k].bar}`} />
                {k}
              </span>
            ))}
          </div>
        </div>
        <TrendChart perMeeting={meetingsWithData} indicatorKey={trendKey} />
      </div>

      {/* Tabel per praja */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-800">
            Rincian per praja {scope === "ALL" ? "(keseluruhan)" : `(pertemuan ${scope})`}
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
            >
              <option value="ALL">Semua kelas</option>
              <option value="G1">G1</option>
              <option value="G2">G2</option>
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / NPP"
              className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Praja</th>
                <th className="px-4 py-2">Kelas</th>
                <th className="px-4 py-2 text-right">Frekuensi</th>
                <th className="px-4 py-2 text-right">OP unik</th>
                <th className="px-4 py-2 text-right">Durasi (mnt)</th>
                <th className="px-4 py-2 text-right">Mnt / OP</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.npp} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <p className="font-medium text-gray-800">{s.nama}</p>
                    <p className="text-xs text-gray-400">
                      {s.npp}
                      {!s.linked && " · belum terhubung akun"}
                    </p>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CLASS_STYLE[s.kelas]?.chip}`}>
                      {s.kelas}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{s.F}</td>
                  <td className="px-4 py-2 text-right font-mono">{s.U}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(s.T)}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(s.D)}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InteractionMonitor;
