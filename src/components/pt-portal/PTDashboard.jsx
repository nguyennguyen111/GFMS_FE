import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import "../../services/chartSetup";
import { makeLineChartData, makeLineOptions } from "../../services/chartService";
import { getTrainerId, setTrainerId } from "./ptStorage";
import { connectSocket } from "../../services/socketClient";
import {
  getMyPTProfile,
  getPTBookings,
  getMyPTWalletSummary,
  getMyPTCommissions,
  getMyPTReviews,
  getPTScheduleSlots,
} from "../../services/ptService";
import "../member/member-pages.css";
import "../member/pages/MemberHomePage.css";
import "./PTDashboard.css";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_SHORT_VI = {
  monday: "T2",
  tuesday: "T3",
  wednesday: "T4",
  thursday: "T5",
  friday: "T6",
  saturday: "T7",
  sunday: "CN",
};

const startOfWeekMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toYMD = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/** Tránh lệch ngày khi bookingDate là chuỗi ISO (UTC) — ưu tiên phần yyyy-mm-dd nếu có */
const bookingToYMD = (bookingDate) => {
  if (bookingDate == null) return "";
  const s = String(bookingDate);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return toYMD(bookingDate);
};

const normalizeWalletPayload = (raw) => {
  const inner = raw?.data ?? raw;
  return {
    availableBalance: Number(inner?.availableBalance ?? 0),
    totalWithdrawn: Number(inner?.totalWithdrawn ?? 0),
  };
};

const normalizeBookings = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const normalizeCommissions = (raw) => {
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw)) return raw;
  return [];
};

const normalizeReviews = (raw) => {
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw)) return raw;
  return [];
};

/** Mốc thời gian bắt đầu buổi (ngày + giờ) để sort đúng thứ tự trong cùng một ngày */
const getBookingStartMs = (b) => {
  const ymd = bookingToYMD(b?.bookingDate);
  if (!ymd) return NaN;
  const raw = b?.startTime != null ? String(b.startTime) : "00:00";
  const hhmm = raw.split(/\s+/)[0].slice(0, 5);
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  const h = m ? Number(m[1]) : 0;
  const min = m ? Number(m[2]) : 0;
  const d = new Date(`${ymd}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`);
  const t = d.getTime();
  return Number.isNaN(t) ? NaN : t;
};

const BOOKING_STATUS_VI = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  in_progress: "Đang diễn ra",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  canceled: "Đã hủy",
  rejected: "Từ chối",
  no_show: "Không đến",
  absent: "Vắng",
};

const formatBookingStatusVi = (status) => {
  if (status == null || status === "") return "—";
  const key = String(status).trim().toLowerCase();
  return BOOKING_STATUS_VI[key] || status;
};

/**
 * Ưu tiên điểm danh PT (trainerAttendance): có/vắng → hoàn thành / chưa hoàn thành.
 * Tránh hiển thị "Đang diễn ra" khi đã điểm danh nhưng booking.status chưa cập nhật.
 */
const getSessionStatusLabel = (booking) => {
  const att = String(booking?.trainerAttendance?.status || "").toLowerCase();
  if (att === "present") return "Hoàn thành (có mặt)";
  if (att === "absent") return "Chưa hoàn thành (vắng mặt)";
  if (att === "late") return "Hoàn thành (đi trễ)";
  return formatBookingStatusVi(booking?.status);
};

const PTDashboard = () => {
  const navigate = useNavigate();
  const [ptId, setPtId] = useState(() => getTrainerId());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [trainer, setTrainer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [wallet, setWallet] = useState({ availableBalance: 0, totalWithdrawn: 0 });
  const [commissions, setCommissions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [scheduleSlots, setScheduleSlots] = useState({});
  const [kpiModal, setKpiModal] = useState(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setLoadError("");
    try {
      const profileRes = await getMyPTProfile();
      const me = profileRes?.DT || profileRes;
      const myId =
        me?.id ?? me?.trainerId ?? me?.trainer?.id ?? me?.PT?.id ?? null;
      if (!myId) {
        setLoadError("Không tìm thấy hồ sơ PT. Hãy tạo hồ sơ trước.");
        setTrainer(null);
        setBookings([]);
        setCommissions([]);
        setReviews([]);
        setScheduleSlots({});
        setWallet({ availableBalance: 0, totalWithdrawn: 0 });
        return;
      }
      setTrainerId(Number(myId));
      setPtId(Number(myId));

      const [bookingsRaw, walletRes, commRes, revRes, sch] = await Promise.all([
        getPTBookings("me").catch(() => []),
        getMyPTWalletSummary().catch(() => ({ data: { availableBalance: 0, totalWithdrawn: 0 } })),
        getMyPTCommissions({}).catch(() => ({ data: [] })),
        getMyPTReviews({}).catch(() => ({ data: [] })),
        getPTScheduleSlots(String(myId)).catch(() => ({})),
      ]);

      setTrainer(me);
      setBookings(normalizeBookings(bookingsRaw));
      setWallet(normalizeWalletPayload(walletRes));
      setCommissions(normalizeCommissions(commRes));
      setReviews(normalizeReviews(revRes));
      setScheduleSlots(sch || {});
    } catch (e) {
      console.error("PTDashboard load error:", e);
      setLoadError(e?.response?.data?.message || "Không tải được bảng điều khiển. Thử đăng nhập lại.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const socket = connectSocket();
    let t = null;
    const onNoti = (payload) => {
      const type = String(payload?.notificationType || "").toLowerCase();
      // Các loại này tác động trực tiếp dashboard KPIs / mini-week.
      if (
        ![
          "booking_update",
          "booking",
          "booking_reschedule",
          "trainer_share",
          "review",
          "feedback",
          "withdrawal",
          "request_update",
        ].includes(type)
      )
        return;
      if (t) clearTimeout(t);
      t = setTimeout(() => loadDashboard({ silent: true }), 350);
    };
    socket.on("notification:new", onNoti);
    socket.on("withdrawal:created", onNoti);
    socket.on("withdrawal:approved", onNoti);
    socket.on("withdrawal:rejected", onNoti);
    return () => {
      if (t) clearTimeout(t);
      socket.off("notification:new", onNoti);
      socket.off("withdrawal:created", onNoti);
      socket.off("withdrawal:approved", onNoti);
      socket.off("withdrawal:rejected", onNoti);
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (!kpiModal) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setKpiModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kpiModal]);

  const stats = useMemo(() => {
    const memberIds = new Set();
    bookings.forEach((b) => {
      if (b?.memberId != null) memberIds.add(Number(b.memberId));
    });
    const studentCount = memberIds.size;

    const totalEarned = Number(trainer?.totalEarned ?? 0);
    const commissionSum = commissions.reduce(
      (acc, c) => acc + Number(c?.commissionAmount ?? 0),
      0
    );
    const totalRevenue = totalEarned > 0 ? totalEarned : commissionSum;

    const ratingDb = Number(trainer?.rating ?? 0);
    const reviewCount = reviews.length;
    const avgFromReviews =
      reviewCount > 0
        ? reviews.reduce((a, r) => a + Number(r?.rating ?? 0), 0) / reviewCount
        : 0;
    const ratingDisplay =
      reviewCount > 0 ? Math.round(avgFromReviews * 10) / 10 : ratingDb || 0;

    return {
      students: studentCount,
      bookingCount: bookings.length,
      totalRevenue,
      wallet: Number(wallet?.availableBalance ?? 0),
      totalWithdrawn: Number(wallet?.totalWithdrawn ?? 0),
      rating: ratingDisplay,
      reviews: reviewCount,
      totalSessions: Number(trainer?.totalSessions ?? 0),
    };
  }, [trainer, bookings, commissions, reviews, wallet]);

  const weekMini = useMemo(() => {
    const monday = startOfWeekMonday(new Date());
    const list = DAY_KEYS.map((key, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ymd = toYMD(d);
      const dayBookings = bookings.filter((b) => bookingToYMD(b.bookingDate) === ymd);
      const slotCount = Array.isArray(scheduleSlots[key]) ? scheduleSlots[key].length : 0;
      let note = "Không có lịch";
      if (dayBookings.length > 0) {
        note = `${dayBookings.length} buổi`;
      } else if (slotCount > 0) {
        note = `${slotCount} slot trống`;
      }
      return {
        day: DAY_SHORT_VI[key] || key,
        note,
        highlight: dayBookings.length > 0,
      };
    });
    return list;
  }, [bookings, scheduleSlots]);


  const recentSessions = useMemo(() => {
    const now = Date.now();
    const withStart = bookings
      .map((b) => ({ ...b, _startMs: getBookingStartMs(b) }))
      .filter((b) => !Number.isNaN(b._startMs));

    const upcoming = withStart
      .filter((b) => b._startMs >= now)
      .sort((a, b) => a._startMs - b._startMs);
    const past = withStart
      .filter((b) => b._startMs < now)
      .sort((a, b) => b._startMs - a._startMs);

    const pick = upcoming.length > 0 ? upcoming.slice(0, 5) : past.slice(0, 5);
    return pick.map((b) => {
      const name =
        b.Member?.User?.username || b.Member?.User?.email || `Học viên #${b.memberId}`;
      const time =
        b.startTime && b.endTime
          ? `${String(b.startTime).slice(0, 5)} - ${String(b.endTime).slice(0, 5)}`
          : "—";
      const ymd = bookingToYMD(b.bookingDate);
      let dateStr = ymd || "—";
      if (ymd) {
        const [yy, mm, dd] = ymd.split("-").map(Number);
        const d = new Date(yy, mm - 1, dd);
        if (!Number.isNaN(d.getTime())) dateStr = d.toLocaleDateString("vi-VN");
      }
      return {
        id: b.id,
        student: name,
        time: `${dateStr} · ${time}`,
        status: getSessionStatusLabel(b),
      };
    });
  }, [bookings]);

  const topStudents = useMemo(() => {
    const seen = new Map();
    bookings.forEach((b) => {
      const mid = b.memberId;
      if (mid == null || seen.has(Number(mid))) return;
      const name =
        b.Member?.User?.username || b.Member?.User?.email || `Học viên #${mid}`;
      const email = b.Member?.User?.email || b.Member?.User?.phone || "";
      seen.set(Number(mid), { name, email });
    });
    return Array.from(seen.values()).slice(0, 5);
  }, [bookings]);

  const allStudentsDetail = useMemo(() => {
    const seen = new Map();
    bookings.forEach((b) => {
      const mid = b.memberId;
      if (mid == null || seen.has(Number(mid))) return;
      const name =
        b.Member?.User?.username || b.Member?.User?.email || `Học viên #${mid}`;
      const email = b.Member?.User?.email || b.Member?.User?.phone || "";
      seen.set(Number(mid), { memberId: mid, name, email });
    });
    return Array.from(seen.values()).sort((a, b) =>
      String(a.name).localeCompare(String(b.name), "vi")
    );
  }, [bookings]);

  const bookingsDetailRows = useMemo(() => {
    return [...bookings]
      .map((b) => ({ ...b, _startMs: getBookingStartMs(b) }))
      .sort((a, b) => {
        const da = Number.isNaN(a._startMs) ? 0 : a._startMs;
        const db = Number.isNaN(b._startMs) ? 0 : b._startMs;
        return db - da;
      });
  }, [bookings]);

  const revenueMeta = useMemo(() => {
    const totalEarned = Number(trainer?.totalEarned ?? 0);
    const commissionSum = commissions.reduce(
      (acc, c) => acc + Number(c?.commissionAmount ?? 0),
      0
    );
    return {
      usesProfile: totalEarned > 0,
      totalRevenue: totalEarned > 0 ? totalEarned : commissionSum,
      commissionSum,
    };
  }, [trainer, commissions]);

  const commissionRowsForModal = useMemo(() => {
    const namesByDate = new Map();
    bookings.forEach((b) => {
      const ymd = bookingToYMD(b?.bookingDate);
      if (!ymd) return;
      const name =
        b.Member?.User?.username ||
        b.Member?.User?.email ||
        (b?.memberId != null ? `Học viên #${b.memberId}` : "—");
      if (!namesByDate.has(ymd)) namesByDate.set(ymd, new Set());
      namesByDate.get(ymd).add(name);
    });

    return [...commissions]
      .sort((a, b) => {
        const da = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
        const db = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
        return db - da;
      })
      .map((c) => {
        const directName =
          c?.memberName ||
          c?.Member?.User?.username ||
          c?.Member?.User?.email ||
          c?.booking?.Member?.User?.username ||
          c?.booking?.Member?.User?.email ||
          c?.PackageActivation?.Member?.User?.username ||
          c?.PackageActivation?.Member?.User?.email ||
          null;

        const ymd = bookingToYMD(c?.sessionDate);
        const dateNames = ymd ? Array.from(namesByDate.get(ymd) || []) : [];
        const fallbackName = dateNames.length > 0 ? dateNames.join(", ") : "—";

        return {
          ...c,
          studentName: directName || fallbackName,
        };
      });
  }, [commissions, bookings]);

  const incomeChart = useMemo(() => {
    const labels = [];
    const sums = [];
    const now = new Date();
    for (let w = 5; w >= 0; w--) {
      const monday = startOfWeekMonday(now);
      monday.setDate(monday.getDate() - w * 7);
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      const sum = commissions.reduce((acc, c) => {
        const sd = c.sessionDate ? new Date(c.sessionDate) : null;
        if (!sd || Number.isNaN(sd.getTime())) return acc;
        if (sd >= monday && sd < nextMonday) return acc + Number(c.commissionAmount ?? 0);
        return acc;
      }, 0);
      const labelFrom = `${monday.getDate()}/${monday.getMonth() + 1}`;
      labels.push(labelFrom);
      sums.push(sum);
    }
    return {
      data: makeLineChartData({
        labels,
        label: "Thu nhập (₫)",
        data: sums,
      }),
      options: makeLineOptions("Thu nhập theo tuần (6 tuần gần nhất)"),
    };
  }, [commissions]);

  const displayName = user?.username || user?.fullName || "PT";
  const email = user?.email || "—";

  const scheduleLink = ptId ? `/pt/${ptId}/schedule` : "/pt/profile";

  if (!user) {
    return (
      <div className="ptd-wrap">
        <div className="ptd-card">
          <h2>Bạn chưa đăng nhập</h2>
          <p>Vui lòng đăng nhập để vào bảng điều khiển PT.</p>
          <button className="ptd-btn" onClick={() => navigate("/login")}>
            Đi tới trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ptd-main2 mh">
      <header className="ptd-topbar">
        <div className="ptd-topLeft">
          <h1 className="mh-title ptd-dashTitle">
            <span className="mh-accent">GFMS</span>{" "}
            <span className="ptd-dashTitleRest">Huấn luyện viên</span>
          </h1>
        </div>

        <div className="ptd-topRight">
          <button type="button" className="mh-btn mh-btn--ghost" onClick={() => loadDashboard()}>
            Làm mới
          </button>
          <div className="ptd-userChip">
            <span className="ptd-userDot" />
            <span className="ptd-userChipName">{displayName}</span>
          </div>
        </div>
      </header>

      {loadError && (
        <div className="ptd-bannerErr" role="alert">
          {loadError}{" "}
          <Link to="/pt/profile/create" className="mh-btn mh-btn--ghost ptd-bannerLink">
            Tạo hồ sơ PT
          </Link>
        </div>
      )}

      {loading && (
        <div className="ptd-loadingBanner">
          <span className="ptd-spinner" />
          Đang tải dữ liệu…
        </div>
      )}

      <section className="ptd-kpiGrid">
        <button
          type="button"
          className="ptd-kpiCard--clickable mh-stat"
          onClick={() => setKpiModal("students")}
        >
          <div className="ptd-kpiHead">
            <div className="mh-stat__k">Học viên</div>
            <div className="ptd-kpiIcon">👥</div>
          </div>
          <div className="mh-stat__v mh-accent ptd-kpiStatNum">{stats.students}</div>
          <div className="mh-stat__s">Đã từng đặt lịch với bạn</div>
        </button>

        <button
          type="button"
          className="ptd-kpiCard--clickable mh-stat"
          onClick={() => setKpiModal("bookings")}
        >
          <div className="ptd-kpiHead">
            <div className="mh-stat__k">Lịch đặt</div>
            <div className="ptd-kpiIcon">📅</div>
          </div>
          <div className="mh-stat__v mh-accent ptd-kpiStatNum">{stats.bookingCount}</div>
          <div className="mh-stat__s">
            Tổng buổi trong hệ thống
            {stats.totalSessions ? ` · Đã ghi nhận ${stats.totalSessions} buổi` : ""}
          </div>
        </button>

        <button
          type="button"
          className="ptd-kpiCard--clickable mh-stat"
          onClick={() => setKpiModal("revenue")}
        >
          <div className="ptd-kpiHead">
            <div className="mh-stat__k">Tổng doanh thu</div>
            <div className="ptd-kpiIcon">🪙</div>
          </div>
          <div className="mh-stat__v mh-accent ptd-kpiStatNum">
            {stats.totalRevenue.toLocaleString("vi-VN")}đ
          </div>
          <div className="mh-stat__s">Theo hồ sơ PT / tổng hoa hồng</div>
        </button>

        <button
          type="button"
          className="ptd-kpiCard--clickable mh-stat"
          onClick={() => setKpiModal("wallet")}
        >
          <div className="ptd-kpiHead">
            <div className="mh-stat__k">Số dư ví</div>
            <div className="ptd-kpiIcon">💳</div>
          </div>
          <div className="mh-stat__v mh-accent ptd-kpiStatNum">
            {stats.wallet.toLocaleString("vi-VN")}đ
          </div>
          <div className="mh-stat__s">
            Đã rút {stats.totalWithdrawn.toLocaleString("vi-VN")}đ
          </div>
        </button>
      </section>

      {kpiModal ? (
        <div
          className="ptd-kpiModalOverlay"
          role="presentation"
          onClick={() => setKpiModal(null)}
        >
          <div
            className="ptd-kpiModal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ptd-kpiModalHead">
              <h2 className="ptd-kpiModalTitle">
                {kpiModal === "students" && "Chi tiết học viên"}
                {kpiModal === "bookings" && "Chi tiết lịch đặt"}
                {kpiModal === "revenue" && "Chi tiết doanh thu / hoa hồng"}
                {kpiModal === "wallet" && "Chi tiết ví PT"}
              </h2>
              <button type="button" className="ptd-kpiModalClose" onClick={() => setKpiModal(null)}>
                ×
              </button>
            </div>
            <div className="ptd-kpiModalBody">
              {kpiModal === "students" && (
                <>
                  <p className="ptd-kpiModalHint">
                    {allStudentsDetail.length} học viên đã từng đặt lịch với bạn.
                  </p>
                  <div className="ptd-kpiModalTable">
                    <div className="ptd-kpiModalRow ptd-kpiModalRow--head">
                      <span>Học viên</span>
                      <span>Liên hệ</span>
                    </div>
                    {allStudentsDetail.length === 0 ? (
                      <div className="ptd-kpiModalEmpty">Chưa có dữ liệu.</div>
                    ) : (
                      allStudentsDetail.map((s) => (
                        <div key={String(s.memberId)} className="ptd-kpiModalRow">
                          <span>{s.name}</span>
                          <span className="ptd-kpiModalMuted">{s.email || "—"}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <Link className="ptd-kpiModalFooterLink" to="/pt/clients" onClick={() => setKpiModal(null)}>
                    Mở trang quản lý học viên
                  </Link>
                </>
              )}

              {kpiModal === "bookings" && (
                <>
                  <p className="ptd-kpiModalHint">
                    {bookingsDetailRows.length} buổi (mới nhất trước).
                  </p>
                  <div className="ptd-kpiModalTable ptd-kpiModalTable--wide">
                    <div className="ptd-kpiModalRow ptd-kpiModalRow--head ptd-kpiModalRow--4">
                      <span>Ngày</span>
                      <span>Giờ</span>
                      <span>Học viên</span>
                      <span>Trạng thái</span>
                    </div>
                    {bookingsDetailRows.length === 0 ? (
                      <div className="ptd-kpiModalEmpty">Chưa có lịch đặt.</div>
                    ) : (
                      bookingsDetailRows.map((b) => {
                        const name =
                          b.Member?.User?.username ||
                          b.Member?.User?.email ||
                          `Học viên #${b.memberId}`;
                        const ymd = bookingToYMD(b.bookingDate);
                        let dateStr = ymd || "—";
                        if (ymd) {
                          const [yy, mm, dd] = ymd.split("-").map(Number);
                          const d = new Date(yy, mm - 1, dd);
                          if (!Number.isNaN(d.getTime())) dateStr = d.toLocaleDateString("vi-VN");
                        }
                        const time =
                          b.startTime && b.endTime
                            ? `${String(b.startTime).slice(0, 5)}–${String(b.endTime).slice(0, 5)}`
                            : "—";
                        return (
                          <div key={String(b.id)} className="ptd-kpiModalRow ptd-kpiModalRow--4">
                            <span>{dateStr}</span>
                            <span className="ptd-kpiModalMuted">{time}</span>
                            <span>{name}</span>
                            <span>{getSessionStatusLabel(b)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {ptId ? (
                    <Link
                      className="ptd-kpiModalFooterLink"
                      to={`/pt/${ptId}/schedule`}
                      onClick={() => setKpiModal(null)}
                    >
                      Mở lịch đầy đủ
                    </Link>
                  ) : null}
                </>
              )}

              {kpiModal === "revenue" && (
                <>
                  <div className="ptd-kpiModalStats">
                    <div>
                      <div className="ptd-kpiModalStatLabel">Tổng hiển thị</div>
                      <div className="ptd-kpiModalStatValue">
                        {revenueMeta.totalRevenue.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                    <div>
                      <div className="ptd-kpiModalStatLabel">Nguồn</div>
                      <div className="ptd-kpiModalStatValue ptd-kpiModalStatValue--sm">
                        {revenueMeta.usesProfile
                          ? "Theo tổng thu (totalEarned) trên hồ sơ PT"
                          : "Theo tổng hoa hồng trong danh sách booking"}
                      </div>
                    </div>
                    <div>
                      <div className="ptd-kpiModalStatLabel">Tổng hoa hồng (danh sách)</div>
                      <div className="ptd-kpiModalStatValue ptd-kpiModalStatValue--sm">
                        {revenueMeta.commissionSum.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  </div>
                  <div className="ptd-kpiModalTable">
                    <div className="ptd-kpiModalRow ptd-kpiModalRow--head ptd-kpiModalRow--3">
                      <span>Ngày</span>
                      <span>Học viên</span>
                      <span>Số tiền</span>
                    </div>
                    {commissionRowsForModal.length === 0 ? (
                      <div className="ptd-kpiModalEmpty">Chưa có bản ghi hoa hồng.</div>
                    ) : (
                      commissionRowsForModal.map((c) => (
                          <div key={String(c.id ?? `${c.sessionDate}-${c.commissionAmount}`)} className="ptd-kpiModalRow ptd-kpiModalRow--3">
                            <span>
                              {c.sessionDate
                                ? new Date(c.sessionDate).toLocaleDateString("vi-VN")
                                : "—"}
                            </span>
                            <span className="ptd-kpiModalStudentNames">{c.studentName}</span>
                            <span>
                              {Number(c.commissionAmount ?? 0).toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                  <Link className="ptd-kpiModalFooterLink" to="/pt/payroll" onClick={() => setKpiModal(null)}>
                    Mở Payroll đầy đủ
                  </Link>
                </>
              )}

              {kpiModal === "wallet" && (
                <>
                  <div className="ptd-kpiModalStats">
                    <div>
                      <div className="ptd-kpiModalStatLabel">Số dư khả dụng</div>
                      <div className="ptd-kpiModalStatValue">
                        {stats.wallet.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                    <div>
                      <div className="ptd-kpiModalStatLabel">Đã rút</div>
                      <div className="ptd-kpiModalStatValue">
                        {stats.totalWithdrawn.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  </div>
                  <p className="ptd-kpiModalHint">
                    Chi tiết giao dịch, yêu cầu chi trả nằm tại trang ví.
                  </p>
                  <Link className="ptd-kpiModalFooterLink" to="/pt/wallet" onClick={() => setKpiModal(null)}>
                    Mở trang ví PT
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <section className="ptd-contentGrid">
        <div className="ptd-leftCol">
          <div className="mh-card">
            <div className="mh-card__head">
              <div>
                <div className="mh-card__title">Lịch tuần này</div>
              </div>
              <Link className="mh-btn mh-btn--ghost ptd-cardHeadLink" to={scheduleLink}>
                Mở lịch đầy đủ
              </Link>
            </div>

            <div className="ptd-miniWeek">
              {weekMini.map((d) => (
                <div
                  key={d.day}
                  className={`ptd-miniDay ${d.highlight ? "ptd-miniDay--busy" : ""}`}
                >
                  <div className="ptd-miniDayName">{d.day}</div>
                  <div className="ptd-miniDaySub">{d.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mh-card">
            <div className="mh-card__head">
              <div>
                <div className="mh-card__title">Buổi gần đây</div>
              </div>
              <Link className="mh-btn mh-btn--ghost ptd-cardHeadLink" to="/pt/clients">
                Xem tất cả
              </Link>
            </div>

            <div className="ptd-table">
              <div className="ptd-tableRow ptd-tableHead">
                <div>Học viên</div>
                <div>Thời gian</div>
                <div>Trạng thái</div>
              </div>
              {recentSessions.length === 0 ? (
                <div className="ptd-tableRow ptd-tableEmpty">
                  <div>Chưa có lịch đặt.</div>
                  <div />
                  <div />
                </div>
              ) : (
                recentSessions.map((row, idx) => (
                  <div className="ptd-tableRow" key={row.id != null ? String(row.id) : `sess-${idx}`}>
                    <div>{row.student}</div>
                    <div className="ptd-tableCellMuted">{row.time}</div>
                    <div>{row.status}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mh-card">
            <div className="mh-card__head">
              <div>
                <div className="mh-card__title">Biểu đồ thu nhập</div>
                <div className="mh-card__desc">6 tuần gần nhất</div>
              </div>
            </div>

            <div className="ptd-chartBox">
              <Line data={incomeChart.data} options={incomeChart.options} />
            </div>
          </div>
        </div>

        <div className="ptd-rightCol">
          <div className="mh-card">
            <div className="mh-card__head">
              <div>
                <div className="mh-card__title">Học viên</div>
              </div>
              <Link className="mh-btn mh-btn--ghost ptd-cardHeadLink" to="/pt/clients">
                Quản lý
              </Link>
            </div>

            {topStudents.length === 0 ? (
              <div className="mh-empty">Chưa có học viên.</div>
            ) : (
              <div className="mh-list ptd-studentListTight">
                {topStudents.map((s, idx) => (
                  <div key={s.email || `${s.name}-${idx}`} className="mh-item">
                    <div>
                      <div className="mh-item__name">{s.name}</div>
                      <div className="mh-item__meta">{s.email || "—"}</div>
                    </div>
                    <Link className="mh-mini" to="/pt/clients">
                      Xem
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mh-card">
            <div className="mh-card__head">
              <div>
                <div className="mh-card__title">Đánh giá</div>
              </div>
            </div>
            <div className="ptd-ratingRow">
              <div className="mh-stat__v mh-accent ptd-ratingNum">{stats.rating || "—"}</div>
              <div className="ptd-star">★</div>
            </div>
            <div className="mh-card__desc">{stats.reviews} đánh giá</div>
          </div>

          <div className="mh-card ptd-userFooter">
            <div className="ptd-userFooterName">{displayName}</div>
            <div className="ptd-userFooterEmail">{email}</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PTDashboard;
