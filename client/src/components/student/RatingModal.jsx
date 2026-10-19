import React, { useState } from "react";

export const LIKERT_LABELS = [
  "Sangat tidak membantu",
  "Tidak membantu",
  "Cukup membantu",
  "Membantu",
  "Sangat membantu",
];

const RatingModal = ({
  lectureTitle,
  subtitle,
  preview = null,
  initialValue = 0,
  onChange,
  onPrev = null, // null = tombol disembunyikan/nonaktif
  onNext = null,
  onSubmit,
  onSkip,
  skipLabel = "Lewati",
}) => {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  const pilih = (n) => {
    setValue(n);
    if (onChange) onChange(n);
  };

  const kirim = async () => {
    if (!value || saving) return;
    setSaving(true);
    await onSubmit(value);
    setSaving(false);
  };

  const showNav = onPrev !== null || onNext !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        {subtitle && (
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-600">
            {subtitle}
          </p>
        )}

        {preview && <div className="mb-4">{preview}</div>}

        <p className="text-sm font-semibold text-gray-800">{lectureTitle}</p>

        <h3 className="mt-3 text-base font-bold text-gray-800">
          Seberapa membantu objek pembelajaran ini bagi pemahaman Anda?
        </h3>

        <div className="mt-5 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => pilih(n)}
              className={`flex flex-col items-center rounded-xl border px-1 py-3 text-sm font-semibold transition ${
                value === n
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <span className="text-lg">{n}</span>
            </button>
          ))}
        </div>

        <div className="mt-2 flex justify-between text-[11px] text-gray-500">
          <span>{LIKERT_LABELS[0]}</span>
          <span>{LIKERT_LABELS[4]}</span>
        </div>

        {value > 0 && (
          <p className="mt-3 text-center text-sm font-medium text-blue-700">
            {value} — {LIKERT_LABELS[value - 1]}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          {showNav ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrev || undefined}
                disabled={!onPrev}
                aria-label="Objek pembelajaran sebelumnya"
                className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent"
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                onClick={onNext || undefined}
                disabled={!onNext}
                aria-label="Objek pembelajaran berikutnya"
                className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent"
              >
                Berikutnya →
              </button>
            </div>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
            >
              {skipLabel}
            </button>
            <button
              type="button"
              onClick={kirim}
              disabled={!value || saving}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Kirim"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;