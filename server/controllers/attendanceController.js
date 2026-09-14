import User from "../models/User.js";
import Keprajaan from "../models/Keprajaan.js";
import {
  Attendance,
  ATTENDANCE_STATUSES,
  TOTAL_MEETINGS,
} from "../models/Attendance.js";

/**
 * GET /api/educator/attendance?courseId=...&meeting=3
 *
 * Mengembalikan daftar praja terdaftar beserta status presensinya
 * pada pertemuan tersebut. Praja yang belum dicatat berstatus null.
 */
export const getAttendanceSheet = async (req, res) => {
  try {
    const { courseId } = req.query;
    const meetingNumber = Number(req.query.meeting);

    if (!courseId) {
      return res.json({ success: false, message: "courseId wajib diisi" });
    }

    if (
      !Number.isInteger(meetingNumber) ||
      meetingNumber < 1 ||
      meetingNumber > TOTAL_MEETINGS
    ) {
      return res.json({
        success: false,
        message: `Nomor pertemuan harus 1-${TOTAL_MEETINGS}`,
      });
    }

    const users = await User.find(
      { enrolledCourses: courseId },
      "name npp",
    ).lean();

    const npps = users.map((u) => u.npp).filter(Boolean);
    const prajaList = await Keprajaan.find(
      { npp: { $in: npps } },
      "npp nama kelas",
    ).lean();

    const prajaByNpp = new Map(prajaList.map((p) => [p.npp, p]));

    const records = await Attendance.find({ courseId, meetingNumber }).lean();
    const recordByUserId = new Map(records.map((r) => [r.userId, r]));

    const daftar = users
      .map((user) => {
        const praja = prajaByNpp.get(user.npp);
        const record = recordByUserId.get(user._id);

        return {
          userId: user._id,
          npp: user.npp || null,
          nama: praja?.nama || user.name,
          kelas: praja?.kelas || null,
          status: record?.status || null,
          keterangan: record?.keterangan || "",
        };
      })
      .sort((a, b) => {
        if (a.kelas !== b.kelas) return (a.kelas || "").localeCompare(b.kelas || "");
        return (a.npp || "").localeCompare(b.npp || "");
      });

    return res.json({
      success: true,
      meetingNumber,
      totalTercatat: records.length,
      daftar,
    });
  } catch (error) {
    console.error("getAttendanceSheet error:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * POST /api/educator/attendance
 * body: { courseId, meetingNumber, entries: [{ userId, status, keterangan }] }
 *
 * Menyimpan seluruh baris sekaligus (upsert). Baris tanpa status diabaikan.
 */
export const saveAttendanceSheet = async (req, res) => {
  try {
    const { courseId, meetingNumber, entries } = req.body;

    if (!courseId || !Array.isArray(entries)) {
      return res.json({
        success: false,
        message: "courseId dan entries wajib diisi",
      });
    }

    const nomor = Number(meetingNumber);

    if (!Number.isInteger(nomor) || nomor < 1 || nomor > TOTAL_MEETINGS) {
      return res.json({
        success: false,
        message: `Nomor pertemuan harus 1-${TOTAL_MEETINGS}`,
      });
    }

    const valid = entries.filter(
      (e) => e?.userId && ATTENDANCE_STATUSES.includes(e.status),
    );

    if (valid.length === 0) {
      return res.json({ success: false, message: "Tidak ada data yang valid" });
    }

    const userIds = valid.map((e) => e.userId);
    const users = await User.find({ _id: { $in: userIds } }, "npp").lean();
    const nppByUserId = new Map(users.map((u) => [u._id, u.npp || null]));

    const operations = valid.map((entry) => ({
      updateOne: {
        filter: { courseId, meetingNumber: nomor, userId: entry.userId },
        update: {
          $set: {
            status: entry.status,
            keterangan: entry.keterangan || "",
            npp: nppByUserId.get(entry.userId) || null,
            recordedBy: req.educator?.id || req.educator?.email || null,
          },
        },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(operations, { ordered: false });

    return res.json({
      success: true,
      message: `${valid.length} data presensi tersimpan`,
      tersimpan: valid.length,
      baru: result.upsertedCount || 0,
      diperbarui: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("saveAttendanceSheet error:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * GET /api/educator/attendance/recap?courseId=...
 * Rekap jumlah pertemuan tercatat per nomor pertemuan.
 */
export const getAttendanceRecap = async (req, res) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.json({ success: false, message: "courseId wajib diisi" });
    }

    const rekap = await Attendance.aggregate([
      { $match: { courseId } },
      {
        $group: {
          _id: "$meetingNumber",
          total: { $sum: 1 },
          hadir: {
            $sum: { $cond: [{ $eq: ["$status", "hadir"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.json({
      success: true,
      rekap: rekap.map((r) => ({
        meetingNumber: r._id,
        total: r.total,
        hadir: r.hadir,
      })),
    });
  } catch (error) {
    console.error("getAttendanceRecap error:", error);
    return res.json({ success: false, message: error.message });
  }
};
