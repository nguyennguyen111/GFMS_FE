import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import "../../../services/chartSetup";
import "./OwnerOverviewPage.css";
import ownerDashboardService from "../../../services/ownerDashboardService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

function StatCard({ title, value, hint, icon, loading }) {
  return (
    <div className="ov-card">
      <div className="ov-cardTop">
        <div className="ov-ico">{icon}</div>
        <div className="ov-title">{title}</div>
      </div>
      <div className="ov-value">{loading ? "…" : value}</div>
      <div className="ov-hint">{hint}</div>
    </div>
  );
}

function Panel({ title, right, children }) {
  return (
    <div className="ov-panel">
      <div className="ov-panelHead">
        <div className="ov-panelTitle">{title}</div>
        <div className="ov-panelRight">{right}</div>
      </div>
      <div className="ov-panelBody">{children}</div>
    </div>
  );
}

function formatTime(t) {
  if (!t) return "";
  return t.slice(0, 5);
}

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

function GymDropdown({ gyms, selectedGymId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = gyms.find((g) => g.id === selectedGymId);
  const label = selected ? `🏟️ ${selected.name}` : "🏠 Tất cả chi nhánh";

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const btnBase = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "9px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.15)",
    background: "rgba(255,255,255,.07)",
    color: "rgba(255,255,255,.92)",
    fontWeight: 600, fontSize: 13,
    cursor: "pointer", userSelect: "none",
    minWidth: 220,
    justifyContent: "space-between",
  };

  const itemBase = (active) => ({
    padding: "10px 14px",
    cursor: "pointer",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? "rgba(99,179,237,1)" : "rgba(255,255,255,.85)",
    background: active ? "rgba(99,179,237,.15)" : "transparent",
    display: "flex", alignItems: "center", gap: 8,
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)", whiteSpace: "nowrap" }}>Chi nhánh:</span>
      <div ref={ref} style={{ position: "relative" }}>
        <button style={btnBase} onClick={() => setOpen((o) => !o)}>
          <span>{label}</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 999,
            background: "rgba(24,28,40,.97)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 16,
            backdropFilter: "blur(18px)",
            boxShadow: "0 16px 48px rgba(0,0,0,.55)",
            minWidth: 240, padding: 6,
          }}>
            <div
              style={itemBase(selectedGymId === null)}
              onClick={() => { onChange(null); setOpen(false); }}
            >
              🏠 Tất cả chi nhánh
            </div>
            {gyms.map((g) => (
              <div
                key={g.id}
                style={itemBase(selectedGymId === g.id)}
                onClick={() => { onChange(g.id); setOpen(false); }}
              >
                🏟️ {g.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OwnerOverviewPage() {
  const PREVIEW_LIMIT = 4;
  const navigate = useNavigate();
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revenueTrendLoading, setRevenueTrendLoading] = useState(false);
  const [revenueTrendError, setRevenueTrendError] = useState(null);
  const [revenueHighlightsLoading, setRevenueHighlightsLoading] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState("day");
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [revenueHighlights, setRevenueHighlights] = useState({ todayRevenue: 0, monthRevenue: 0 });
  const [viewAllType, setViewAllType] = useState(null);
  const [gyms, setGyms] = useState([]);
  const [data, setData] = useState({
    todayBookings: 0,
    totalMembers: 0,
    newMembersCount: 0,
    newMembersToday: [],
    upcomingBookings: [],
    expiringMembers: [],
    lowStock: [],
    bestSellingPackages: [],
    totalRevenue: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ownerDashboardService.getSummary(selectedGymId);
      if (Array.isArray(result.gyms)) {
        setGyms((prev) => (prev.length === 0 ? result.gyms : prev));
      }
      setData({
        todayBookings: result.todayBookings ?? 0,
        totalMembers: result.totalMembers ?? 0,
        newMembersCount: result.newMembersCount ?? 0,
        newMembersToday: result.newMembersToday ?? [],
        upcomingBookings: result.upcomingBookings ?? [],
        expiringMembers: result.expiringMembers ?? [],
        lowStock: result.lowStock ?? [],
        bestSellingPackages: result.bestSellingPackages ?? [],
        totalRevenue: result.totalRevenue ?? 0,
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [selectedGymId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchRevenueTrend = useCallback(async () => {
    try {
      setRevenueTrendLoading(true);
      setRevenueTrendError(null);
      const result = await ownerDashboardService.getRevenueTrend(revenuePeriod, selectedGymId);
      setRevenueTrend(Array.isArray(result?.series) ? result.series : []);
    } catch (e) {
      setRevenueTrend([]);
      setRevenueTrendError(e?.response?.data?.message || e.message || "Lỗi tải biểu đồ doanh thu");
    } finally {
      setRevenueTrendLoading(false);
    }
  }, [revenuePeriod, selectedGymId]);

  useEffect(() => {
    fetchRevenueTrend();
  }, [fetchRevenueTrend]);

  const fetchRevenueHighlights = useCallback(async () => {
    try {
      setRevenueHighlightsLoading(true);
      const [dayResult, monthResult] = await Promise.all([
        ownerDashboardService.getRevenueTrend("day", selectedGymId),
        ownerDashboardService.getRevenueTrend("month", selectedGymId),
      ]);
      const daySeries = Array.isArray(dayResult?.series) ? dayResult.series : [];
      const monthSeries = Array.isArray(monthResult?.series) ? monthResult.series : [];
      const todayPoint = daySeries.length ? daySeries[daySeries.length - 1] : null;
      const monthPoint = monthSeries.length ? monthSeries[monthSeries.length - 1] : null;

      setRevenueHighlights({
        todayRevenue: Number(todayPoint?.total || 0),
        monthRevenue: Number(monthPoint?.total || 0),
      });
    } catch {
      setRevenueHighlights({ todayRevenue: 0, monthRevenue: 0 });
    } finally {
      setRevenueHighlightsLoading(false);
    }
  }, [selectedGymId]);

  useEffect(() => {
    fetchRevenueHighlights();
  }, [fetchRevenueHighlights]);

  const refreshOverview = useCallback(async () => {
    await Promise.all([fetchData(), fetchRevenueTrend(), fetchRevenueHighlights()]);
  }, [fetchData, fetchRevenueTrend, fetchRevenueHighlights]);

  useOwnerRealtimeRefresh({
    onRefresh: refreshOverview,
    notificationTypes: ["package_purchase", "review", "trainer_share"],
  });

  const formatRevenue = (val) => {
    if (val >= 1_000_000_000) return `₫ ${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `₫ ${(val / 1_000_000).toFixed(1)}M`;
    return `₫ ${val.toLocaleString("vi-VN")}`;
  };

  const chartData = useMemo(() => ({
    labels: revenueTrend.map((item) => item.label),
    datasets: [
      {
        label: "Doanh thu (₫)",
        data: revenueTrend.map((item) => Number(item.total || 0)),
        tension: 0.42,
        fill: true,
        borderColor: "rgba(255,166,77,0.95)",
        backgroundColor: "rgba(255,166,77,0.18)",
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: "rgba(255,193,120,1)",
        pointBorderColor: "rgba(18,22,32,1)",
        pointBorderWidth: 1.5,
      },
    ],
  }), [revenueTrend]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(16,20,30,0.96)",
        borderColor: "rgba(255,255,255,0.14)",
        borderWidth: 1,
        titleColor: "rgba(255,255,255,0.95)",
        bodyColor: "rgba(255,255,255,0.9)",
        callbacks: {
          label: (context) => `Doanh thu: ₫ ${Number(context.parsed.y || 0).toLocaleString("vi-VN")}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "rgba(255,255,255,0.76)", maxTicksLimit: 8 },
        grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
      },
      y: {
        ticks: {
          color: "rgba(255,255,255,0.72)",
          maxTicksLimit: 6,
          callback: (value) => `₫ ${Number(value).toLocaleString("vi-VN")}`,
        },
        grid: { color: "rgba(255,255,255,0.05)", drawBorder: false },
      },
    },
  }), []);

  const revenuePeriodOptions = [
    { key: "day", label: "Ngày" },
    { key: "month", label: "Tháng" },
    { key: "year", label: "Năm" },
  ];

  const stats = [
    {
      title: "Booking hôm nay",
      value: data.todayBookings,
      hint: "Tổng booking trong ngày",
      icon: "🗓️",
    },
    {
      title: "Tổng hội viên",
      value: data.totalMembers,
      hint: `Hội viên đang hoạt động${data.newMembersCount > 0 ? ` • +${data.newMembersCount} hôm nay` : ""}`,
      icon: "👥",
    },
    {
      title: "Hội viên sắp hết hạn",
      value: data.expiringMembers.length,
      hint: "Hết hạn trong 7 ngày tới",
      icon: "⏰",
    },
    {
      title: "Tổng doanh thu",
      value: loading ? "…" : formatRevenue(data.totalRevenue),
      hint: "Doanh thu chia sẻ từ huấn luyện viên",
      icon: "💳",
    },
  ];

  const upcomingPreview = data.upcomingBookings.slice(0, PREVIEW_LIMIT);
  const expiringPreview = data.expiringMembers.slice(0, PREVIEW_LIMIT);
  const newMembersPreview = data.newMembersToday.slice(0, PREVIEW_LIMIT);
  const bestSellingPreview = [...data.bestSellingPackages]
    .sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0))
    .slice(0, PREVIEW_LIMIT);

  const closeViewAll = () => setViewAllType(null);

  const getViewAllConfig = () => {
    if (viewAllType === "bookings") {
      return {
        title: "Tất cả booking sắp tới",
        items: data.upcomingBookings,
        empty: "Không có booking sắp tới",
      };
    }
    if (viewAllType === "expiring") {
      return {
        title: "Tất cả hội viên sắp hết hạn",
        items: data.expiringMembers,
        empty: "Không có hội viên sắp hết hạn",
      };
    }
    if (viewAllType === "newMembers") {
      return {
        title: "Tất cả hội viên mới hôm nay",
        items: data.newMembersToday,
        empty: "Chưa có hội viên mới hôm nay",
      };
    }
    return null;
  };

  const viewAllConfig = getViewAllConfig();

  return (
    <div className="ov-wrap">
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(255,71,87,.16)",
            border: "1px solid rgba(255,71,87,.3)",
            color: "rgba(255,255,255,.85)",
            marginBottom: 4,
          }}
        >
          ⚠️ {error}
          <button
            onClick={fetchData}
            style={{
              marginLeft: 12,
              background: "rgba(255,255,255,.1)",
              border: "1px solid rgba(255,255,255,.2)",
              borderRadius: 10,
              color: "rgba(255,255,255,.85)",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 14,
          background: "rgba(255,255,255,.06)",
          border: "1px solid rgba(255,255,255,.1)",
          color: "rgba(255,255,255,.9)",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: ".08em" }}>
          Đang xem
        </span>
        <strong>{selectedGymName || "Tất cả chi nhánh"}</strong>
      </div>

      {/* ── Stat cards ── */}
      <div className="ov-gridStats">
        {stats.map((s) => (
          <StatCard key={s.title} loading={loading} {...s} />
        ))}
      </div>

      <Panel
        title="Doanh thu (ngày/tháng)"
        right={
          <div className="ov-segment">
            {revenuePeriodOptions.map((option) => (
              <button
                key={option.key}
                className={`ov-segmentBtn ${revenuePeriod === option.key ? "is-active" : ""}`}
                onClick={() => setRevenuePeriod(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="ov-revenueHighlights">
          <div className="ov-revenueChip">
            <div className="ov-revenueChipLabel">Doanh thu hôm nay</div>
            <div className="ov-revenueChipValue">
              {revenueHighlightsLoading ? "…" : `₫ ${Number(revenueHighlights.todayRevenue || 0).toLocaleString("vi-VN")}`}
            </div>
          </div>
          <div className="ov-revenueChip ov-revenueChip--month">
            <div className="ov-revenueChipLabel">Doanh thu tháng này</div>
            <div className="ov-revenueChipValue">
              {revenueHighlightsLoading ? "…" : `₫ ${Number(revenueHighlights.monthRevenue || 0).toLocaleString("vi-VN")}`}
            </div>
          </div>
        </div>
        {revenueTrendLoading ? (
          <div className="ov-empty">Đang tải biểu đồ doanh thu…</div>
        ) : revenueTrendError ? (
          <div className="ov-empty">⚠️ {revenueTrendError}</div>
        ) : revenueTrend.length === 0 ? (
          <div className="ov-empty">Chưa có dữ liệu doanh thu trong khoảng thời gian đã chọn.</div>
        ) : (
          <div className="ov-chartBox">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </Panel>

      {/* ── Row 1 ── */}
      <div className="ov-grid2">
        {/* Booking sắp tới */}
        <Panel
          title="Booking sắp tới"
          right={
            data.upcomingBookings.length > PREVIEW_LIMIT ? (
              <button className="ov-linkBtn" onClick={() => setViewAllType("bookings")}>
                Xem tất cả
              </button>
            ) : null
          }
        >
          {loading ? (
            <div className="ov-empty">Đang tải…</div>
          ) : data.upcomingBookings.length === 0 ? (
            <div className="ov-empty">Không có booking sắp tới</div>
          ) : (
            <div className="ov-list">
              {upcomingPreview.map((b) => (
                <div className="ov-row" key={b.id}>
                  <div className="ov-badge">
                    {formatDate(b.bookingDate)}&nbsp;{formatTime(b.startTime)}
                  </div>
                  <div className="ov-rowMain">
                    <div className="ov-rowTitle">{b.memberName} • {b.trainerName}</div>
                    <div className="ov-rowSub">{b.gymName}</div>
                  </div>
                  <span
                    className="ov-miniBtn"
                    style={{
                      background: b.status === "confirmed" ? "rgba(34,197,94,.15)" : "rgba(255,255,255,.06)",
                      borderColor: b.status === "confirmed" ? "rgba(34,197,94,.3)" : "rgba(255,255,255,.12)",
                    }}
                  >
                    {b.status === "confirmed" ? "Đã duyệt" : "Chờ"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Hội viên sắp hết hạn */}
        <Panel
          title="Hội viên sắp hết hạn gói"
          right={
            data.expiringMembers.length > PREVIEW_LIMIT ? (
              <button className="ov-linkBtn" onClick={() => setViewAllType("expiring")}>
                Xem tất cả
              </button>
            ) : null
          }
        >
          {loading ? (
            <div className="ov-empty">Đang tải…</div>
          ) : data.expiringMembers.length === 0 ? (
            <div className="ov-empty">Không có hội viên sắp hết hạn</div>
          ) : (
            <div className="ov-list">
              {expiringPreview.map((m) => (
                <div className="ov-row" key={m.id}>
                  <div className={`ov-badge ${m.daysLeft <= 3 ? "danger" : "warn"}`}>
                    {m.daysLeft}d
                  </div>
                  <div className="ov-rowMain">
                    <div className="ov-rowTitle">{m.memberName}</div>
                    <div className="ov-rowSub">
                      {m.packageName}
                      {m.sessionsRemaining != null
                        ? ` • còn ${m.sessionsRemaining} buổi`
                        : ""}
                    </div>
                  </div>
                  <span className="ov-miniBtn">
                    HSD: {formatDate(m.packageExpiryDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Row 3: Hội viên mới hôm nay ── */}
      <div className="ov-grid2">
        <Panel
          title={`Hội viên mới hôm nay${data.newMembersCount > 0 ? ` (${data.newMembersCount})` : ""}`}
          right={
            data.newMembersToday.length > PREVIEW_LIMIT ? (
              <button className="ov-linkBtn" onClick={() => setViewAllType("newMembers")}>
                Xem tất cả
              </button>
            ) : null
          }
        >
          {loading ? (
            <div className="ov-empty">Đang tải…</div>
          ) : data.newMembersToday.length === 0 ? (
            <div className="ov-empty">Chưa có hội viên mới hôm nay</div>
          ) : (
            <div className="ov-list">
              {newMembersPreview.map((m) => (
                <div className="ov-row" key={m.id}>
                  <div className="ov-badge" style={{ background: "rgba(34,197,94,.15)", borderColor: "rgba(34,197,94,.3)", color: "rgba(34,197,94,1)", fontSize: 11 }}>
                    Mới
                  </div>
                  <div className="ov-rowMain">
                    <div className="ov-rowTitle">{m.memberName}</div>
                    <div className="ov-rowSub">
                      {m.packageName} • {m.gymName}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 90 }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", fontWeight: 600 }}>{m.phone || "—"}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 2 }}>{m.email || ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Gói bán chạy nhất">
          {loading ? (
            <div className="ov-empty">Đang tải…</div>
          ) : data.bestSellingPackages.length === 0 ? (
            <div className="ov-empty">Chưa có dữ liệu bán gói</div>
          ) : (
            <div className="ov-list">
              {bestSellingPreview.map((p, idx) => (
                <div className="ov-row" key={`${p.packageId}-${idx}`}>
                  <div className="ov-badge" style={{ minWidth: 42 }}>{idx + 1}</div>
                  <div className="ov-rowMain">
                    <div className="ov-rowTitle">{p.packageName}</div>
                    <div className="ov-rowSub">{Number(p.revenue || 0).toLocaleString("vi-VN")} ₫</div>
                  </div>
                  <span className="ov-miniBtn">{p.soldCount} lượt bán</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {viewAllConfig && (
        <div className="ov-modalBackdrop" onClick={closeViewAll}>
          <div className="ov-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ov-modalHead">
              <div className="ov-modalTitle">{viewAllConfig.title}</div>
              <button className="ov-miniBtn" onClick={closeViewAll}>Đóng</button>
            </div>

            <div className="ov-modalBody">
              {viewAllConfig.items.length === 0 ? (
                <div className="ov-empty">{viewAllConfig.empty}</div>
              ) : (
                <div className="ov-list">
                  {viewAllType === "bookings" && viewAllConfig.items.map((b) => (
                    <div className="ov-row" key={`modal-booking-${b.id}`}>
                      <div className="ov-badge">
                        {formatDate(b.bookingDate)}&nbsp;{formatTime(b.startTime)}
                      </div>
                      <div className="ov-rowMain">
                        <div className="ov-rowTitle">{b.memberName} • {b.trainerName}</div>
                        <div className="ov-rowSub">{b.gymName}</div>
                      </div>
                      <button
                        className="ov-miniBtn"
                        onClick={() => {
                          closeViewAll();
                          navigate("/owner/trainers");
                        }}
                      >
                        Chi tiết
                      </button>
                    </div>
                  ))}

                  {viewAllType === "expiring" && viewAllConfig.items.map((m) => (
                    <div className="ov-row" key={`modal-exp-${m.id}`}>
                      <div className={`ov-badge ${m.daysLeft <= 3 ? "danger" : "warn"}`}>
                        {m.daysLeft}d
                      </div>
                      <div className="ov-rowMain">
                        <div className="ov-rowTitle">{m.memberName}</div>
                        <div className="ov-rowSub">
                          {m.packageName}
                          {m.sessionsRemaining != null ? ` • còn ${m.sessionsRemaining} buổi` : ""}
                        </div>
                      </div>
                      <button
                        className="ov-miniBtn"
                        onClick={() => {
                          closeViewAll();
                          navigate("/owner/members");
                        }}
                      >
                        Chi tiết
                      </button>
                    </div>
                  ))}

                  {viewAllType === "newMembers" && viewAllConfig.items.map((m) => (
                    <div className="ov-row" key={`modal-new-${m.id}`}>
                      <div className="ov-badge" style={{ background: "rgba(34,197,94,.15)", borderColor: "rgba(34,197,94,.3)", color: "rgba(34,197,94,1)", fontSize: 11 }}>
                        Mới
                      </div>
                      <div className="ov-rowMain">
                        <div className="ov-rowTitle">{m.memberName}</div>
                        <div className="ov-rowSub">{m.packageName} • {m.gymName}</div>
                      </div>
                      <button
                        className="ov-miniBtn"
                        onClick={() => {
                          closeViewAll();
                          navigate("/owner/members");
                        }}
                      >
                        Chi tiết
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
