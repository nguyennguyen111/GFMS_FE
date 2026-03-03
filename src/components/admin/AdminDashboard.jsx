import React, { useMemo, useState } from "react";
import { NavLink, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import axios from "../../setup/axios";

import DashboardHome from "./pages/DashboardHome";
import UsersPage from "./pages/UsersPage";

import InventoryLogsPage from "./pages/InventoryLogsPage";
import EquipmentPage from "./pages/EquipmentPage";
import SuppliersPage from "./pages/SuppliersPage";
import InventoryPage from "./pages/InventoryPage";
import ReceiptImportPage from "./pages/ReceiptImportPage";
import ExportPage from "./pages/ExportPage";
import GymsPage from "./pages/GymsPage";

// ✅ Purchase workflow (1.1–1.4 bạn đã code)
import PurchaseWorkflowPage from "./pages/PurchaseWorkflowPage";

// ✅ NEW: module 2–6.2 pages (bạn copy thêm bên dưới)
import MaintenancePage from "./pages/MaintenancePage";
import FranchiseRequestsPage from "./pages/FranchiseRequestsPage";
import SharingPoliciesPage from "./pages/SharingPoliciesPage";
import TrainerShareApprovalsPage from "./pages/TrainerShareApprovalsPage";
import TrainerShareOverridesPage from "./pages/TrainerShareOverridesPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import ReportsPage from "./pages/ReportsPage";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const menu = useMemo(
    () => [
      { label: "Tổng quan", to: "/admin/dashboard", key: "dashboard" },

      { section: "Quản trị hệ thống" },
      { label: "Người dùng", to: "/admin/users", key: "users" },
    
      { label: "Phòng gym", to: "/admin/gyms", key: "gyms" },
      { label: "Yêu cầu nhượng quyền", to: "/admin/franchises", key: "franchises" },

      { section: "Thiết bị & Kho" },
      { label: "Thiết bị", to: "/admin/equipment", key: "equipment" },
      { label: "Nhà cung cấp", to: "/admin/suppliers", key: "suppliers" },
      { label: "Mua sắm trang thiết bị", to: "/admin/purchase-workflow", key: "purchase-workflow" },
      { label: "Tồn kho", to: "/admin/stocks", key: "stocks" },
      { label: "Nhật ký kho", to: "/admin/inventory-logs", key: "invlogs" },
      { label: "Nhập kho", to: "/admin/import", key: "import" },
      { label: "Xuất kho", to: "/admin/export", key: "export" },

      { section: "Thiết bị & Kỹ thuật" },
      { label: "Bảo trì / Sửa chữa", to: "/admin/maintenance", key: "maintenance" },

      { section: "Chia sẻ PT" },
      { label: "Chính sách chia sẻ", to: "/admin/policies/sharing", key: "policies" },
      { label: "Duyệt chia sẻ PT", to: "/admin/shared-trainer-approvals", key: "ts-approvals" },
      { label: "Ngoại lệ chia sẻ", to: "/admin/shared-trainers/overrides", key: "overrides" },

      { section: "Báo cáo & Nhật ký" },
      { label: "Báo cáo", to: "/admin/reports", key: "reports" },
      { label: "Audit Logs", to: "/admin/audit-logs", key: "audit" },
    ],
    []
  );

  const handleLogout = async () => {
    try {
      await axios.post("/auth/logout");
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
      window.location.replace("/login");
    }
  };

  return (
    <div className="ad-layout">
      <div className="ad-bg" />

      <aside className={`ad-sidebar ${collapsed ? "is-collapsed" : ""}`}>
        <div className="ad-brand">
          <div className="ad-brand__logo">
            <div className="ad-brand__mark">F</div>
            <div className="ad-brand__text">
              <div className="ad-brand__name">THE FIT CLUB</div>
              <div className="ad-brand__sub">GFMS Admin Console</div>
            </div>
          </div>

          <button className="ad-icon-btn" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="ad-nav">
          {menu.map((item, idx) => {
            if (item.section) {
              return (
                <div className="ad-nav__section" key={idx}>
                  <span>{item.section}</span>
                </div>
              );
            }

            return (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) => `ad-nav__item ${isActive ? "is-active" : ""}`}
              >
                <span className="ad-nav__dot" />
                <span className="ad-nav__label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="ad-sidebar__footer">
          <div className="ad-mini">
            <div className="ad-mini__title">Admin</div>
            <div className="ad-mini__sub">Gym Franchise Management System</div>
          </div>
          <button className="ad-btn ad-btn--ghost" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="ad-main">
        <header className="ad-topbar">
          <div>
            <div className="ad-topbar__title">Admin Console</div>
            <div className="ad-topbar__hint">GFMS • ReactJS • NodeJS • MySQL</div>
          </div>
          <div className="ad-pill">Giai đoạn 2</div>
        </header>

        <div className="ad-content">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/users" element={<UsersPage />} />

            {/* Placeholder: bạn có thể code sau nếu cần */}
            <Route path="/packages" element={<div style={{ color: "#eef2ff" }}>Gói dịch vụ (Catalog) – TODO</div>} />

            <Route path="/gyms" element={<GymsPage title="Quản lý phòng gym" />} />
            <Route path="/franchises" element={<FranchiseRequestsPage />} />

            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/purchase-workflow" element={<PurchaseWorkflowPage />} />

            <Route path="/stocks" element={<InventoryPage />} />
            <Route path="/inventory-logs" element={<InventoryLogsPage />} />
            <Route path="/import" element={<ReceiptImportPage />} />
            <Route path="/export" element={<ExportPage />} />

            {/* ✅ Module 2 */}
            <Route path="/maintenance" element={<MaintenancePage />} />

            {/* ✅ Module 4–5 */}
            <Route path="/policies/sharing" element={<SharingPoliciesPage />} />
            <Route path="/shared-trainer-approvals" element={<TrainerShareApprovalsPage />} />
            <Route path="/shared-trainers/overrides" element={<TrainerShareOverridesPage />} />

            {/* ✅ Module 6 */}
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />

            <Route path="*" element={<div style={{ color: "#eef2ff" }}>Không tìm thấy trang</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
