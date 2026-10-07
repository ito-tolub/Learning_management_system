import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Kejadian yang dianggap sebagai tanda praja masih aktif:
 * klik/ketuk, gulir (roda tetikus, gulir halaman, usap layar), dan ketikan.
 * Gerakan tetikus sengaja TIDAK dihitung.
 */
export const ACTIVITY_EVENTS = [
  "pointerdown",
  "wheel",
  "scroll",
  "keydown",
  "touchstart",
  "touchmove",
  "pointermove",
];

const LISTENER_OPTIONS = { capture: true, passive: true };

/** Memasang pendengar aktivitas pada document (halaman utama atau iframe). */
export const attachActivityListeners = (target, handler) => {
  if (!target || !handler) return () => {};

  ACTIVITY_EVENTS.forEach((type) =>
    target.addEventListener(type, handler, LISTENER_OPTIONS),
  );

  return () =>
    ACTIVITY_EVENTS.forEach((type) =>
      target.removeEventListener(type, handler, LISTENER_OPTIONS),
    );
};

/**
 * Mendeteksi praja yang membiarkan halaman tanpa aktivitas.
 *
 * @param {object}   opsi
 * @param {boolean}  opsi.enabled         deteksi aktif atau tidak
 * @param {number}   opsi.limitMs         lama tanpa aktivitas sebelum dianggap diam
 * @param {*}        opsi.resetKey        berubah = hitungan diam dimulai ulang
 * @param {Function} opsi.isMediaPlaying  true bila video/audio sedang diputar
 * @param {Function} opsi.onIdle          dipanggil (idleAt) saat mulai diam
 * @param {Function} opsi.onActive        dipanggil saat aktif kembali
 */
export const useIdleDetector = ({
  enabled,
  limitMs,
  resetKey,
  isMediaPlaying,
  onIdle,
  onActive,
}) => {
  /*
   * Status diam disimpan bersama "sesi" tempat ia terjadi. Ketika objek
   * berganti atau deteksi dimatikan, sesi berubah sehingga status lama
   * otomatis tidak berlaku tanpa perlu di-reset lewat efek.
   */
  const session = `${resetKey ?? ""}|${enabled ? 1 : 0}`;
  const [idleSession, setIdleSession] = useState(null);
  const isIdle = idleSession === session;

  const sessionRef = useRef(session);
  const isIdleRef = useRef(false);
  // Diisi saat efek pertama berjalan (markActivity di bawah).
  const lastActivityRef = useRef(0);
  const callbacksRef = useRef({});

  // Selalu pakai callback terbaru tanpa memasang ulang pendengar.
  useEffect(() => {
    callbacksRef.current = { isMediaPlaying, onIdle, onActive };
    sessionRef.current = session;
  });

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (isIdleRef.current) {
      isIdleRef.current = false;
      setIdleSession(null);
      callbacksRef.current.onActive?.();
    }
  }, []);

  // Objek berganti atau deteksi dimatikan/dinyalakan: mulai dari awal.
  useEffect(() => {
    lastActivityRef.current = Date.now();

    if (isIdleRef.current) {
      isIdleRef.current = false;
      callbacksRef.current.onActive?.();
    }
  }, [session]);

  // Aktivitas pada halaman utama.
  useEffect(
    () => attachActivityListeners(document, markActivity),
    [markActivity],
  );

  // Kembali ke tab LMS dihitung sebagai aktivitas.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") markActivity();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [markActivity]);

  // Pemeriksaan berkala.
  useEffect(() => {
    if (!enabled) return undefined;

    const intervalId = window.setInterval(() => {
      if (isIdleRef.current) return;

      const now = Date.now();

      // Menonton video / mendengar audio bukan berarti diam.
      if (callbacksRef.current.isMediaPlaying?.()) {
        lastActivityRef.current = now;
        return;
      }

      const idleAt = lastActivityRef.current + limitMs;

      if (now >= idleAt) {
        isIdleRef.current = true;
        setIdleSession(sessionRef.current);
        callbacksRef.current.onIdle?.(idleAt);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [enabled, limitMs]);

  return { isIdle, markActivity };
};