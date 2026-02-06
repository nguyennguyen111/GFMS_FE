import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { getTrainerId } from "../components/pt-portal/ptStorage";
import "./PTLayout.css";

const PTLayout = () => {
  const trainerId = getTrainerId();

  // fallback an toàn nếu chưa có trainerId
  const scheduleLink = trainerId
    ? `/pt/${trainerId}/schedule`
    : "/pt/profile";

  const profileLink = trainerId
    ? `/pt/${trainerId}/details`
    : "/pt/profile";

  return (
    <div className="ptl-wrap">
      {/* Sidebar cố định */}
      <aside className="ptl-sidebar">
        <div className="ptl-brand">
          <div className="ptl-logo">GFMS</div>
          <div className="ptl-sub">PT Portal</div>
        </div>

        <nav className="ptl-nav">
          <NavLink
            to="/pt/dashboard"
            className={({ isActive }) => `ptl-item ${isActive ? "active" : ""}`}
          >
            <span className="ptl-ic">🏠</span> Overview
          </NavLink>

          <NavLink
            to="/pt/clients"
            className={({ isActive }) => `ptl-item ${isActive ? "active" : ""}`}
          >
            <span className="ptl-ic">👥</span> Students
          </NavLink>

          <NavLink
            to="/pt/packages"
            className={({ isActive }) => `ptl-item ${isActive ? "active" : ""}`}
          >
            <span className="ptl-ic">📦</span> Packages
          </NavLink>

          <NavLink
            to={profileLink}
            className={({ isActive }) => `ptl-item ${isActive ? "active" : ""}`}
          >
            <span className="ptl-ic">👤</span> Profile
          </NavLink>

          <NavLink
            to={scheduleLink}
            className={({ isActive }) => `ptl-item ${isActive ? "active" : ""}`}
          >
            <span className="ptl-ic">🗓️</span> Schedule
          </NavLink>

          <NavLink
            to="/pt/feedback"
            className={({ isActive }) => `ptl-item ${isActive ? "active" : ""}`}
          >
            <span className="ptl-ic">💬</span> Feedback
          </NavLink>

          <NavLink
            to="/pt/wallet"
            className={({ isActive }) => `ptl-item ${isActive ? "active" : ""}`}
          >
            <span className="ptl-ic">💰</span> Wallet
          </NavLink>

          <NavLink
            to="/pt/payroll"
            className={({ isActive }) => `ptl-item ${isActive ? "active" : ""}`}
          >
            <span className="ptl-ic">💵</span> Payroll
          </NavLink>
        </nav>
      </aside>

      {/* Content đổi theo route */}
      <main className="ptl-content">
        <Outlet />
      </main>
    </div>
  );
};

export default PTLayout;
