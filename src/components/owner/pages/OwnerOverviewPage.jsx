import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerOverviewPage.css";
import ownerDashboardService from "../../../services/ownerDashboardService";

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gyms, setGyms] = useState([]);
  const [selectedGymId, setSelectedGymId] = useState(null);
  const [data, setData] = useState({
    todayBookings: 0,
    totalMembers: 0,
    newMembersCount: 0,
    newMembersToday: [],
    upcomingBookings: [],
    expiringMembers: [],
    lowStock: [],
    totalRevenue: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ownerDashboardService.getSummary(selectedGymId);
      if (result.gyms && gyms.length === 0) setGyms(result.gyms);
      setData({
        todayBookings: result.todayBookings ?? 0,
        totalMembers: result.totalMembers ?? 0,
        newMembersCount: result.newMembersCount ?? 0,
        newMembersToday: result.newMembersToday ?? [],
        upcomingBookings: result.upcomingBookings ?? [],
        expiringMembers: result.expiringMembers ?? [],
        lowStock: result.lowStock ?? [],
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

  const formatRevenue = (val) => {
    if (val >= 1_000_000_000) return `₫ ${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `₫ ${(val / 1_000_000).toFixed(1)}M`;
    return `₫ ${val.toLocaleString("vi-VN")}`;
  };

  const stats = [
    {
      title: "Booking hôm nay",
      value: data.todayBookings,
      hint: "tổng booking trong ngày",
      icon: "🗓️",
    },
    {
      title: "Tổng hội viên",
      value: data.totalMembers,
      hint: `hội viên active${data.newMembersCount > 0 ? ` • +${data.newMembersCount} hôm nay` : ""}`,
      icon: "👥",
    },
    {
      title: "Hội viên sắp hết hạn",
      value: data.expiringMembers.length,
      hint: "hết hạn trong 7 ngày tới",
      icon: "⏰",
    },
    {
      title: "Tổng doanh thu",
      value: loading ? "…" : formatRevenue(data.totalRevenue),
      hint: "giao dịch đã hoàn thành",
      icon: "💳",
    },
  ];

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

      {/* ── Chọn chi nhánh ── */}
      {gyms.length > 0 && (
        <GymDropdown
          gyms={gyms}
          selectedGymId={selectedGymId}
          onChange={setSelectedGymId}
        />
      )}

      {/* ── Stat cards ── */}
      <div className="ov-gridStats">
        {stats.map((s) => (
          <StatCard key={s.title} loading={loading} {...s} />
        ))}
      </div>

      {/* ── Row 1 ── */}
      <div className="ov-grid2">
        {/* Booking sắp tới */}
        <Panel
          title="Booking sắp tới"
          right={
            <button className="ov-linkBtn" onClick={() => navigate("/owner/trainers")}>
              Xem tất cả
            </button>
          }
        >
          {loading ? (
            <div className="ov-empty">Đang tải…</div>
          ) : data.upcomingBookings.length === 0 ? (
            <div className="ov-empty">Không có booking sắp tới</div>
          ) : (
            <div className="ov-list">
              {data.upcomingBookings.map((b) => (
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
            <button className="ov-linkBtn" onClick={() => navigate("/owner/members")}>
              Xem hội viên
            </button>
          }
        >
          {loading ? (
            <div className="ov-empty">Đang tải…</div>
          ) : data.expiringMembers.length === 0 ? (
            <div className="ov-empty">Không có hội viên sắp hết hạn</div>
          ) : (
            <div className="ov-list">
              {data.expiringMembers.map((m) => (
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

      {/* ── Row 2 ── */}
      <div className="ov-grid2">
        {/* Tồn kho thấp */}
        <Panel
          title="Tồn kho thấp"
          right={
            <button className="ov-linkBtn" onClick={() => navigate("/owner/inventory")}>
              Xem tồn kho
            </button>
          }
        >
          {loading ? (
            <div className="ov-empty">Đang tải…</div>
          ) : data.lowStock.length === 0 ? (
            <div className="ov-empty">Tồn kho ổn định</div>
          ) : (
            <div className="ov-list">
              {data.lowStock.map((x) => (
                <div className="ov-row" key={x.id}>
                  <div className="ov-badge danger">
                    {x.availableQuantity}/{x.reorderPoint}
                  </div>
                  <div className="ov-rowMain">
                    <div className="ov-rowTitle">
                      {x.equipmentName}{x.equipmentCode ? ` (${x.equipmentCode})` : ""}
                    </div>
                    <div className="ov-rowSub">{x.gymName}</div>
                  </div>
                  <button className="ov-miniBtn" onClick={() => navigate("/owner/purchase-orders")}>
                    Đặt hàng
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Thông báo mới"
          right={
            <button className="ov-linkBtn" onClick={() => navigate("/owner/notifications")}>
              Mở Inbox
            </button>
          }
        >
          <div className="ov-empty">Tính năng thông báo sẽ hiện tại đây.</div>
        </Panel>
      </div>

      {/* ── Row 3: Hội viên mới hôm nay ── */}
      <div className="ov-grid2">
        <Panel
          title={`Hội viên mới hôm nay${data.newMembersCount > 0 ? ` (${data.newMembersCount})` : ""}`}
          right={
            <button className="ov-linkBtn" onClick={() => navigate("/owner/members")}>
              Xem tất cả
            </button>
          }
        >
          {loading ? (
            <div className="ov-empty">Đang tải…</div>
          ) : data.newMembersToday.length === 0 ? (
            <div className="ov-empty">Chưa có hội viên mới hôm nay</div>
          ) : (
            <div className="ov-list">
              {data.newMembersToday.map((m) => (
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
        <div />
      </div>
    </div>
  );
}
