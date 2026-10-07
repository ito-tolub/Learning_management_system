import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

/*
 * Pembaca dokumen yang merender isi PDF/DOCX langsung di halaman LMS.
 *
 * Alasannya: dokumen yang ditampilkan lewat <iframe> dari situs lain
 * (Cloudinary, Office viewer) tidak meneruskan klik dan gulir ke halaman
 * LMS, sehingga praja yang sedang membaca terlihat seperti diam.
 *
 * Bila perenderan gagal, komponen memanggil onFallback() lalu menampilkan
 * `fallback` (iframe lama), sehingga dokumen tetap dapat dibaca.
 */

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2];
const MAX_PIXEL_RATIO = 2;

const ReaderMessage = ({ children }) => (
  <div className="flex h-64 w-full items-center justify-center rounded-xl bg-gray-100">
    <p className="text-sm text-gray-400">{children}</p>
  </div>
);

const ZoomBar = ({ zoomIndex, onChange, info }) => (
  <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2">
    <p className="truncate text-xs text-gray-500">{info}</p>

    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(zoomIndex - 1)}
        disabled={zoomIndex === 0}
        className="h-7 w-7 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40"
        aria-label="Perkecil"
      >
        −
      </button>

      <span className="w-12 text-center text-xs font-medium text-gray-600">
        {Math.round(ZOOM_STEPS[zoomIndex] * 100)}%
      </span>

      <button
        type="button"
        onClick={() => onChange(zoomIndex + 1)}
        disabled={zoomIndex === ZOOM_STEPS.length - 1}
        className="h-7 w-7 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40"
        aria-label="Perbesar"
      >
        +
      </button>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

const PdfPage = ({ pdf, pageNumber, cssWidth, ratio, scrollRoot }) => {
  const holderRef = useRef(null);
  const canvasRef = useRef(null);
  // Tanpa IntersectionObserver, semua halaman langsung dirender.
  const [visible, setVisible] = useState(
    () => !("IntersectionObserver" in window),
  );
  const [pageRatio, setPageRatio] = useState(ratio);

  // Halaman baru dirender ketika mendekati area yang terlihat.
  useEffect(() => {
    const holder = holderRef.current;

    if (!holder || !("IntersectionObserver" in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: scrollRoot, rootMargin: "600px 0px" },
    );

    observer.observe(holder);

    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    if (!visible || !cssWidth) return undefined;

    let cancelled = false;
    let renderTask = null;

    const draw = async () => {
      const page = await pdf.getPage(pageNumber);

      if (cancelled || !canvasRef.current) return;

      const base = page.getViewport({ scale: 1 });
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        MAX_PIXEL_RATIO,
      );
      const viewport = page.getViewport({
        scale: (cssWidth / base.width) * pixelRatio,
      });

      setPageRatio(base.height / base.width);

      const canvas = canvasRef.current;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      renderTask = page.render({
        canvasContext: canvas.getContext("2d"),
        viewport,
      });

      await renderTask.promise;
    };

    draw().catch((error) => {
      if (error?.name !== "RenderingCancelledException") {
        console.error(`Gagal merender halaman PDF ${pageNumber}:`, error);
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [visible, pdf, pageNumber, cssWidth]);

  return (
    <div
      ref={holderRef}
      className="mx-auto bg-white shadow-sm"
      style={{ width: cssWidth, height: cssWidth * pageRatio }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
};

// Catatan: pasang dengan key={url} agar status dimulai ulang per dokumen.
export const PdfReader = ({ url, title, fallback, onFallback }) => {
  const [scrollRoot, setScrollRoot] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [firstRatio, setFirstRatio] = useState(1.4142);
  const [status, setStatus] = useState("loading");
  const [baseWidth, setBaseWidth] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(1);

  const onFallbackRef = useRef(onFallback);

  useEffect(() => {
    onFallbackRef.current = onFallback;
  });

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;

    const load = async () => {
      // Dimuat saat dibutuhkan agar tidak membebani halaman lain.
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

      loadingTask = pdfjs.getDocument({ url });

      const loaded = await loadingTask.promise;
      const firstPage = await loaded.getPage(1);
      const base = firstPage.getViewport({ scale: 1 });

      if (cancelled) return;

      setFirstRatio(base.height / base.width);
      setPdf(loaded);
      setStatus("ready");
    };

    load().catch((error) => {
      if (cancelled) return;

      console.error("Gagal memuat PDF di halaman:", error);
      setStatus("error");
      onFallbackRef.current?.();
    });

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [url]);

  // Lebar halaman mengikuti lebar wadah.
  useEffect(() => {
    if (!scrollRoot) return undefined;

    const measure = () =>
      setBaseWidth(Math.max(scrollRoot.clientWidth - 24, 0));

    if (!("ResizeObserver" in window)) {
      const frameId = window.requestAnimationFrame(measure);

      return () => window.cancelAnimationFrame(frameId);
    }

    // ResizeObserver langsung melapor sekali saat mulai mengamati.
    const observer = new ResizeObserver(measure);

    observer.observe(scrollRoot);

    return () => observer.disconnect();
  }, [scrollRoot]);

  if (status === "error") return fallback ?? null;

  const cssWidth = Math.floor(baseWidth * ZOOM_STEPS[zoomIndex]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
      <ZoomBar
        zoomIndex={zoomIndex}
        onChange={setZoomIndex}
        info={pdf ? `${title || "Dokumen"} • ${pdf.numPages} halaman` : title}
      />

      <div
        ref={setScrollRoot}
        className="overflow-auto p-3"
        style={{ maxHeight: "80vh" }}
        data-reader="pdf"
      >
        {status === "loading" && <ReaderMessage>Memuat dokumen...</ReaderMessage>}

        {pdf && cssWidth > 0 && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: pdf.numPages }, (_, index) => (
              <PdfPage
                key={`${index + 1}-${cssWidth}`}
                pdf={pdf}
                pageNumber={index + 1}
                cssWidth={cssWidth}
                ratio={firstRatio}
                scrollRoot={scrollRoot}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* DOCX                                                                */
/* ------------------------------------------------------------------ */

// Catatan: pasang dengan key={url} agar status dimulai ulang per dokumen.
export const DocxReader = ({ url, title, fallback, onFallback }) => {
  const scrollRef = useRef(null);
  const bodyRef = useRef(null);
  const styleRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [fitScale, setFitScale] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(1);

  const onFallbackRef = useRef(onFallback);

  useEffect(() => {
    onFallbackRef.current = onFallback;
  });

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;

    const load = async () => {
      const response = await fetch(url, {
        signal: controller.signal,
        mode: "cors",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();

      if (disposed || !bodyRef.current || !styleRef.current) return;

      bodyRef.current.innerHTML = "";
      styleRef.current.innerHTML = "";

      await renderAsync(blob, bodyRef.current, styleRef.current, {
        className: "docx-reader",
        inWrapper: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        useBase64URL: true,
      });

      if (disposed || !bodyRef.current || !scrollRef.current) return;

      // Halaman DOCX berlebar tetap; perkecil agar muat di layar sempit.
      const firstPage = bodyRef.current.querySelector("section");
      const pageWidth = firstPage?.offsetWidth || 816;
      const available = Math.max(scrollRef.current.clientWidth - 24, 200);

      setFitScale(Math.min(1, available / pageWidth));
      setStatus("ready");
    };

    load().catch((error) => {
      if (disposed || error?.name === "AbortError") return;

      console.error("Gagal memuat DOCX di halaman:", error);
      setStatus("error");
      onFallbackRef.current?.();
    });

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [url]);

  if (status === "error") return fallback ?? null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
      <ZoomBar
        zoomIndex={zoomIndex}
        onChange={setZoomIndex}
        info={title || "Dokumen"}
      />

      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ maxHeight: "80vh" }}
        data-reader="docx"
      >
        <div ref={styleRef} />

        {status === "loading" && <ReaderMessage>Memuat dokumen...</ReaderMessage>}

        <div
          ref={bodyRef}
          style={{
            zoom: fitScale * ZOOM_STEPS[zoomIndex],
            visibility: status === "ready" ? "visible" : "hidden",
          }}
        />
      </div>
    </div>
  );
};