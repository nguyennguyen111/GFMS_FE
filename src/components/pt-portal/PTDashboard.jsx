import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import "../../services/chartSetup";
import { makeLineChartData, makeLineOptions } from "../../services/chartService";
import { getTrainerId, setTrainerId } from "./ptStorage";
import {
  getMyPTProfile,
  getPTBookings,
  getMyPTWalletSummary,
  getMyPTCommissions,
  getMyPTReviews,
  getPTScheduleSlots,
  getMyPTPayrollPeriods,
} from "../../services/ptService";
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

const normalizePayrollItems = (raw) => {
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw)) return raw;
  return [];
};

/** Nhãn ngắn cho kỳ lương (trục biểu đồ) */
const formatPayrollPeriodLabel = (item, idx) => {
  const p = item?.PayrollPeriod;
  if (!p?.startDate || !p?.endDate) return `Kỳ ${idx + 1}`;
  const s = new Date(p.startDate);
  const e = new Date(p.endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `Kỳ ${idx + 1}`;
  return `${s.getDate()}/${s.getMonth() + 1}→${e.getDate()}/${e.getMonth() + 1}`;
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
  const [payrollItems, setPayrollItems] = useState([]);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
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
        setPayrollItems([]);
        setWallet({ availableBalance: 0, totalWithdrawn: 0 });
        return;
      }
      setTrainerId(Number(myId));
      setPtId(Number(myId));

      const [bookingsRaw, walletRes, commRes, revRes, sch, payrollRes] = await Promise.all([
        getPTBookings("me").catch(() => []),
        getMyPTWalletSummary().catch(() => ({ data: { availableBalance: 0, totalWithdrawn: 0 } })),
        getMyPTCommissions({}).catch(() => ({ data: [] })),
        getMyPTReviews({}).catch(() => ({ data: [] })),
        getPTScheduleSlots(String(myId)).catch(() => ({})),
        getMyPTPayrollPeriods().catch(() => ({ data: [] })),
      ]);

      setTrainer(me);
      setBookings(normalizeBookings(bookingsRaw));
      setWallet(normalizeWalletPayload(walletRes));
      setCommissions(normalizeCommissions(commRes));
      setReviews(normalizeReviews(revRes));
      setScheduleSlots(sch || {});
      setPayrollItems(normalizePayrollItems(payrollRes));
    } catch (e) {
      console.error("PTDashboard load error:", e);
      setLoadError(e?.response?.data?.message || "Không tải được dashboard. Thử đăng nhập lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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

  const revenueChart = useMemo(() => {
    const labels = [];
    const sums = [];
    const now = new Date();
    for (let w = 3; w >= 0; w--) {
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
        label: "Hoa hồng (₫)",
        data: sums,
      }),
      options: makeLineOptions("Hoa hồng theo tuần (4 tuần gần nhất)"),
    };
  }, [commissions]);

  /** Lương theo kỳ payroll đã chốt (totalAmount trên PayrollItem) */
  const salaryChart = useMemo(() => {
    const sorted = [...payrollItems]
      .filter((x) => x?.PayrollPeriod)
      .sort((a, b) => {
        const da = new Date(a.PayrollPeriod.startDate || 0).getTime();
        const db = new Date(b.PayrollPeriod.startDate || 0).getTime();
        return da - db;
      });
    const last = sorted.slice(-6);
    const labels = last.map((it, idx) => formatPayrollPeriodLabel(it, idx));
    const sums = last.map((it) => Number(it.totalAmount ?? 0));
    const empty = last.length === 0;
    return {
      data: makeLineChartData({
        labels: empty ? ["—"] : labels,
        label: "Lương theo kỳ (₫)",
        data: empty ? [0] : sums,
        borderColor: "rgba(78, 205, 196, 0.95)",
        backgroundColor: "rgba(78, 205, 196, 0.14)",
      }),
      options: makeLineOptions("Lương theo kỳ đã chốt (tối đa 6 kỳ gần nhất)"),
      empty,
    };
  }, [payrollItems]);

  const displayName = user?.username || user?.fullName || "PT";
  const email = user?.email || "—";

  const scheduleLink = ptId ? `/pt/${ptId}/schedule` : "/pt/profile";

  if (!user) {
    return (
      <div className="ptd-wrap">
        <div className="ptd-card">
          <h2>Bạn chưa đăng nhập</h2>
          <p>Vui lòng đăng nhập để vào PT Dashboard.</p>
          <button className="ptd-btn" onClick={() => navigate("/login")}>
            Đi tới trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ptd-main2">
      <header className="ptd-topbar">
        <div className="ptd-topLeft">
          <div className="ptd-appName">
            <span className="ptd-brandOrange">GFMS</span> Coach
          </div>
        </div>

        <div className="ptd-topRight">
          <button type="button" className="ptd-pillBtn" onClick={() => loadDashboard()}>
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
          <Link to="/pt/profile/create" className="ptd-link">
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
        <div className="ptd-kpiCard">
          <div className="ptd-kpiHead">
            <div className="ptd-kpiTitle">Học viên</div>
            <div className="ptd-kpiIcon">👥</div>
          </div>
          <div className="ptd-kpiValue">{stats.students}</div>
          <div className="ptd-kpiSub">Đã từng đặt lịch với bạn</div>
        </div>

        <div className="ptd-kpiCard">
          <div className="ptd-kpiHead">
            <div className="ptd-kpiTitle">Lịch đặt</div>
            <div className="ptd-kpiIcon">📅</div>
          </div>
          <div className="ptd-kpiValue">{stats.bookingCount}</div>
          <div className="ptd-kpiSub">
            Tổng buổi trong hệ thống
            {stats.totalSessions ? ` · Đã ghi nhận ${stats.totalSessions} buổi` : ""}
          </div>
        </div>

        <div className="ptd-kpiCard">
          <div className="ptd-kpiHead">
            <div className="ptd-kpiTitle">Tổng doanh thu</div>
            <div className="ptd-kpiIcon">🪙</div>
          </div>
          <div className="ptd-kpiValue">{stats.totalRevenue.toLocaleString("vi-VN")}đ</div>
          <div className="ptd-kpiSub">Theo hồ sơ PT / tổng hoa hồng</div>
        </div>

        <div className="ptd-kpiCard">
          <div className="ptd-kpiHead">
            <div className="ptd-kpiTitle">Số dư ví</div>
            <div className="ptd-kpiIcon">💳</div>
          </div>
          <div className="ptd-kpiValue">{stats.wallet.toLocaleString("vi-VN")}đ</div>
          <div className="ptd-kpiSub">
            Đã rút {stats.totalWithdrawn.toLocaleString("vi-VN")}đ ·{" "}
            <Link className="ptd-link" to="/pt/wallet">
              ví
            </Link>
          </div>
        </div>
      </section>

      <section className="ptd-quickRow" aria-label="Lối tắt">
        <Link className="ptd-quickItem" to="/pt/feedback">
          Feedback
        </Link>
        <Link className="ptd-quickItem" to="/pt/demo-videos">
          Video demo
        </Link>
        <Link className="ptd-quickItem" to="/pt/wallet">
          Ví PT
        </Link>
        <Link className="ptd-quickItem" to="/pt/payroll">
          Payroll
        </Link>
        {ptId ? (
          <Link className="ptd-quickItem" to={`/pt/${ptId}/details`}>
            Hồ sơ
          </Link>
        ) : null}
      </section>

      <section className="ptd-contentGrid">
        <div className="ptd-leftCol">
          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Lịch tuần này</div>
              <Link className="ptd-link" to={scheduleLink}>
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

          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Buổi gần đây</div>
              <Link className="ptd-link" to="/pt/clients">
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

          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Biểu đồ hoa hồng</div>
              <div className="ptd-muted2">4 tuần gần nhất</div>
            </div>

            <div className="ptd-chartBox">
              <Line data={revenueChart.data} options={revenueChart.options} />
            </div>
          </div>

          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Biểu đồ lương</div>
              <Link className="ptd-link" to="/pt/payroll">
                Chi tiết payroll
              </Link>
            </div>
            <div className="ptd-chartHint">
              Tổng tiền theo từng kỳ lương đã chốt (Payroll). Màu teal phân biệt với hoa hồng theo tuần.
            </div>
            {salaryChart.empty ? (
              <div className="ptd-chartEmpty">Chưa có kỳ lương đã chốt.</div>
            ) : (
              <div className="ptd-chartBox">
                <Line data={salaryChart.data} options={salaryChart.options} />
              </div>
            )}
          </div>
        </div>

        <div className="ptd-rightCol">
          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Học viên</div>
              <Link className="ptd-link" to="/pt/clients">
                Quản lý
              </Link>
            </div>

            {topStudents.length === 0 ? (
              <div className="ptd-muted2">Chưa có học viên.</div>
            ) : (
              topStudents.map((s, idx) => (
                <div key={s.email || `${s.name}-${idx}`} className="ptd-studentItem">
                  <div className="ptd-avatar" />
                  <div className="ptd-studentMeta">
                    <div className="ptd-studentName">{s.name}</div>
                    <div className="ptd-studentEmail">{s.email || "—"}</div>
                  </div>
                  <Link className="ptd-miniBtn" to="/pt/clients">
                    Xem
                  </Link>
                </div>
              ))
            )}
          </div>

          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Đánh giá</div>
              <Link className="ptd-link" to="/pt/feedback">
                Feedback
              </Link>
            </div>
            <div className="ptd-ratingRow">
              <div className="ptd-ratingValue">{stats.rating || "—"}</div>
              <div className="ptd-star">★</div>
            </div>
            <div className="ptd-muted2">{stats.reviews} đánh giá</div>
          </div>

          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Hoa hồng &amp; lương</div>
            </div>
            <div className="ptd-planText">
              Xem chi tiết hoa hồng theo kỳ, xuất Excel và yêu cầu chi trả tại trang{" "}
              <Link className="ptd-link" to="/pt/payroll">
                Payroll
              </Link>
              .
            </div>
            <Link className="ptd-upgradeBtn ptd-upgradeBtn--link" to="/pt/payroll">
              Mở Payroll
            </Link>
          </div>

          <div className="ptd-card2 ptd-userFooter">
            <div className="ptd-userFooterName">{displayName}</div>
            <div className="ptd-userFooterEmail">{email}</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PTDashboard;
