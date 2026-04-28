import React, { useMemo, useState } from "react";
import { NavLink, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import { logoutUser } from "../../services/authService";
import logo from "../../assets/logo.jpg";
import logoWordmark from "../../assets/logo-wordmark.png";

import DashboardHome from "./pages/DashboardHome";
import UsersPage from "./pages/UsersPage";
import EquipmentPage from "./pages/EquipmentPage";
import EquipmentCatalogPage from "./pages/EquipmentCatalogPage";
import SuppliersPage from "./pages/SuppliersPage";
import InventoryPage from "./pages/InventoryPage";
import GymsPage from "./pages/GymsPage";
import PurchaseWorkflowPage from "./pages/PurchaseWorkflowPage";
import EquipmentAssetsPage from "./pages/EquipmentAssetsPage";
import MaintenancePage from "./pages/MaintenancePage";
import FranchiseRequestsPage from "./pages/FranchiseRequestsPage";
import AdminNotificationBell from "./AdminNotificationBell";
import AdminRequestApprovalPopup from "./AdminRequestApprovalPopup";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const menu = useMemo(() => [
    { label: "Tổng quan", to: "/admin/dashboard", key: "dashboard" },
    { section: "Quản trị hệ thống" },
    { label: "Người dùng", to: "/admin/users", key: "users" },
    { label: "Phòng gym", to: "/admin/gyms", key: "gyms" },
    { label: "Yêu cầu nhượng quyền", to: "/admin/franchises", key: "franchises" },
    { section: "Thiết bị & Combo" },
    { label: "Thiết bị", to: "/admin/devices", key: "devices" },
    { label: "Combo thiết bị", to: "/admin/equipment", key: "equipment" },
    { label: "Nhà cung cấp", to: "/admin/suppliers", key: "suppliers" },
    { label: "Yêu cầu bán combo", to: "/admin/purchase-workflow", key: "purchase-workflow" },
    { section: "Thiết bị & Kỹ thuật" },
    { label: "Thiết bị (QR)", to: "/admin/equipment-assets", key: "equipment-assets" },
    { label: "Bảo trì thiết bị", to: "/admin/maintenance", key: "maintenance" },
  ], []);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login", { replace: true });
    window.location.replace("/login");
  };

  return (
    <div className="ad-layout">
      <div className="ad-bg" />
      <AdminRequestApprovalPopup />

      <aside className={`ad-sidebar ${collapsed ? "is-collapsed" : ""}`}>
        <div className="ad-brand">
          <div className="ad-brand__logo">
            <img className="ad-brand__avatar" src={logo} alt="GFMS logo" />
            <div className="ad-brand__text">
              <img className="ad-brand__wordmark" src={logoWordmark} alt="GFMS" />
              <div className="ad-brand__sub">Bảng quản trị GFMS</div>
            </div>
          </div>
          <button className="ad-icon-btn" onClick={() => setCollapsed((v) => !v)}>{collapsed ? "»" : "«"}</button>
        </div>

        <nav className="ad-nav">
          {menu.map((item, idx) => item.section ? (
            <div className="ad-nav__section" key={idx}><span>{item.section}</span></div>
          ) : (
            <NavLink key={item.key} to={item.to} className={({ isActive }) => `ad-nav__item ${isActive ? "is-active" : ""}`}>
              <span className="ad-nav__dot" />
              <span className="ad-nav__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ad-sidebar__footer">
          <div className="ad-mini">
            <div className="ad-mini__title">Quản trị</div>
            <div className="ad-mini__sub">Hệ thống quản lý nhượng quyền phòng tập</div>
          </div>
          <button className="ad-btn ad-btn--ghost" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="ad-main">
        <header className="ad-topbar">
          <div className="ad-topbar__fill" />
          <AdminNotificationBell />
        </header>
        <div className="ad-content">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/packages" element={<div style={{ color: "#eef2ff" }}>Gói dịch vụ (danh mục) — đang phát triển</div>} />
            <Route path="/gyms" element={<GymsPage title="Quản lý phòng gym" />} />
            <Route path="/franchises" element={<FranchiseRequestsPage />} />
            <Route path="/devices" element={<EquipmentCatalogPage />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/purchase-workflow" element={<PurchaseWorkflowPage />} />
            <Route path="/equipment-assets" element={<EquipmentAssetsPage />} />
            <Route path="/stocks" element={<InventoryPage />} />
            <Route path="/inventory-logs" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/import" element={<Navigate to="/admin/purchase-workflow" replace />} />
            <Route path="/export" element={<Navigate to="/admin/purchase-workflow" replace />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/reports" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/audit-logs" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<div style={{ color: "#eef2ff" }}>Không tìm thấy trang quản trị</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
