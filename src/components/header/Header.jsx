import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { User, LogOut, Menu, X, ChevronDown, CalendarDays, Package, Bell, MessageCircle, Activity, Star } from "lucide-react";
import "./Header.css";
import logo from "../../assets/logo.jpg";
import logoWordmark from "../../assets/logo-wordmark.png";

const readAuth = () => ({
  token: localStorage.getItem("accessToken"),
  role: localStorage.getItem("role"),
  username: localStorage.getItem("username") || "Tài khoản",
});

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const headerRef = useRef(null);
  const accountRef = useRef(null);

  const [menuOpened, setMenuOpened] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { token, role, username } = readAuth();
  const isMember = token && role === "member";

  useEffect(() => {
    const setVar = () => {
      const h = headerRef.current?.offsetHeight || 72;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    setVar();
    window.addEventListener("resize", setVar);
    return () => window.removeEventListener("resize", setVar);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpened(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpened ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpened]);

  const go = (path) => {
    setMenuOpened(false);
    setAccountOpen(false);
    navigate(path);
  };

  const logout = () => {
    localStorage.clear();
    window.dispatchEvent(new Event("authChanged"));
    go("/");
  };

  const NavItem = ({ to, label }) => (
    <NavLink
      to={to}
      onClick={() => setMenuOpened(false)}
      className={({ isActive }) =>
        isActive ? "nav-link modern-nav-link active" : "nav-link modern-nav-link"
      }
    >
      {label}
    </NavLink>
  );

  const MemberDropdown = () => (
    <div className="profile-dropdown-wrap" ref={accountRef}>
      <button
        className={`profile-btn ${accountOpen ? "open" : ""}`}
        onClick={() => setAccountOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={accountOpen}
        type="button"
      >
        <User size={16} />
        <span>{username}</span>
        <ChevronDown size={16} className="profile-caret" />
      </button>

      {accountOpen && (
        <div className="profile-dropdown-menu" role="menu">
          <button onClick={() => go("/member/bookings")}>
            <CalendarDays size={16} />
            <span>Lịch đã đặt</span>
          </button>

          <button onClick={() => go("/member/my-packages")}>
            <Package size={16} />
            <span>Gói của tôi</span>
          </button>

          <button onClick={() => go("/member/profile")}>
            <User size={16} />
            <span>Hồ sơ</span>
          </button>

          <button onClick={() => go("/member/notifications")}>
            <Bell size={16} />
            <span>Thông báo</span>
          </button>

          <button onClick={() => go("/member/messages")}>
            <MessageCircle size={16} />
            <span>Tin nhắn</span>
          </button>

          <button onClick={() => go("/member/progress")}>
            <Activity size={16} />
            <span>Tiến độ</span>
          </button>

          <button onClick={() => go("/member/reviews")}>
            <Star size={16} />
            <span>Đánh giá</span>
          </button>

          <div className="dropdown-divider" />

          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );

  const MobileDrawer = () => (
    <div className="mobile-menu-wrap" aria-hidden={!menuOpened}>
      <div className="mobile-menu-backdrop" onClick={() => setMenuOpened(false)} />
      <aside className="mobile-menu-panel" role="dialog" aria-modal="true">
        <div className="mobile-menu-header">
          <div className="mobile-menu-brand">GFMS</div>
          <button
            className="mobile-menu-close"
            onClick={() => setMenuOpened(false)}
            aria-label="Đóng menu"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mobile-nav-links" aria-label="Mobile">
          <NavItem to="/marketplace/gyms" label="Gym" />
          <NavItem to="/marketplace/trainers" label="PT" />
          <NavItem to="/support" label="Hỗ trợ" />
          <NavItem to="/faq" label="FAQ" />
          
        </nav>

        <div className="mobile-auth-actions">
          {!token ? (
            <button className="profile-btn full-width-btn" onClick={() => go("/login")} type="button">
              <User size={16} />
              Đăng nhập
            </button>
          ) : isMember ? (
            <>
              <button className="profile-btn full-width-btn" onClick={() => go("/member/profile")} type="button">
                <User size={16} />
                Hồ sơ
              </button>
              <button className="logout-btn full-width-btn" onClick={logout} type="button">
                <LogOut size={16} />
                Đăng xuất
              </button>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );

  return (
    <>
      <header
        ref={headerRef}
        className={`header modern-header ${scrolled ? "scrolled" : ""}`}
      >
        <div className="header-container">
          <button className="logo-wrap" onClick={() => go("/")} aria-label="Go home" type="button">
            <img src={logo} alt="GFMS Logo" className="header-logo-img" />
            <img src={logoWordmark} alt="GFMS" className="logo-wordmark" />
          </button>

          <div className="nav-links desktop-nav">
            <NavItem to="/marketplace/gyms" label="Gym" />
            <NavItem to="/marketplace/trainers" label="PT" />
            <NavItem to="/support" label="Hỗ trợ" />
            <NavItem to="/faq" label="FAQ" />
          </div>

          <div className="auth-actions">
            {!token && (
              <button className="profile-btn" onClick={() => go("/login")} type="button">
                <User size={16} />
                Đăng nhập
              </button>
            )}

            {isMember && <MemberDropdown />}

            <button
              className="mobile-menu-btn"
              onClick={() => setMenuOpened(true)}
              aria-label="Open menu"
              aria-expanded={menuOpened}
              type="button"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {menuOpened && <MobileDrawer />}
    </>
  );
}