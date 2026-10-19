import React, { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import RatingModal from "./RatingModal";
import { LecturePreview } from "../../pages/student/Player";

const keyOf = (item) => `${item.courseId}|${item.lectureId}`;

// Saat praja masuk LMS: minta rating OP yang sudah diselesaikan (dan dibaca
// >= 30 detik) tetapi belum dirating. Praja dapat berpindah antar OP di
// antrean sebelum memberi nilai.
const PendingRatingPrompt = () => {
  const { backendUrl, getToken, userData } = useContext(AppContext);
  const { isSignedIn, user } = useUser();

  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState({}); // nilai yang sudah dipilih, belum dikirim
  const loadedForRef = useRef("");

  const isStudent =
    isSignedIn && user?.publicMetadata?.role !== "educator" && !!userData?.npp;

  useEffect(() => {
    if (!isStudent) return;

    const key = String(userData?._id || userData?.npp);
    if (loadedForRef.current === key) return;
    loadedForRef.current = key;

    const ambil = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get(backendUrl + "/api/user/pending-ratings", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.success && data.pending.length > 0) {
          setItems(data.pending);
          setIndex(0);
        }
      } catch (error) {
        loadedForRef.current = "";
        console.error("Gagal mengambil rating tertunda:", error);
      }
    };

    ambil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent, userData?._id, userData?.npp]);

  const current = items[index];
  if (!current) return null;

  const kirim = async (rating) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/rate-lecture",
        {
          courseId: current.courseId,
          chapterId: current.chapterId,
          lectureId: current.lectureId,
          rating,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (data.success) {
        const sisa = items.length - 1;

        // Hapus OP yang sudah dinilai; tampilkan OP berikutnya di posisi sama
        setItems((prev) => prev.filter((item) => keyOf(item) !== keyOf(current)));
        setIndex((prev) => Math.min(prev, Math.max(sisa - 1, 0)));
      } else {
        toast.error(data.message || "Gagal menyimpan rating");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <RatingModal
      key={keyOf(current)}
      lectureTitle={current.title}
      subtitle={`Penilaian ${index + 1} dari ${items.length} · ${current.chapterTitle}`}
      preview={
        current.lecture ? (
          <LecturePreview lecture={current.lecture} showVarkBadge={false} />
        ) : null
      }
      initialValue={drafts[keyOf(current)] || 0}
      onChange={(value) =>
        setDrafts((prev) => ({ ...prev, [keyOf(current)]: value }))
      }
      onPrev={index > 0 ? () => setIndex(index - 1) : null}
      onNext={index < items.length - 1 ? () => setIndex(index + 1) : null}
      onSubmit={kirim}
      onSkip={() => setItems([])}
      skipLabel="Nanti saja"
    />
  );
};

export default PendingRatingPrompt;