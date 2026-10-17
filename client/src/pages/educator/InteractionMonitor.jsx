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

// Indikator dari endpoint SES (sama dengan halaman Student Engagement).
// Nilainya keseluruhan, tidak per pertemuan.
const SES_INDICATORS = [
  { key: "S", label: "Penyelesaian materi", unit: "objek" },
  { key: "P", label: "Presensi", unit: "%", maxValue: 100 },
];

// Objek dianggap "diakses tinggi" bila durasi bacanya mencapai ambang ini
// dari durasi acuan objek (dipotong di 100%).
const HIGH_ACCESS_PERCENT = 75;

const CLASS_STYLE = {
  G1: {
    bar: "bg-slate-400",
    text: "text-slate-700",
    chip: "bg-slate-100 text-slate-700",
  },
  G2: {
    bar: "bg-indigo-500",
    text: "text-indigo-700",
    chip: "bg-indigo-50 text-indigo-700",
  },
};

const fmt = (v, digits = 2) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("id-ID", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

// Bilangan bulat ditampilkan apa adanya, selain itu 1 desimal.
const fmtCount = (v) =>
  Number.isInteger(v)
    ? String(v)
    : Number(v).toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

const round2 = (v) => Number(v.toFixed(2));

const describeValues = (values) => {
  const list = values.filter((v) => Number.isFinite(v));
  const n = list.length;

  if (n === 0) return { n: 0, mean: null, sd: null, median: null };

  const mean = list.reduce((sum, v) => sum + v, 0) / n;
  const sd =
    n > 1
      ? Math.sqrt(list.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1))
      : 0;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return { n, mean: round2(mean), sd: round2(sd), median: round2(median) };
};

const CompareCard = ({ indicator, stats }) => {
  const g1 = stats?.G1?.[indicator.key];
  const g2 = stats?.G2?.[indicator.key];
  const max =
    indicator.maxValue ?? Math.max(g1?.mean || 0, g2?.mean || 0, 0.0001);
  const diff =
    g1?.mean && g2?.mean ? ((g2.mean - g1.mean) / g1.mean) * 100 : null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {indicator.label}
          </p>
          <p className="text-xs text-gray-400">
            rerata per praja ({indicator.unit})
          </p>
        </div>
        {diff != null && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              diff >= 0
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
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
          const pct = Math.min(((s?.mean || 0) / max) * 100, 100);

          return (
            <div key={kelas}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className={`font-semibold ${CLASS_STYLE[kelas].text}`}>
                  {kelas}
                </span>
                <span className="font-mono text-gray-700">
                  <span className="text-sm font-bold">{fmt(s?.mean)}</span>
                  <span className="text-gray-400">
                    {" "}
                    (SD {fmt(s?.sd)}) · Md {fmt(s?.median)}
                  </span>
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

/*
 * Diagram lingkaran komposisi. Tampilannya sama dengan ShortAccessDonut di
 * halaman Student Engagement, hanya teks tengah dan satuannya bisa diatur.
 */
const CompositionDonut = ({
  segments,
  total,
  centerValue,
  centerLabel,
  ariaLabel,
  unit,
}) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg
      viewBox="0 0 120 120"
      className="h-36 w-36 shrink-0"
      role="img"
      aria-label={ariaLabel}
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
                <title>{`${seg.label}: ${fmtCount(seg.value)} ${unit}`}</title>
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
        {centerValue}
      </text>
      <text
        x="60"
        y="72"
        textAnchor="middle"
        className="fill-gray-400"
        fontSize="9"
      >
        {centerLabel}
      </text>
    </svg>
  );
};

const DonutBlock = ({
  title,
  subtitle,
  segments,
  total,
  centerValue,
  centerLabel,
  unit,
  footer,
}) => (
  <div className="rounded-lg border border-gray-100 bg-white p-4">
    <p className="text-xs font-semibold text-gray-800">{title}</p>
    <p className="mt-1 text-[11px] text-gray-500">{subtitle}</p>

    {total === 0 ? (
      <p className="mt-4 text-xs text-gray-400">Belum ada data.</p>
    ) : (
      <div className="mt-3 flex flex-wrap items-center gap-5">
        <CompositionDonut
          segments={segments}
          total={total}
          centerValue={centerValue}
          centerLabel={centerLabel}
          ariaLabel={title}
          unit={unit}
        />
        <ul className="space-y-2.5 text-xs">
          {segments.map((seg) => (
            <li key={seg.label} className="flex items-start gap-2">
              <span
                className="mt-0.5 h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              <div>
                <p className="font-medium text-gray-800">
                  {seg.label}:{" "}
                  <span className="font-semibold">
                    {fmtCount(seg.value)} {unit}
                  </span>{" "}
                  <span className="text-gray-400">
                    ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
                  </span>
                </p>
                {seg.note ? (
                  <p className="text-[11px] text-gray-500">{seg.note}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}
    {footer}
  </div>
);

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

const fmtDurSec = (sec) => {
  const total = Math.max(Math.round(Number(sec) || 0), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const d = total % 60;
  if (h > 0) return `${h} j ${m} m`;
  if (m > 0) return `${m} m ${String(d).padStart(2, "0")} d`;
  return `${d} d`;
};

// Gabungkan objek acuan dan objek eksplorasi, lalu ambil yang mencapai ambang.
const collectHighAccess = (ses, threshold) => {
  const seen = new Set();
  const items = [];

  const push = (item, peran) => {
    const percent = Number(item?.interactionPercent);
    if (!Number.isFinite(percent) || percent < threshold) return;
    if (
      Number(item.accessCount || 0) <= 0 &&
      !item.rawActualDurSec &&
      !item.durationSec
    ) {
      return;
    }
    const id = String(item.lectureId);
    if (seen.has(id)) return;
    seen.add(id);

    const role = item.role === "main" ? "Utama" : peran;
    items.push({
      id,
      chapterOrder: Number(item.chapterOrder || 0),
      title: item.lectureTitle || id,
      percent,
      peran: role,
      durasi:
        item.rawActualDurSec ??
        item.rawDurationSec ??
        item.durationSec ??
        item.actualDurSec ??
        item.effectiveDurationSec ??
        0,
      acuan: Number(item.expectedDurSec || 0),
      accessCount: Number(item.accessCount || 0),
      selesai: Boolean(item.selesai),
    });
  };

  (ses?.detail || []).forEach((item) => push(item, "Acuan"));
  (ses?.exploration?.details || []).forEach((item) => push(item, "Eksplorasi"));

  return items.sort(
    (a, b) => a.chapterOrder - b.chapterOrder || b.percent - a.percent,
  );
};

const StatBox = ({ label, value, note }) => (
  <div className="rounded-lg border border-gray-100 bg-white p-3">
    <p className="text-lg font-bold text-gray-800">{value}</p>
    <p className="text-[11px] font-medium text-gray-600">{label}</p>
    {note ? <p className="mt-0.5 text-[10px] text-gray-400">{note}</p> : null}
  </div>
);

/*
 * Rincian per praja: diagram lingkaran durasi akses objek dan daftar akses
 * di bawah ambang durasi, sama dengan panel di halaman Student Engagement.
 */
const PrajaDetail = ({ row, scopeLabel }) => {
  const [tab, setTab] = useState("ringkasan");
  const ses = row.ses;
  const info = ses?.shortInteraction || {};

  const threshold = info.thresholdSec || 30;
  const total = Number(info.totalAccessed || 0);
  const shortCount = Number(info.count || 0);
  const shortCompleted = Number(info.completedCount || 0);
  const valid = Number(info.validCount ?? Math.max(total - shortCount, 0));

  const highItems = collectHighAccess(ses, HIGH_ACCESS_PERCENT);
  const highCount = Math.min(highItems.length, valid);

  const segments = [
    {
      label: `Dibaca ≥ ${HIGH_ACCESS_PERCENT}% durasi acuan`,
      value: highCount,
      color: "#047857",
      note: "Dihitung dalam SES",
    },
    {
      label: `Dibaca ≥ ${threshold} detik, < ${HIGH_ACCESS_PERCENT}% durasi acuan`,
      value: Math.max(valid - highCount, 0),
      color: "#34d399",
      note: "Dihitung dalam SES",
    },
    {
      label: `Dibuka < ${threshold} detik`,
      value: Math.max(shortCount - shortCompleted, 0),
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
      id: "singkat",
      label: `Akses < ${threshold} dtk`,
      count: shortCount,
      alert: shortCompleted > 0,
    },
    {
      id: "tinggi",
      label: `Objek ≥ ${HIGH_ACCESS_PERCENT}%`,
      count: highItems.length,
      success: true,
    },
  ];

  if (!ses) {
    return (
      <p className="text-xs text-gray-400">
        Data penyelesaian dan akses singkat belum tersedia untuk praja ini.
      </p>
    );
  }

  return (
    <div>
      <div
        className="mb-4 flex flex-wrap gap-1 border-b border-gray-200"
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
                ? "border-indigo-600 bg-white text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  t.alert
                    ? "bg-rose-100 text-rose-700"
                    : t.success
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "ringkasan" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatBox
              label="Frekuensi akses"
              value={`${row.F}x`}
              note={scopeLabel}
            />
            <StatBox label="OP unik diakses" value={row.U} note={scopeLabel} />
            <StatBox
              label="Durasi efektif"
              value={`${fmt(row.T, 1)} mnt`}
              note={scopeLabel}
            />

            <StatBox
              label={`Objek ≥ ${HIGH_ACCESS_PERCENT}% durasi acuan`}
              value={highItems.length}
              note="Keseluruhan"
            />
          </div>

          <DonutBlock
            title="Durasi akses objek pembelajaran"
            subtitle={`Objek yang dibuka kurang dari ${threshold} detik (durasi kumulatif) dianggap belum dipelajari: tidak dihitung dalam SES dan status selesainya diabaikan.`}
            segments={segments}
            total={total}
            centerValue={String(total)}
            centerLabel="objek dibuka"
            unit="objek"
            footer={
              <>
                {shortCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setTab("singkat")}
                    className="mt-3 text-[11px] font-medium text-rose-700 hover:underline"
                  >
                    Lihat {shortCount} objek yang dibuka kurang dari {threshold}{" "}
                    detik →
                  </button>
                ) : null}
              </>
            }
          />
        </div>
      )}

      {tab === "singkat" &&
        (shortCount > 0 ? (
          <div className="rounded-xl border border-rose-200 bg-white p-4">
            <p className="mb-3 text-[11px] text-gray-500">
              Objek berikut dibuka kurang dari {threshold} detik (durasi
              kumulatif), tidak dihitung dalam SES, dan status selesainya
              diabaikan. Baris dengan status "Ya" pada kolom Ditandai selesai
              perlu ditindaklanjuti.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-rose-100 text-gray-500">
                    <th className="pb-2 pr-4 text-left">Pertemuan</th>
                    <th className="px-4 pb-2 text-left">Objek</th>
                    <th className="px-4 pb-2 text-center">Durasi</th>
                    <th className="px-4 pb-2 text-center">Akses</th>
                    <th className="px-4 pb-2 text-center">Ditandai selesai</th>
                    <th className="px-4 pb-2 text-center">Akses pertama</th>
                  </tr>
                </thead>
                <tbody>
                  {(info.details || []).map((item) => (
                    <tr
                      key={`${item.courseId}-${item.lectureId}`}
                      className="border-b border-rose-50 last:border-0"
                    >
                      <td className="py-1.5 pr-4 text-gray-600">
                        {item.chapterOrder
                          ? `Pertemuan ${item.chapterOrder}`
                          : "—"}
                      </td>
                      <td className="px-4 py-1.5 text-gray-800">
                        {item.lectureTitle}
                        {item.isMain && (
                          <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                            Utama
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-1.5 text-center font-mono text-rose-700">
                        {item.durationSec} dtk
                      </td>
                      <td className="px-4 py-1.5 text-center text-gray-600">
                        {item.accessCount}x
                      </td>
                      <td className="px-4 py-1.5 text-center">
                        {item.markedCompleted ? (
                          <span className="font-medium text-rose-700">Ya</span>
                        ) : (
                          <span className="text-gray-400">Tidak</span>
                        )}
                      </td>
                      <td className="px-4 py-1.5 text-center text-gray-500">
                        {fmtDateTime(item.firstAccessAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Tidak ada akses kurang dari {threshold} detik.
          </p>
        ))}

      {tab === "tinggi" &&
        (highItems.length > 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-white p-4">
            <p className="mb-3 text-[11px] text-gray-500">
              Objek berikut dibaca minimal {HIGH_ACCESS_PERCENT}% dari durasi
              acuan objek (objek acuan dan eksplorasi). Capaian dihitung dari
              durasi baca terhadap durasi acuan dan dibatasi 100%.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-emerald-100 text-gray-500">
                    <th className="pb-2 pr-4 text-left">Pertemuan</th>
                    <th className="px-4 pb-2 text-left">Objek</th>
                    <th className="px-4 pb-2 text-center">Durasi baca</th>
                    <th className="px-4 pb-2 text-center">Acuan</th>
                    <th className="px-4 pb-2 text-center">Capaian</th>
                    <th className="px-4 pb-2 text-center">Akses</th>
                    <th className="px-4 pb-2 text-center">Selesai</th>
                  </tr>
                </thead>
                <tbody>
                  {highItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-emerald-50 last:border-0"
                    >
                      <td className="py-1.5 pr-4 text-gray-600">
                        {item.chapterOrder
                          ? `Pertemuan ${item.chapterOrder}`
                          : "—"}
                      </td>
                      <td className="px-4 py-1.5 text-gray-800">
                        {item.title}
                        {item.peran === "Utama" && (
                          <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                            Utama
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-1.5 text-center font-mono text-gray-700">
                        {fmtDurSec(item.durasi)}
                      </td>
                      <td className="px-4 py-1.5 text-center font-mono text-gray-500">
                        {fmtDurSec(item.acuan)}
                      </td>
                      <td className="px-4 py-1.5 text-center font-mono font-semibold text-emerald-700">
                        {fmt(item.percent, 0)}%
                      </td>
                      <td className="px-4 py-1.5 text-center text-gray-600">
                        {item.accessCount}x
                      </td>
                      <td className="px-4 py-1.5 text-center">
                        {item.selesai ? (
                          <span className="text-emerald-700">✓</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Belum ada objek yang dibaca ≥ {HIGH_ACCESS_PERCENT}% durasi acuan.
          </p>
        ))}
    </div>
  );
};

const TrendChart = ({ perMeeting, indicatorKey }) => {
  const max = Math.max(
    0.0001,
    ...perMeeting.flatMap((m) =>
      ["G1", "G2"].map((k) => m.stats[k][indicatorKey].mean || 0),
    ),
  );

  return (
    <div className="flex h-48 items-end gap-4 overflow-x-auto pb-1">
      {perMeeting.map((m) => (
        <div
          key={m.meeting}
          className="flex min-w-[56px] flex-1 flex-col items-center gap-1"
        >
          <div className="flex h-40 w-full items-end justify-center gap-1">
            {["G1", "G2"].map((kelas) => {
              const v = m.stats[kelas][indicatorKey].mean || 0;
              return (
                <div
                  key={kelas}
                  className="flex h-full w-5 flex-col items-center justify-end"
                >
                  <span className="mb-0.5 text-[10px] text-gray-500">
                    {fmt(v, 1)}
                  </span>
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
  const [sesData, setSesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("ALL"); // "ALL" atau nomor pertemuan
  const [trendKey, setTrendKey] = useState("T");
  const [kelasFilter, setKelasFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (key) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("dosenToken");
        const headers = { Authorization: `Bearer ${token}` };

        // Penyelesaian materi dan presensi memakai endpoint yang sama dengan
        // halaman Student Engagement. Jika gagal, halaman tetap tampil tanpa dua indikator itu.
        const [interaksiRes, sesRes] = await Promise.all([
          axios.get(backendUrl + "/api/educator/interaction-stats", {
            headers,
          }),
          axios
            .get(backendUrl + "/api/educator/ses", { headers })
            .catch(() => null),
        ]);

        const res = interaksiRes.data;
        if (res.success) setData(res);
        else toast.error(res.message);

        if (sesRes?.data?.success) {
          setSesData(sesRes.data.sesData || []);
        } else {
          toast.warn(
            "Data penyelesaian materi dan presensi belum dapat dimuat.",
          );
        }
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

  // Peta NPP -> data SES, dipakai untuk menggabungkan ke tabel per praja.
  const sesByNpp = useMemo(
    () => new Map(sesData.map((s) => [String(s.npp).trim(), s])),
    [sesData],
  );

  const sesRowsByKelas = useMemo(() => {
    const result = { G1: [], G2: [] };
    for (const s of sesData) {
      const kelas = String(s.kelas || "").toUpperCase();
      if (result[kelas]) result[kelas].push(s);
    }
    return result;
  }, [sesData]);

  // Statistik rerata, SD, median untuk kartu perbandingan (keseluruhan).
  const sesStats = useMemo(() => {
    const result = {};
    for (const kelas of ["G1", "G2"]) {
      const rows = sesRowsByKelas[kelas];
      result[kelas] = {
        S: describeValues(rows.map((s) => Number(s.completionEarned || 0))),
        P: describeValues(rows.map((s) => Number(s.presensi || 0))),
      };
    }
    return result;
  }, [sesRowsByKelas]);

  const students = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();

    return data.students
      .map((s) => {
        const ses = sesByNpp.get(String(s.npp).trim());
        const extra = {
          ses,
          penyelesaian: ses ? Number(ses.completionEarned ?? 0) : null,
          penyelesaianTarget: ses ? Number(ses.completionPossible ?? 0) : null,
          presensi: ses ? Number(ses.presensi ?? 0) : null,
        };

        if (scope === "ALL") return { ...s, ...extra };
        const b = s.perMeeting[scope] || { F: 0, U: 0, T: 0 };
        return { ...s, ...b, D: b.U > 0 ? b.T / b.U : null, ...extra };
      })
      .filter((s) => kelasFilter === "ALL" || s.kelas === kelasFilter)
      .filter(
        (s) => !q || s.nama.toLowerCase().includes(q) || s.npp.includes(q),
      )
      .sort((a, b) => a.kelas.localeCompare(b.kelas) || b.T - a.T);
  }, [data, scope, kelasFilter, search, sesByNpp]);

  if (loading) return <Loading />;
  if (!data) return <p className="p-8 text-gray-500">Data tidak tersedia.</p>;

  const hasSes = sesData.length > 0;
  const maxPossible = Math.max(
    1,
    ...sesData.map((s) => Number(s.completionPossible || 0)),
  );

  return (
    <div className="flex min-h-screen w-full flex-col p-4 md:p-8 lg:flex-row lg:items-start lg:gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            Pemantauan Interaksi OP Pendukung
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Perbandingan G1 dan G2. Hanya OP pendukung, akses ≥{" "}
            {data.rules.minValidSec} detik, durasi tiap OP dibatasi{" "}
            {data.rules.durationCap}. Angka: rerata (SD) · median.
          </p>
        {/* </div> */}
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
        <span>
          {data.shortCount} akses &lt; {data.rules.minValidSec} detik diabaikan
        </span>
      </div>

      {/* Penyelesaian materi dan presensi */}
      {hasSes && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Penyelesaian materi dan presensi
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Penyelesaian materi berupa jumlah objek acuan yang ditandai
              selesai (rerata per praja); presensi berupa persentase. Keduanya
              dihitung keseluruhan, jadi tidak berubah saat memilih pertemuan.
              Klik baris praja pada tabel untuk melihat diagram durasi akses dan
              daftar akses di bawah {data.rules.minValidSec} detik.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {SES_INDICATORS.map((ind) => (
              <CompareCard
                key={ind.key}
                indicator={
                  ind.key === "S" ? { ...ind, maxValue: maxPossible } : ind
                }
                stats={sesStats}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tren per pertemuan */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800">
            Rerata per pertemuan
          </p>
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
              <span
                key={k}
                className="flex items-center gap-1 text-xs text-gray-500"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-sm ${CLASS_STYLE[k].bar}`}
                />
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
            Rincian per praja{" "}
            {scope === "ALL" ? "(keseluruhan)" : `(pertemuan ${scope})`}
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
                <th className="w-8 px-3 py-2" />
                <th className="px-4 py-2">Praja</th>
                <th className="px-4 py-2">Kelas</th>
                <th className="px-4 py-2 text-right">Frekuensi</th>
                <th className="px-4 py-2 text-right">OP unik</th>
                <th className="px-4 py-2 text-right">Durasi (mnt)</th>
                <th className="px-4 py-2 text-right">Mnt / OP</th>
                {hasSes && (
                  <>
                    <th
                      className="px-4 py-2 text-right"
                      title="Keseluruhan, tidak berubah menurut pertemuan"
                    >
                      Presensi (%)
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const rowKey = String(s.npp);
                const isOpen = expandedRows.has(rowKey);
                const canOpen = Boolean(s.ses);
                const shortCompleted = Number(
                  s.ses?.shortInteraction?.completedCount || 0,
                );

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={() => canOpen && toggleRow(rowKey)}
                      className={`border-t border-gray-100 transition-colors ${
                        canOpen
                          ? "cursor-pointer hover:bg-indigo-50/50"
                          : "hover:bg-gray-50"
                      } ${isOpen ? "bg-indigo-50/50" : ""}`}
                    >
                      <td className="select-none px-3 py-2 text-center text-gray-300">
                        <span
                          className={`inline-block transition-transform duration-200 ${
                            isOpen ? "rotate-90" : ""
                          } ${canOpen ? "" : "opacity-20"}`}
                        >
                          ▶
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-800">
                          {s.nama}
                          {/* {shortCompleted > 0 && (
                            <span
                              className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                              title={`${shortCompleted} objek dibuka < ${
                                s.ses?.shortInteraction?.thresholdSec || 30
                              } detik tetapi ditandai selesai`}
                            >
                              {shortCompleted} perlu tindak lanjut
                            </span>
                          )} */}
                        </p>
                        <p className="text-xs text-gray-400">
                          {s.npp}
                          {!s.linked && " · belum terhubung akun"}
                        </p>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CLASS_STYLE[s.kelas]?.chip}`}
                        >
                          {s.kelas}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{s.F}</td>
                      <td className="px-4 py-2 text-right font-mono">{s.U}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {fmt(s.T)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {fmt(s.D)}
                      </td>
                      {hasSes && (
                        <>
                          <td className="px-4 py-2 text-right font-mono">
                            {s.presensi == null
                              ? "—"
                              : `${fmt(s.presensi, 1)}%`}
                          </td>
                        </>
                      )}
                    </tr>

                    {isOpen && canOpen && (
                      <tr>
                        <td
                          colSpan={hasSes ? 9 : 7}
                          className="border-t border-indigo-100 p-0"
                        >
                          <div className="bg-gray-50 px-8 py-4">
                            <PrajaDetail
                              row={s}
                              scopeLabel={
                                scope === "ALL"
                                  ? "Keseluruhan"
                                  : `Pertemuan ${scope}`
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td
                    colSpan={hasSes ? 9 : 7}
                    className="px-4 py-6 text-center text-gray-400"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
                </div>
      </div>
      </div>

      {/* Pilih cakupan: menempel di kanan saat halaman digulir (layar lebar),
          berupa baris tombol di atas pada layar kecil. */}
      <aside className="order-first mb-4 lg:order-last lg:mb-0 lg:sticky lg:top-6 lg:w-44 lg:shrink-0">
        <div className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm lg:p-3">
          <p className="mb-2 hidden px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 lg:block">
            Cakupan
          </p>
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {[{ meeting: "ALL" }, ...meetingsWithData].map((m) => (
              <button
                key={m.meeting}
                type="button"
                onClick={() => setScope(m.meeting)}
                className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-left text-sm transition ${
                  scope === m.meeting
                    ? "border-gray-800 bg-gray-800 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {m.meeting === "ALL" ? "Keseluruhan" : `Pertemuan ${m.meeting}`}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default InteractionMonitor;
