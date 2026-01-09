import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import Logo from "../../assets/logo.png";
import Bars from "../../assets/bars.png";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const mobile = window.innerWidth <= 768;
  const [menuOpened, setMenuOpened] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // ✅ ĐỌC ĐÚNG key đã lưu ở LoginPage
  const token = localStorage.getItem("accessToken");
  const role = localStorage.getItem("role"); // admin | owner | member | trainer
  const username = localStorage.getItem("username") || "Tài khoản";

  const accountRef = useRef(null);

  useEffect(() => {
    setMenuOpened(false);
    setAccountOpen(false);
  }, [location.pathname]);

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
    return "/member/home";
  }, [token, role]);

  const go = (path) => {
    setMenuOpened(false);
    setAccountOpen(false);
    navigate(path);
  };

  const logout = () => {
    // ✅ XÓA ĐÚNG KEY
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    go("/login");
  };

  const NavItem = ({ to, label }) => (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) => (isActive ? "nav active" : "nav")}
        onClick={() => setMenuOpened(false)}
      >
        {label}
      </NavLink>
    </li>
  );

  // ✅ Public menu
  const GuestTopMenu = () => (
    <>
      <NavItem to="/" label="Giới thiệu" />
      <NavItem to="/gyms" label="Gyms" />
      <NavItem to="/trainers" label="PT / Trainer" />
      <NavItem to="/packages" label="Gói tập" />
      <NavItem to="/franchise" label="Nhượng quyền" />
      <NavItem to="/faq" label="FAQ" />
    </>
  );

  // ✅ Member top menu (gọn)
  const MemberTopMenu = () => (
    <>
      <NavItem to="/member/home" label="Home" />
      <NavItem to="/member/packages" label="Gói tập" />
      <NavItem to="/member/bookings/new" label="Đặt lịch" />
      <NavItem to="/member/bookings" label="Lịch đã đặt" />
    </>
  );

  // ✅ Trainer top menu (gọn) - route /trainer
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
      <li className="linklike" onClick={() => go(dashboardPath)}>Dashboard</li>
      <NavItem to="/gyms" label="Public Gyms" />
    </>
  );

  const AccountDropdown = () => (
    <div className="account" ref={accountRef}>
      <button
        type="button"
        className="account-btn"
        onClick={() => setAccountOpen((s) => !s)}
        title="Tài khoản"
      >
        <span className="account-avatar">👤</span>
        <span className="account-name">{username}</span>
        <span className="account-caret">▾</span>
      </button>

      {accountOpen && (
        <div className="account-menu">
          <button className="account-item" onClick={() => go(dashboardPath)}>
            Dashboard
          </button>

          {role === "member" && (
            <>
              <div className="account-sep" />
              <div className="account-group">Của tôi</div>
              <button className="account-item" onClick={() => go("/member/home")}>🏠 Home</button>
              <button className="account-item" onClick={() => go("/member/bookings")}>📖 Lịch đã đặt</button>
              <button className="account-item" onClick={() => go("/member/packages")}>📦 Gói tập</button>
              <button className="account-item" onClick={() => go("/member/my")}>🎫 Gói của tôi</button>
              <button className="account-item" onClick={() => go("/member/profile")}>⚙️ Hồ sơ</button>

              <div className="account-sep" />
              <div className="account-group">Tương tác</div>
              <button className="account-item" onClick={() => go("/member/notifications")}>🔔 Thông báo</button>
              <button className="account-item" onClick={() => go("/member/messages")}>💬 Tin nhắn</button>
              <button className="account-item" onClick={() => go("/member/progress")}>📈 Tiến độ</button>
              <button className="account-item" onClick={() => go("/member/reviews")}>⭐ Đánh giá</button>

              <div className="account-sep" />
              <div className="account-group">Trở thành</div>
              <button className="account-item" onClick={() => go("/apply/trainee")}>🎓 Học viên (Trainee)</button>
              <button className="account-item" onClick={() => go("/apply/pt")}>🏋️ PT / Trainer</button>
              <button className="account-item" onClick={() => go("/apply/owner")}>🏢 Owner (Nhượng quyền)</button>
            </>
          )}

          {role === "trainer" && (
            <>
              <div className="account-sep" />
              <button className="account-item" onClick={() => go("/trainer/profile")}>⚙️ Hồ sơ PT</button>
              <button className="account-item" onClick={() => go("/trainer/notifications")}>🔔 Thông báo</button>
            </>
          )}

          {(role === "admin" || role === "owner") && (
            <>
              <div className="account-sep" />
              <button className="account-item" onClick={() => go("/notifications")}>🔔 Thông báo</button>
              <button className="account-item" onClick={() => go("/messages")}>💬 Tin nhắn</button>
            </>
          )}

          <div className="account-sep" />
          <button className="account-item danger" onClick={logout}>Đăng xuất</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="header">
      <div className="header-left" onClick={() => go("/")}>
        <img src={Logo} alt="GFMS" className="logo" />
        <div className="brand">
          <div className="brand-title">GFMS</div>
          <div className="brand-sub">Gym Franchise Management System</div>
        </div>
      </div>

      {mobile && !menuOpened ? (
        <div className="hamburger" onClick={() => setMenuOpened(true)}>
          <img src={Bars} alt="Menu" />
        </div>
      ) : (
        <ul className="header-menu">
          {!token && <GuestTopMenu />}

          {token && role === "member" && <MemberTopMenu />}

          {token && role === "trainer" && <TrainerTopMenu />}

          {token && (role === "owner" || role === "admin") && <StaffTopMenu />}

          <li className="menu-actions">
            {!token ? (
              <>
                <button className="btn btn-outline" onClick={() => go("/login")}>Đăng nhập</button>
                <button className="btn" onClick={() => go("/register")}>Dùng thử</button>
              </>
            ) : (
              <>
                <button
                  className="icon-btn"
                  onClick={() => go(role === "member" ? "/member/notifications" : "/notifications")}
                  title="Thông báo"
                >
                  🔔
                </button>
                <AccountDropdown />
              </>
            )}
          </li>

          {mobile && (
            <li className="close-row">
              <button className="btn btn-ghost" onClick={() => setMenuOpened(false)}>
                Đóng
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default Header;
