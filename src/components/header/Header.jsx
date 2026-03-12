import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./Header.css";
import logo from "../../assets/logo.jpg";

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

  /* ===== set --header-h for whole website (auto offset) ===== */
  useEffect(() => {
    const setVar = () => {
      const h = headerRef.current?.offsetHeight || 72;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    setVar();
    window.addEventListener("resize", setVar);
    return () => window.removeEventListener("resize", setVar);
  }, []);

  /* scroll glass */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* route change */
  useEffect(() => {
    setMenuOpened(false);
    setAccountOpen(false);
  }, [location.pathname]);

  /* outside click (account) */
  useEffect(() => {
    const onClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  /* lock scroll when mobile menu open */
  useEffect(() => {
    document.body.style.overflow = menuOpened ? "hidden" : "";
    return () => (document.body.style.overflow = "");
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
      className={({ isActive }) => (isActive ? "h-link is-active" : "h-link")}
    >
      {label}
    </NavLink>
  );

  const MemberDropdown = () => (
    <div className="h-account" ref={accountRef}>
      <button
        className={`h-accountBtn ${accountOpen ? "open" : ""}`}
        onClick={() => setAccountOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={accountOpen}
      >
        <span className="material-symbols-outlined">account_circle</span>
        <span className="h-name">{username}</span>
        <span className="h-caret">▾</span>
      </button>

      {accountOpen && (
        <div className="h-menu" role="menu">
          <div className="h-group">Của tôi</div>
          <button onClick={() => go("/member/bookings")}>Lịch đã đặt</button>
          <button onClick={() => go("/member/my-packages")}>Gói của tôi</button>
          <button onClick={() => go("/member/profile")}>Hồ sơ</button>

          <div className="h-sep" />
          <div className="h-group">Tương tác</div>
          <button onClick={() => go("/member/notifications")}>Thông báo</button>
          <button onClick={() => go("/member/messages")}>Tin nhắn</button>
          <button onClick={() => go("/member/progress")}>Tiến độ</button>
          <button onClick={() => go("/member/reviews")}>Đánh giá</button>

          <div className="h-sep" />
          <button className="danger" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );

  // ===== Mobile Drawer (chỉ render khi menuOpened) =====
  const MobileDrawer = () => (
    <div className="h-mobile" aria-hidden={!menuOpened}>
      <div className="h-backdrop" onClick={() => setMenuOpened(false)} />
      <aside className="h-drawer" role="dialog" aria-modal="true">
        <div className="h-drawerTop">
          <div className="h-drawerTitle">Menu</div>
          <button className="h-x" onClick={() => setMenuOpened(false)} aria-label="Close menu">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="h-drawerNav" aria-label="Mobile">
          <NavItem to="/" label="Home" />
          <NavItem to="/marketplace/gyms" label="Gyms" />
          <NavItem to="/marketplace/trainers" label="PT / Trainer" />
          <NavItem to="/franchise" label="Nhượng quyền" />
          <NavItem to="/faq" label="FAQ" />
        </nav>

        <div className="h-drawerBottom">
          {!token ? (
            <button className="h-btn primary full" onClick={() => go("/login")}>
              Đăng nhập
            </button>
          ) : isMember ? (
            <div className="h-drawerAccount">
              <div className="h-group">Tài khoản</div>
              <button className="h-drawerItem" onClick={() => go("/member/bookings")}>
                Lịch đã đặt
              </button>
              <button className="h-drawerItem" onClick={() => go("/member/my-packages")}>
                Gói của tôi
              </button>
              <button className="h-drawerItem" onClick={() => go("/member/profile")}>
                Hồ sơ
              </button>
              <div className="h-sep" />
              <button className="h-drawerItem danger" onClick={logout}>
                Đăng xuất
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );

  return (
    <>
      <header ref={headerRef} className={`site-header h ${scrolled ? "is-scrolled" : ""}`}>
        <div className="h-inner">
          <button className="h-left" onClick={() => go("/")} aria-label="Go home">
            <span className="h-logoWrap">
              <span className="h-logoGlow" />
              <img src={logo} alt="Logo" className="h-logo" />
            </span>
          </button>

          <nav className="h-nav" aria-label="Primary">
            <NavItem to="/" label="Home" />
            <NavItem to="/marketplace/gyms" label="Gyms" />
            <NavItem to="/marketplace/trainers" label="PT / Trainer" />
            <NavItem to="/faq" label="FAQ" />
          </nav>

          <div className="h-actions">
            {!token && (
              <button className="h-btn primary" onClick={() => go("/login")}>
                Đăng nhập
              </button>
            )}

            {isMember && <MemberDropdown />}

            {/* Burger: chỉ hiện trên mobile nhờ CSS */}
            <button
              className="h-burger"
              onClick={() => setMenuOpened(true)}
              aria-label="Open menu"
              aria-expanded={menuOpened}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </header>

      {menuOpened && <MobileDrawer />}
    </>
  );
}