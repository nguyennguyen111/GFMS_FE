import React, { useMemo, useState } from "react";
import { NavLink, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./OwnerDashboard.css";
import "./OwnerThemeOverrides.css";

import OwnerOverviewPage from "./pages/OwnerOverviewPage";
import OwnerPackagesPage from "./pages/OwnerPackagesPage";
import OwnerPoliciesPage from "./pages/OwnerPoliciesPage";
import OwnerMaintenancePage from "./pages/OwnerMaintenancePage";
import OwnerEquipmentPage from "./pages/OwnerEquipmentPage";
import OwnerInventoryPage from "./pages/OwnerInventoryPage";
import OwnerTransferPage from "./pages/OwnerTransferPage";
import OwnerQuotationsPage from "./pages/OwnerQuotationsPage";
import OwnerPurchaseOrdersPage from "./pages/OwnerPurchaseOrdersPage";
import OwnerReceiptsPage from "./pages/OwnerReceiptsPage";
import OwnerPurchaseRequestsPage from "./pages/OwnerPurchaseRequestsPage";
import OwnerProcurementPaymentsPage from "./pages/OwnerProcurementPaymentsPage";
import OwnerFranchiseRequestsPage from "./pages/OwnerFranchiseRequestsPage";
import OwnerTrainerSharePage from "./pages/OwnerTrainerSharePage";
import OwnerMembersPage from "./pages/OwnerMembersPage";
import OwnerBookingsPage from "./pages/OwnerBookingsPage";
import OwnerGymsPage from "./pages/OwnerGymsPage";
import OwnerTransactionsPage from "./pages/OwnerTransactionsPage";
import OwnerCommissionsPage from "./pages/OwnerCommissionsPage";
import OwnerWithdrawalsPage from "./pages/OwnerWithdrawalsPage";
import PlaceholderPage from "../admin/pages/PlaceholderPage";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  })();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const sections = useMemo(() => ([
    {
      title: "Tổng quan",
      items: [
        { label: "Thống kê", to: "/owner/overview", key: "overview", icon: "📊" },
      ],
    },
    {
      title: "Kinh doanh",
      items: [
        { label: "Phòng tập ", to: "/owner/gyms", key: "gyms", icon: "🏟️" },
        { label: "Gói tập", to: "/owner/packages", key: "packages", icon: "🎫" },
        { label: "Hội viên", to: "/owner/members", key: "members", icon: "👥" },
        { label: "Huấn luyện viên", to: "/owner/bookings", key: "bookings", icon: "🗓️" },
        { label: "Đặt lịch / Chia sẻ Huấn luyện viên", to: "/owner/trainers", key: "trainers", icon: "🏋️" },
        { label: "Đánh giá", to: "/owner/reviews", key: "reviews", icon: "⭐" },
      ],
    },
    {
      title: "Tài chính",
      items: [
        { label: "Giao dịch", to: "/owner/transactions", key: "transactions", icon: "💳" },
        { label: "Hoa hồng", to: "/owner/commissions", key: "commissions", icon: "🧾" },
        { label: "Duyệt yêu cầu rút tiền", to: "/owner/withdrawals", key: "withdrawals", icon: "🏦" },
      ],
    },
    {
      title: "Kho & Thiết bị",
      items: [
        { label: "Thiết bị", to: "/owner/equipment", key: "equipment", icon: "🧰" },
        { label: "Tồn kho", to: "/owner/inventory", key: "inventory", icon: "📦" },
        { label: "Chuyển kho", to: "/owner/transfers", key: "transfers", icon: "🚚" },
        { label: "Bảo trì", to: "/owner/maintenance", key: "maintenance", icon: "🛠️" },
      ],
    },
    {
      title: "Mua hàng",
      items: [
        { label: "Yêu cầu mua thiết bị", to: "/owner/purchase-requests", key: "purchase-requests", icon: "📋" },
        { label: "Báo giá", to: "/owner/quotations", key: "quotations", icon: "📝" },
        { label: "Đơn mua", to: "/owner/purchase-orders", key: "po", icon: "🧷" },
        { label: "Nhận hàng", to: "/owner/receipts", key: "receipts", icon: "📥" },
        { label: "Thanh toán PO", to: "/owner/procurement-payments", key: "procurement-payments", icon: "💰" },
      ],
    },
    {
      title: "Giao tiếp",
      items: [
        { label: "Tin nhắn", to: "/owner/messages", key: "messages", icon: "💬" },
        { label: "Thông báo", to: "/owner/notifications", key: "notifications", icon: "🔔" },
      ],
    },
    {
      title: "Hệ thống",
      items: [
        { label: "Chính sách", to: "/owner/policies", key: "policies", icon: "📜" },
        { label: "Yêu cầu nhượng quyền", to: "/owner/franchise-requests", key: "franchise", icon: "🤝" },
        { label: "Cài đặt", to: "/owner/settings", key: "settings", icon: "⚙️" },
      ],
    },
  ]), []);

  return (
    <div className="od2-layout">
      <aside className={`od2-sidebar ${collapsed ? "is-collapsed" : ""}`}>
        <div className="od2-brand">
        </div>

        <div className="od2-profile">
          <div className="od2-avatar">{(user?.username?.[0] || "O").toUpperCase()}</div>
          {!collapsed && (
            <div className="od2-profileText">
              <div className="od2-name">{user?.username || "Owner"}</div>
              <div className="od2-email">{user?.email || ""}</div>
            </div>
          )}
          <button className="od2-iconBtn" onClick={() => setCollapsed(v => !v)} title="Thu gọn/mở rộng">
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="od2-nav">
          {sections.map((sec) => (
            <div key={sec.title} className="od2-section">
              {!collapsed && <div className="od2-secTitle">{sec.title}</div>}
              {sec.items.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  className={({ isActive }) => `od2-item ${isActive ? "is-active" : ""}`}
                >
                  <span className="od2-ico" aria-hidden>{item.icon}</span>
                  {!collapsed && <span className="od2-label">{item.label}</span>}
                  {!collapsed && <span className="od2-pillDot" />}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="od2-footer">
          <button className="od2-ghostBtn" onClick={handleLogout}>
            {!collapsed ? "Đăng xuất" : "⎋"}
          </button>
          {!collapsed && <div className="od2-footHint">v1 • Owner</div>}
        </div>
      </aside>

      <main className="od2-main">
        {collapsed && (
          <button
            className="od2-menuFab"
            onClick={() => setCollapsed(false)}
            title="Mở menu"
            aria-label="Mở menu"
          >
            ☰
          </button>
        )}
        <div className="od2-content">
          <Routes>
            <Route path="/" element={<Navigate to="/owner/overview" replace />} />
            <Route path="/overview" element={<OwnerOverviewPage />} />

            {/* Business */}
            <Route path="/gyms" element={<OwnerGymsPage />} />
            <Route path="/packages" element={<OwnerPackagesPage />} />
            <Route path="/members" element={<OwnerMembersPage />} />
            <Route path="/bookings" element={<OwnerBookingsPage />} />
            <Route path="/trainers" element={<OwnerTrainerSharePage />} />
            <Route path="/reviews" element={<PlaceholderPage title="Đánh giá (review)" />} />

            {/* Finance */}
            <Route path="/transactions" element={<OwnerTransactionsPage />} />
            <Route path="/commissions" element={<OwnerCommissionsPage />} />
            <Route path="/withdrawals" element={<OwnerWithdrawalsPage />} />

            {/* Inventory & Equipment */}
            <Route path="/equipment" element={<OwnerEquipmentPage />} />
            <Route path="/inventory" element={<OwnerInventoryPage />} />
            <Route path="/transfers" element={<OwnerTransferPage />} />
            <Route path="/maintenance" element={<OwnerMaintenancePage />} />

            {/* Purchasing */}
            <Route path="/purchase-requests" element={<OwnerPurchaseRequestsPage />} />
            <Route path="/quotations" element={<OwnerQuotationsPage />} />
            <Route path="/purchase-orders" element={<OwnerPurchaseOrdersPage />} />
            <Route path="/receipts" element={<OwnerReceiptsPage />} />
            <Route path="/procurement-payments" element={<OwnerProcurementPaymentsPage />} />

            {/* Communication */}
            <Route path="/messages" element={<PlaceholderPage title="Tin nhắn (message)" />} />
            <Route path="/notifications" element={<PlaceholderPage title="Thông báo (notification)" />} />

            {/* System */}
            <Route path="/policies" element={<OwnerPoliciesPage title="Chính sách (policy)" />} />
            <Route path="/franchise-requests" element={<OwnerFranchiseRequestsPage />} />
            <Route path="/settings" element={<PlaceholderPage title="Cài đặt" />} />

            <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
