import React, { Suspense, useEffect, useMemo, useState } from "react";
import { NavLink, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import "../member/member-pages.css";
import "./OwnerDashboard.css";
import "./OwnerThemeOverrides.css";
import Header from "../header/Header";
import { logoutUser } from "../../services/authService";
import useSelectedGym from "../../hooks/useSelectedGym";
import useOwnerRealtimeRefresh from "../../hooks/useOwnerRealtimeRefresh";
import { showAppToast } from "../../utils/appToast";
import { getOwnerGymsListCached, invalidateOwnerGymsListCache } from "../../utils/ownerGymsListCache";

const OwnerOverviewPage = React.lazy(() => import("./pages/OwnerOverviewPage"));
const OwnerPackagesPage = React.lazy(() => import("./pages/OwnerPackagesPage"));
const OwnerMaintenancePage = React.lazy(() => import("./pages/OwnerMaintenancePage"));
const OwnerEquipmentPage = React.lazy(() => import("./pages/OwnerEquipmentPage"));
const OwnerInventoryPage = React.lazy(() => import("./pages/OwnerInventoryPage"));
const OwnerPurchaseOrdersPage = React.lazy(() => import("./pages/OwnerPurchaseOrdersPage"));
const OwnerReceiptsPage = React.lazy(() => import("./pages/OwnerReceiptsPage"));
const OwnerPurchaseRequestsPage = React.lazy(() => import("./pages/OwnerPurchaseRequestsPage"));
const OwnerProcurementPaymentsPage = React.lazy(() => import("./pages/OwnerProcurementPaymentsPage"));
const OwnerFranchiseRequestsPage = React.lazy(() => import("./pages/OwnerFranchiseRequestsPage"));
const OwnerTrainerSharePage = React.lazy(() => import("./pages/OwnerTrainerSharePage"));
const OwnerMembersPage = React.lazy(() => import("./pages/OwnerMembersPage"));
const OwnerBookingsPage = React.lazy(() => import("./pages/OwnerBookingsPage"));
const OwnerGymsPage = React.lazy(() => import("./pages/OwnerGymsPage"));
const OwnerTransactionsPage = React.lazy(() => import("./pages/OwnerTransactionsPage"));
const OwnerCommissionsPage = React.lazy(() => import("./pages/OwnerCommissionsPage"));
const OwnerWithdrawalsPage = React.lazy(() => import("./pages/OwnerWithdrawalsPage"));
const OwnerReviewsPage = React.lazy(() => import("./pages/OwnerReviewsPage"));
const OwnerNotificationsPage = React.lazy(() => import("./pages/OwnerNotificationsPage"));
const PlaceholderPage = React.lazy(() => import("../admin/pages/PlaceholderPage"));

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [suspendedGym, setSuspendedGym] = useState(null);

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      showAppToast({
        type: "info",
        title: "Thông báo",
        message: String(message || ""),
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  })();

  const syncSelectedGymStatus = async () => {
    if (!selectedGymId) {
      setSuspendedGym(null);
      return;
    }

    try {
      const gyms = await getOwnerGymsListCached();
      const nextSelectedGym = (gyms || []).find((gym) => Number(gym.id) === Number(selectedGymId));
      setSuspendedGym(String(nextSelectedGym?.status || "").toLowerCase() === "suspended" ? nextSelectedGym : null);
    } catch {
      setSuspendedGym(null);
    }
  };

  useEffect(() => {
    syncSelectedGymStatus();
  }, [selectedGymId]);

  useOwnerRealtimeRefresh({
    enabled: Boolean(selectedGymId),
    events: ["gym:changed"],
    onRefresh: async () => {
      invalidateOwnerGymsListCache();
      await syncSelectedGymStatus();
    },
  });

  useEffect(() => {
    if (!suspendedGym) return;
    if (location.pathname !== "/owner/gyms") {
      showAppToast({
        type: "warning",
        title: "Gym đang tạm ngưng",
        message: `Chi nhánh ${suspendedGym.name || `#${suspendedGym.id}`} đang bị admin tạm ngưng. Hệ thống đã chuyển bạn về mục Phòng tập.`,
      });
      navigate("/owner/gyms", { replace: true });
    }
  }, [suspendedGym, location.pathname, navigate]);

  const handleLogout = () => {
    logoutUser().finally(() => navigate("/login"));
  };

  const sections = useMemo(() => ([
    {
      title: "Tổng quan",
      items: [
        { label: "Thống kê", to: "/owner/overview", key: "overview", },
      ],
    },
    {
      title: "Kinh doanh",
      items: [
        { label: "Phòng tập ", to: "/owner/gyms", key: "gyms",  },
        { label: "Gói tập", to: "/owner/packages", key: "packages",  },
        { label: "Hội viên", to: "/owner/members", key: "members",  },
        { label: "Huấn luyện viên", to: "/owner/bookings", key: "bookings",  },
        { label: "Lịch dạy ", to: "/owner/trainer-bookings", key: "trainer-bookings",  },
        { label: "Chia sẻ huấn luyện viên", to: "/owner/trainers", key: "trainers",  },
        { label: "Đánh giá", to: "/owner/reviews", key: "reviews", },
      ],
    },
    {
      title: "Tài chính",
      items: [
        { label: "Giao dịch", to: "/owner/transactions", key: "transactions", },
        { label: "Doanh thu từ huấn luyện viên", to: "/owner/commissions", key: "commissions",  },
        { label: "Duyệt yêu cầu rút tiền", to: "/owner/withdrawals", key: "withdrawals",  },
      ],
    },
    {
      title: "Kho & Thiết bị",
      items: [
        { label: "Thiết bị", to: "/owner/equipment", key: "equipment",  },
        { label: "Tồn kho", to: "/owner/inventory", key: "inventory",  },
        { label: "Bảo trì", to: "/owner/maintenance", key: "maintenance",  },
      ],
    },
    {
      title: "Mua hàng",
      items: [
        { label: "Yêu cầu mua combo", to: "/owner/purchase-requests", key: "purchase-requests",  },
        { label: "Đơn mua", to: "/owner/purchase-orders", key: "po", },
        { label: "Nhận hàng", to: "/owner/receipts", key: "receipts", },
        { label: "Thanh toán thiết bị", to: "/owner/procurement-payments", key: "procurement-payments",  },
      ],
    },
    {
      title: "Hệ thống",
      items: [
        { label: "Yêu cầu nhượng quyền", to: "/owner/franchise-requests", key: "franchise",  },
      ],
    },
  ]), []);

  return (
    <>
    <Header />
    <div className="od2-layout owner-app">
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
                (() => {
                  const fallbackGlyph = String(item.label || "").trim().charAt(0).toUpperCase();
                  const navIcon = item.icon || (collapsed ? fallbackGlyph : null);
                  return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  className={({ isActive }) => `od2-item ${isActive ? "is-active" : ""}`}
                >
                  {navIcon ? <span className="od2-ico" aria-hidden>{navIcon}</span> : null}
                  {!collapsed && <span className="od2-label">{item.label}</span>}
                  {!collapsed && <span className="od2-pillDot" />}
                </NavLink>
                  );
                })()
              ))}
            </div>
          ))}
        </nav>

        <div className="od2-footer">
          <button className="od2-ghostBtn" onClick={handleLogout}>
            {!collapsed ? "Đăng xuất" : "⎋"}
          </button>
          
        </div>
      </aside>

      <main className="od2-main">
        <div className="od2-content">
          {suspendedGym ? (
            <div className="od2-suspendedBanner" role="alert">
              Chi nhánh <strong>{suspendedGym.name || `#${suspendedGym.id}`}</strong> đang bị admin tạm ngưng.
              Các nghiệp vụ vận hành của owner được khóa tạm thời cho tới khi gym được khôi phục.
            </div>
          ) : null}
          <div className="od2-branchBanner">
            <span className="od2-branchBanner__label">Chi nhánh đang quản lý</span>
            <strong>{selectedGymName || "Tất cả chi nhánh"}</strong>
          </div>
          {suspendedGym && location.pathname !== "/owner/gyms" ? (
            <div className="od2-suspendedPanel">
              <h3>Gym đang tạm ngưng</h3>
              <p>Admin đã tạm ngưng chi nhánh này nên các thao tác vận hành được khóa để tránh phát sinh nghiệp vụ sai trạng thái.</p>
              <button className="od2-ghostBtn" onClick={() => navigate("/owner/gyms", { replace: true })}>Mở trang phòng tập</button>
            </div>
          ) : null}
          <Suspense fallback={<div className="od2-suspenseFallback">Đang tải…</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/owner/overview" replace />} />
              <Route path="/overview" element={<OwnerOverviewPage />} />

              {/* Business */}
              <Route path="/gyms" element={<OwnerGymsPage />} />
              <Route path="/packages" element={<OwnerPackagesPage />} />
              <Route path="/members" element={<OwnerMembersPage />} />
              <Route path="/bookings" element={<OwnerBookingsPage />} />
              <Route path="/trainer-bookings" element={<OwnerTrainerSharePage pageMode="bookings" />} />
              <Route path="/trainers" element={<OwnerTrainerSharePage pageMode="shares" />} />
              <Route path="/reviews" element={<OwnerReviewsPage />} />

              {/* Finance */}
              <Route path="/transactions" element={<OwnerTransactionsPage />} />
              <Route path="/commissions" element={<OwnerCommissionsPage />} />
              <Route path="/withdrawals" element={<OwnerWithdrawalsPage />} />

              {/* Inventory & Equipment */}
              <Route path="/equipment" element={<OwnerEquipmentPage />} />
              <Route path="/inventory" element={<OwnerInventoryPage />} />
              <Route path="/transfers" element={<Navigate to="/owner/equipment" replace />} />
              <Route path="/maintenance" element={<OwnerMaintenancePage />} />

              {/* Purchasing */}
              <Route path="/purchase-requests" element={<OwnerPurchaseRequestsPage />} />
              <Route path="/quotations" element={<Navigate to="/owner/purchase-requests" replace />} />
              <Route path="/purchase-orders" element={<OwnerPurchaseOrdersPage />} />
              <Route path="/receipts" element={<OwnerReceiptsPage />} />
              <Route path="/procurement-payments" element={<OwnerProcurementPaymentsPage />} />

              {/* Communication */}
              <Route path="/notifications" element={<OwnerNotificationsPage />} />

              {/* System */}
              <Route path="/franchise-requests" element={<OwnerFranchiseRequestsPage />} />

              <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
    </>
  );
}
