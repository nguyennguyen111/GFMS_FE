
import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getTrainerId } from "../components/pt-portal/ptStorage";
import "./PTLayout.css";

const PTLayout = () => {
  const trainerId = getTrainerId();
  const navigate = useNavigate();

  // Hàm xử lý Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    // Thêm các lệnh xóa token khác nếu có
    navigate("/login");
  };

  const scheduleLink = trainerId ? `/pt/${trainerId}/schedule` : "/pt/profile";
  const profileLink = trainerId ? `/pt/${trainerId}/details` : "/pt/profile";

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
            to="/pt/finance"
            className={({ isActive }) => `ptl-item ${isActive ? "active" : ""}`}
          >
            <span className="ptl-ic">💵</span> Finance
          </NavLink>

          <NavLink
            to="/pt/requests"
            className={({ isActive }) => `ptl-item ${isActive ? "active" : ""}`}
          >
            <span className="ptl-ic">📝</span> Requests
          </NavLink>
        </nav>

        {/* Nút Logout tách biệt ở cuối Sidebar */}
        <div className="ptl-logout-wrap">
          <button onClick={handleLogout} className="ptl-item ptl-logout-btn">
            <span className="ptl-ic">🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Content đổi theo route */}
      <main className="ptl-content">
        <Outlet />
      </main>
    </div>
  );
};

export default PTLayout;