import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/student/Loading";

const METRICS = [
  {
    key: "precision",
    random: "randomPrecision",
    max: "maxPrecision",
    gain: "gainPrecision",
    label: "Precision@4",
    desc: "Proporsi OP rekomendasi yang diselesaikan",
  },
  {
    key: "recall",
    random: "randomRecall",
    max: "maxRecall",
    gain: "gainRecall",
    label: "Recall@4",
    desc: "Proporsi OP selesai yang termuat di rekomendasi",
  },
  {
    key: "hitRate",
    random: "randomHitRate",
    max: "maxHitRate",
    gain: "gainHitRate",
    label: "HitRate@4",
    desc: "Praja–pertemuan dengan ≥ 1 rekomendasi selesai",
  },
];

const fmt = (v, d = 3) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

const Scale = ({ value, random, max }) => {
  const pct = (v) => `${Math.max(0, Math.min((v || 0) * 100, 100))}%`;

  return (
    <div className="relative mt-3 h-3 rounded-full bg-gray-100">
      {max != null && (
        <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-100" style={{ width: pct(max) }} />
      )}
      <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-500" style={{ width: pct(value) }} />
      {random != null && (
        <div
          className="absolute -top-1 h-5 w-0.5 bg-amber-500"
          style={{ left: pct(random) }}
          title={`Acak: ${fmt(random)}`}
        />
      )}
    </div>
  );
};

const MetricCard = ({ metric, summary }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <p className="text-sm font-semibold text-gray-800">{metric.label}</p>
    <p className="text-xs text-gray-400">{metric.desc}</p>
    <p className="mt-3 text-3xl font-bold text-gray-900">{fmt(summary?.[metric.key])}</p>
    <Scale value={summary?.[metric.key]} random={summary?.[metric.random]} max={summary?.[metric.max]} />
    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
      <div>
        <p className="text-gray-400">Acak</p>
        <p className="font-mono text-amber-600">{fmt(summary?.[metric.random])}</p>
      </div>
      <div>
        <p className="text-gray-400">Maksimum</p>
        <p className="font-mono text-indigo-400">{fmt(summary?.[metric.max])}</p>
      </div>
      <div>
        <p className="text-gray-400">G</p>
        <p className="font-mono font-semibold text-gray-700">{fmt(summary?.[metric.gain])}</p>
      </div>
    </div>
  </div>
);

const StudentRow = ({ student, pairs }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="cursor-pointer border-t border-gray-100 hover:bg-gray-50" onClick={() => setOpen((o) => !o)}>
        <td className="px-4 py-2">
          <p className="font-medium text-gray-800">{student.nama}</p>
          <p className="text-xs text-gray-400">{student.npp}</p>
        </td>
        <td className="px-4 py-2 text-right font-mono">{fmt(student.precision)}</td>
        <td className="px-4 py-2 text-right font-mono">{fmt(student.recall)}</td>
        <td className="px-4 py-2 text-right font-mono">{fmt(student.hitRate)}</td>
        <td className="px-4 py-2 text-right text-gray-400">{open ? "▲" : "▼"}</td>
      </tr>
      {open && (
        <tr className="bg-gray-50">
          <td colSpan={5} className="px-4 py-3">
            <div className="space-y-2">
              {pairs.map((p) => (
                <div key={p.meeting} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="w-24 font-semibold text-gray-600">Pertemuan {p.meeting}</span>
                  {p.recommended.map((r) => (
                    <span
                      key={r.lectureId}
                      title={r.title}
                      className={`rounded-full px-2 py-0.5 ${
                        r.relevant ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {r.relevant ? "✓ " : ""}
                      {r.lectureId}
                    </span>
                  ))}
                  <span className="text-gray-400">
                    · {p.hitCount}/4 tepat · {p.relCount} OP selesai dari {p.candidateCount} kandidat
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const RecommendationMetrics = () => {
  const { backendUrl } = useContext(AppContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState("G2");
  const [uts, setUts] = useState("");
  const [scope, setScope] = useState("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("dosenToken");
      const { data: res } = await axios.get(backendUrl + "/api/educator/recommendation-metrics", {
        headers: { Authorization: `Bearer ${token}` },
        params: { kelas, ...(uts ? { uts } : {}) },
      });

      if (res.success) setData(res);
      else toast.error(res.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, kelas, uts]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    if (!data) return null;
    if (scope === "ALL") return data.overall;
    return data.perMeeting.find((m) => m.meeting === scope) || null;
  }, [data, scope]);

  const students = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.perStudent
      .filter((s) => !q || s.nama.toLowerCase().includes(q) || s.npp.includes(q))
      .sort((a, b) => (b.precision ?? -1) - (a.precision ?? -1));
  }, [data, search]);

  if (loading && !data) return <Loading />;
  if (!data) return <p className="p-8 text-gray-500">Data tidak tersedia.</p>;

  return (
    <div className="min-h-screen w-full space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Ketepatan Rekomendasi</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            {data.kelas === "G1"
              ? "Kelas G1: rekomendasi bayangan (tidak ditampilkan ke praja). "
              : "Kelas G2: rekomendasi yang ditampilkan ke praja. "}
            OP relevan = OP kandidat dengan durasi ≥ {data.rules.completionRatio * 100}% durasi acuan dan
            akses pertama setelah rekomendasi dibekukan
            {data.rules.uts ? " dan sebelum UTS" : ""}. Pertemuan {data.rules.meetings}.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-500">
            Kelas
            <select
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700"
            >
              <option value="G2">G2 (eksperimen)</option>
              <option value="G1">G1 (bayangan)</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">
            Batas UTS (τ_UTS)
            <input
              type="date"
              value={uts}
              onChange={(e) => setUts(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ meeting: "ALL" }, ...data.perMeeting].map((m) => (
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

      <div className="grid gap-4 md:grid-cols-3">
        {METRICS.map((m) => (
          <MetricCard key={m.key} metric={m} summary={summary} />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> nilai sistem
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-100" /> nilai maksimum
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-0.5 bg-amber-500" /> rekomendasi acak
        </span>
        <span>G = (nilai − acak) / (maks − acak)</span>
        <span>
          {summary?.pairs ?? 0} pasangan praja–pertemuan · {summary?.noRelevant ?? 0} tanpa OP selesai
          (dikeluarkan dari Recall)
        </span>
        <span>
          {data.excluded.inactive} praja tanpa aktivitas dikeluarkan
          {data.excluded.inactiveNames?.length ? ` (${data.excluded.inactiveNames.join(", ")})` : ""}
          {data.excluded.missingSnapshot ? ` · ${data.excluded.missingSnapshot} pasangan tanpa snapshot` : ""}
        </span>
      </div>

      {/* Tabel per pertemuan */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Pertemuan</th>
              <th className="px-4 py-2 text-right">n</th>
              {METRICS.map((m) => (
                <th key={m.key} className="px-4 py-2 text-right">
                  {m.label}
                  <span className="block normal-case text-[10px] text-gray-400">sistem / acak</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data.perMeeting, { ...data.overall, meeting: "Keseluruhan" }].map((m) => (
              <tr
                key={m.meeting}
                className={`border-t border-gray-100 ${m.meeting === "Keseluruhan" ? "bg-gray-50 font-semibold" : ""}`}
              >
                <td className="px-4 py-2">{m.meeting === "Keseluruhan" ? m.meeting : `Pertemuan ${m.meeting}`}</td>
                <td className="px-4 py-2 text-right font-mono">{m.pairs}</td>
                {METRICS.map((x) => (
                  <td key={x.key} className="px-4 py-2 text-right font-mono">
                    {fmt(m[x.key])} <span className="text-amber-600">/ {fmt(m[x.random])}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per praja */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-800">Rincian per praja (klik untuk melihat rekomendasi)</p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / NPP"
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Praja</th>
                <th className="px-4 py-2 text-right">Precision@4</th>
                <th className="px-4 py-2 text-right">Recall@4</th>
                <th className="px-4 py-2 text-right">HitRate@4</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <StudentRow
                  key={s.npp}
                  student={s}
                  pairs={data.pairs.filter((p) => p.npp === s.npp)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecommendationMetrics;
