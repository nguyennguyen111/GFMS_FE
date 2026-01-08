import React, { useMemo, useState } from "react";
import { NavLink, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./MemberDashboard.css";

import MemberPackagesPage from "./pages/MemberPackagesPage";
import MemberBookingCreatePage from "./pages/MemberBookingCreatePage";
import MemberBookingsPage from "./pages/MemberBookingsPage";
import MemberCheckinPage from "./pages/MemberCheckinPage";
import PlaceholderPage from "../admin/pages/PlaceholderPage";

export default function MemberDashboard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const menu = useMemo(() => ([
    { label: "Gói tập", to: "/member/packages", key: "packages" },
    { label: "Đặt lịch PT", to: "/member/bookings/new", key: "book-new" },
    { label: "Lịch đã đặt", to: "/member/bookings", key: "bookings" },
  ]), []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  })();

  return (
    <div className="md-layout">
      <div className="md-bg" />

      <aside className={`md-sidebar ${collapsed ? "is-collapsed" : ""}`}>
        <div className="md-brand">
          <div className="md-brand__logo">
            <div className="md-brand__mark">M</div>
            <div className="md-brand__text">
              <div className="md-brand__name">GFMS</div>
              <div className="md-brand__sub">Member Console</div>
            </div>
          </div>

          <button className="md-icon-btn" onClick={() => setCollapsed(v => !v)}>
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="md-nav">
          {menu.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                `md-nav__item ${isActive ? "is-active" : ""}`
              }
            >
              <span className="md-nav__dot" />
              <span className="md-nav__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="md-sidebar__footer">
          <div className="md-mini">
            <div className="md-mini__title">{user?.username || "Member"}</div>
            <div className="md-mini__sub">{user?.email || ""}</div>
          </div>
          <button className="md-btn md-btn--ghost" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="md-main">
        <header className="md-topbar">
          <div>
            <div className="md-topbar__title">Member Console</div>
            <div className="md-topbar__hint">Mua gói • Đặt lịch PT • Check-in</div>
          </div>
          <div className="md-pill">Members</div>
        </header>

        <div className="md-content">
          <Routes>
            <Route path="/" element={<Navigate to="/member/packages" replace />} />
            <Route path="/packages" element={<MemberPackagesPage />} />
            <Route path="/bookings/new" element={<MemberBookingCreatePage />} />
            <Route path="/bookings" element={<MemberBookingsPage />} />
            <Route path="/checkin/:id" element={<MemberCheckinPage />} />
            <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
