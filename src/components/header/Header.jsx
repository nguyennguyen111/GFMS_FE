import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import Logo from "../../assets/logo.png";
import Bars from "../../assets/bars.png";
import "./Header.css";

import { getSelectedGym, clearSelectedGym } from "../../utils/selectedGym";

const readAuth = () => ({
  token: localStorage.getItem("accessToken"),
  role: localStorage.getItem("role"), // admin | owner | member | trainer
  username: localStorage.getItem("username") || "Tài khoản",
});

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [menuOpened, setMenuOpened] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // ✅ Auth state để Header re-render sau login/logout
  const [auth, setAuth] = useState(() => readAuth());
  const token = auth.token;
  const role = auth.role;
  const username = auth.username;

  // ✅ Selected Gym chip state
  const [selectedGym, setSelectedGymState] = useState(() => getSelectedGym());

  const accountRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setMenuOpened(false);
    setAccountOpen(false);
  }, [location.pathname]);

  // ✅ Lắng nghe authChanged (từ login/logout) + storage (nhiều tab)
  useEffect(() => {
    const syncAuth = () => setAuth(readAuth());
    window.addEventListener("authChanged", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("authChanged", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  // ✅ Lắng nghe selectedGymChanged
  useEffect(() => {
    const syncGym = () => setSelectedGymState(getSelectedGym());
    window.addEventListener("selectedGymChanged", syncGym);
    window.addEventListener("storage", syncGym);
    return () => {
      window.removeEventListener("selectedGymChanged", syncGym);
      window.removeEventListener("storage", syncGym);
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!accountRef.current) return;
      if (!accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const dashboardPath = useMemo(() => {
    if (!token) return "/login";
    if (role === "admin") return "/admin";
    if (role === "owner") return "/owner";
    if (role === "trainer") return "/trainer";
    return "/";
  }, [token, role]);

  const go = (path) => {
    setMenuOpened(false);
    setAccountOpen(false);
    navigate(path);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    window.dispatchEvent(new Event("authChanged"));
    go("/");
  };

  const NavItem = ({ to, label }) => (
    <li className="h-item">
      <NavLink
        to={to}
        className={({ isActive }) => (isActive ? "h-link is-active" : "h-link")}
        onClick={() => setMenuOpened(false)}
      >
        {label}
      </NavLink>
    </li>
  );
  // ✅ Public menu
  const GuestTopMenu = () => (
    <>
      <NavItem to="/" label="Home" />
      <NavItem to="/marketplace/gyms" label="Gyms" />
      <NavItem to="/marketplace/trainers" label="PT / Trainer" />
      <NavItem to="/franchise" label="Nhượng quyền" />
      <NavItem to="/faq" label="FAQ" />
    </>
  );

  // ✅ Member top menu (thêm Gyms/PT)
  const MemberTopMenu = () => (
    <>
      <NavItem to="/" label="Home" />
      <NavItem to="/marketplace/gyms" label="Gyms" />
      <NavItem to="/marketplace/trainers" label="PT / Trainer" />
      <NavItem to="/franchise" label="Nhượng quyền" />
      <NavItem to="/faq" label="FAQ" />
    </>
  );

  // ✅ Trainer top menu
  const TrainerTopMenu = () => (
    <>
      <NavItem to="/trainer" label="Dashboard" />
      <NavItem to="/trainer/schedule" label="Lịch dạy" />
      <NavItem to="/trainer/members" label="Học viên" />
    </>
  );

  // ✅ Owner/Admin
  const StaffTopMenu = () => (
    <>
      <NavItem to={dashboardPath} label="Dashboard" />
      <NavItem to="/marketplace/gyms" label="Public Gyms" />
    </>
  );

  const AccountDropdown = () => (
    <div className="h-account" ref={accountRef}>
      <button
        type="button"
        className="h-accountBtn"
        onClick={() => setAccountOpen((s) => !s)}
        title="Tài khoản"
      >
        <span className="h-avatar">👤</span>
        <span className="h-name">{username}</span>
        <span className="h-caret">▾</span>
      </button>

      {accountOpen && (
        <div className="h-menu">
          <button className="h-menuItem" onClick={() => go(dashboardPath)}>
            Dashboard
          </button>

          {role === "member" && (
            <>
              <div className="h-sep" />
              <div className="h-group">Của tôi</div>
              <button className="h-menuItem" onClick={() => go("/")}>
                🏠 Home
              </button>
              <button className="h-menuItem" onClick={() => go("/member/bookings")}>
                📖 Lịch đã đặt
              </button>
              <button className="h-menuItem" onClick={() => go("/member/my")}>
                🎫 Gói của tôi
              </button>
              <button className="h-menuItem" onClick={() => go("/member/profile")}>
                ⚙️ Hồ sơ
              </button>

              <div className="h-sep" />
              <div className="h-group">Marketplace</div>
              <button className="h-menuItem" onClick={() => go("/marketplace/gyms")}>
                🏟️ Chọn Gym
              </button>
              <button className="h-menuItem" onClick={() => go("/marketplace/trainers")}>
                🏋️ PT Marketplace
              </button>

              <div className="h-sep" />
              <div className="h-group">Tương tác</div>
              <button className="h-menuItem" onClick={() => go("/member/notifications")}>
                🔔 Thông báo
              </button>
              <button className="h-menuItem" onClick={() => go("/member/messages")}>
                💬 Tin nhắn
              </button>
              <button className="h-menuItem" onClick={() => go("/member/progress")}>
                📈 Tiến độ
              </button>
              <button className="h-menuItem" onClick={() => go("/member/reviews")}>
                ⭐ Đánh giá
              </button>
            </>
          )}

          {role === "trainer" && (
            <>
              <div className="h-sep" />
              <button className="h-menuItem" onClick={() => go("/trainer/profile")}>
                ⚙️ Hồ sơ PT
              </button>
              <button className="h-menuItem" onClick={() => go("/trainer/notifications")}>
                🔔 Thông báo
              </button>
            </>
          )}

          {(role === "admin" || role === "owner") && (
            <>
              <div className="h-sep" />
              <button className="h-menuItem" onClick={() => go("/notifications")}>
                🔔 Thông báo
              </button>
              <button className="h-menuItem" onClick={() => go("/messages")}>
                💬 Tin nhắn
              </button>
            </>
          )}

          <div className="h-sep" />
          <button className="h-menuItem danger" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );

  return (
    <header className="h">
      <div className="h-left" onClick={() => go("/")}>
        <img src={Logo} alt="GFMS" className="h-logo" />
        <div className="h-brand">
          <div className="h-title">GFMS</div>
          <div className="h-sub">Gym Franchise Management System</div>
        </div>
      </div>

      {isMobile && !menuOpened ? (
        <button className="h-burger" onClick={() => setMenuOpened(true)} aria-label="Open menu">
          <img src={Bars} alt="Menu" />
        </button>
      ) : (
        <nav className={`h-nav ${isMobile ? "is-mobile" : ""}`}>
          <ul className="h-ul">
            {!token && <GuestTopMenu />}
            {token && role === "member" && <MemberTopMenu />}
            {token && role === "trainer" && <TrainerTopMenu />}
            {token && (role === "owner" || role === "admin") && <StaffTopMenu />}


            <li className="h-actions">
              {!token ? (
                <>
                  <button className="h-btn h-btn--ghost" onClick={() => go("/login")}>
                    Đăng nhập
                  </button>
                  <button className="h-btn h-btn--primary" onClick={() => go("/register")}>
                    Dùng thử
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="h-iconBtn"
                    onClick={() => go(role === "member" ? "/member/notifications" : "/notifications")}
                    title="Thông báo"
                    aria-label="Notifications"
                  >
                    🔔
                  </button>
                  <AccountDropdown />
                </>
              )}
            </li>

            {isMobile && (
              <li className="h-closeRow">
                <button className="h-btn h-btn--ghost" onClick={() => setMenuOpened(false)}>
                  Đóng
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
};

export default Header;
