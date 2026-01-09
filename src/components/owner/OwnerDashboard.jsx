import React, { useMemo, useState } from "react";
import { NavLink, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./OwnerDashboard.css";

import OwnerOverviewPage from "./pages/OwnerOverviewPage";
import OwnerPackagesPage from "./pages/OwnerPackagesPage";
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
        { label: "Dashboard", to: "/owner/overview", key: "overview", icon: "📊" },
      ],
    },
    {
      title: "Kinh doanh",
      items: [
        { label: "Gym của tôi", to: "/owner/gyms", key: "gyms", icon: "🏟️" },
        { label: "Gói tập", to: "/owner/packages", key: "packages", icon: "🎫" },
        { label: "Hội viên", to: "/owner/members", key: "members", icon: "👥" },
        { label: "Lịch PT / Booking", to: "/owner/bookings", key: "bookings", icon: "🗓️" },
        { label: "PT / Trainer", to: "/owner/trainers", key: "trainers", icon: "🏋️" },
        { label: "Đánh giá", to: "/owner/reviews", key: "reviews", icon: "⭐" },
      ],
    },
    {
      title: "Tài chính",
      items: [
        { label: "Giao dịch", to: "/owner/transactions", key: "transactions", icon: "💳" },
        { label: "Hoa hồng", to: "/owner/commissions", key: "commissions", icon: "🧾" },
        { label: "Rút tiền", to: "/owner/withdrawals", key: "withdrawals", icon: "🏦" },
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
        { label: "Báo giá", to: "/owner/quotations", key: "quotations", icon: "📝" },
        { label: "Đơn mua", to: "/owner/purchase-orders", key: "po", icon: "🧷" },
        { label: "Nhập kho", to: "/owner/receipts", key: "receipts", icon: "📥" },
        { label: "Nhà cung cấp", to: "/owner/suppliers", key: "suppliers", icon: "🏭" },
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
          <div className="od2-logo">
            <div className="od2-mark">G</div>
            {!collapsed && (
              <div className="od2-brandText">
                <div className="od2-title">GFMS</div>
                <div className="od2-sub">Owner Console</div>
              </div>
            )}
          </div>

          <button className="od2-iconBtn" onClick={() => setCollapsed(v => !v)} title="Thu gọn/mở rộng">
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <div className="od2-profile">
          <div className="od2-avatar">{(user?.username?.[0] || "O").toUpperCase()}</div>
          {!collapsed && (
            <div className="od2-profileText">
              <div className="od2-name">{user?.username || "Owner"}</div>
              <div className="od2-email">{user?.email || ""}</div>
            </div>
          )}
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
        <header className="od2-topbar">
          <div className="od2-topLeft">
            <div className="od2-h1">Owner Dashboard</div>
            <div className="od2-h2">Vận hành • Gói tập • Booking • Tài chính • Kho</div>
          </div>

          <div className="od2-topRight">
            <div className="od2-search">
              <span className="od2-searchIco">⌕</span>
              <input placeholder="Tìm nhanh: member, booking, gói tập..." />
            </div>
            <button className="od2-notiBtn" title="Thông báo">🔔</button>
          </div>
        </header>

        <div className="od2-content">
          <Routes>
            <Route path="/" element={<Navigate to="/owner/overview" replace />} />
            <Route path="/overview" element={<OwnerOverviewPage />} />

            {/* Business */}
            <Route path="/gyms" element={<PlaceholderPage title="Gym của tôi (gym)" />} />
            <Route path="/packages" element={<OwnerPackagesPage />} />
            <Route path="/members" element={<PlaceholderPage title="Hội viên (member, packageActivation)" />} />
            <Route path="/bookings" element={<PlaceholderPage title="Lịch PT / Booking (booking, sessionprogress)" />} />
            <Route path="/trainers" element={<PlaceholderPage title="PT / Trainer (trainer, trainershare)" />} />
            <Route path="/reviews" element={<PlaceholderPage title="Đánh giá (review)" />} />

            {/* Finance */}
            <Route path="/transactions" element={<PlaceholderPage title="Giao dịch (transaction)" />} />
            <Route path="/commissions" element={<PlaceholderPage title="Hoa hồng (commission)" />} />
            <Route path="/withdrawals" element={<PlaceholderPage title="Rút tiền (withdrawal)" />} />

            {/* Inventory & Equipment */}
            <Route path="/equipment" element={<PlaceholderPage title="Thiết bị (equipment, equipmentcategory, equipmentstock)" />} />
            <Route path="/inventory" element={<PlaceholderPage title="Tồn kho (inventory)" />} />
            <Route path="/transfers" element={<PlaceholderPage title="Chuyển kho (equipmenttransfer)" />} />
            <Route path="/maintenance" element={<PlaceholderPage title="Bảo trì (maintenance)" />} />

            {/* Purchasing */}
            <Route path="/quotations" element={<PlaceholderPage title="Báo giá (quotation, quotationitem)" />} />
            <Route path="/purchase-orders" element={<PlaceholderPage title="Đơn mua (purchaseorder, purchaseorderitem)" />} />
            <Route path="/receipts" element={<PlaceholderPage title="Nhập kho (receipt, receiptitem)" />} />
            <Route path="/suppliers" element={<PlaceholderPage title="Nhà cung cấp (supplier)" />} />

            {/* Communication */}
            <Route path="/messages" element={<PlaceholderPage title="Tin nhắn (message)" />} />
            <Route path="/notifications" element={<PlaceholderPage title="Thông báo (notification)" />} />

            {/* System */}
            <Route path="/policies" element={<PlaceholderPage title="Chính sách (policy)" />} />
            <Route path="/franchise-requests" element={<PlaceholderPage title="Yêu cầu nhượng quyền (franchiserequest)" />} />
            <Route path="/settings" element={<PlaceholderPage title="Cài đặt" />} />

            <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
