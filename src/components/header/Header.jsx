import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CalendarDays,
  Package,
  Bell,
  MessageCircle,
  Activity,
  Star,
  LayoutDashboard,
  Building2,
  Check,
} from "lucide-react";
import "./Header.css";
import logo from "../../assets/logo.jpg";
import logoWordmark from "../../assets/logo-wordmark.png";
import useRealtimeNotifications from "../../hooks/useRealtimeNotifications";
import useSelectedGym from "../../hooks/useSelectedGym";
import { getCurrentUser } from "../../utils/auth";
import { ownerGetMyGyms } from "../../services/ownerGymService";
import OwnerHeaderNotifications from "./OwnerHeaderNotifications";

const readAuth = () => {
  const token = localStorage.getItem("accessToken");
  const user = getCurrentUser();
  const groupId = Number(user?.groupId ?? user?.group_id ?? 0);
  const username = user?.username || user?.email || "Tài khoản";
  const avatar = user?.avatar || user?.avatarUrl || "";
  const portalPath =
    groupId === 1
      ? "/admin"
      : groupId === 2
      ? "/owner"
      : groupId === 3
      ? "/pt/dashboard"
      : null;
  const isMember = Boolean(token && user && groupId === 4);
  const isLoggedInNonMember = Boolean(token && user && !isMember);

  return {
    token: Boolean(token && user),
    username,
    avatar,
    isMember,
    isLoggedInNonMember,
    portalPath,
    groupId,
  };
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const headerRef = useRef(null);
  const accountRef = useRef(null);
  const staffAccountRef = useRef(null);

  const [menuOpened, setMenuOpened] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [staffAccountOpen, setStaffAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authTick, setAuthTick] = useState(0);
  const [ownerGyms, setOwnerGyms] = useState([]);

  void authTick;
  const { token, username, avatar, isMember, isLoggedInNonMember, portalPath, groupId } =
    readAuth();
  const isOwner = groupId === 2;
  const notificationPath = isMember ? "/member/notifications" : isOwner ? "/owner/notifications" : null;
  const { selectedGymId, selectedGymName, setSelectedGym, clearSelectedGym } = useSelectedGym();

  const notifications = useRealtimeNotifications({ enabled: isMember });

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
    setStaffAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const bump = () => setAuthTick((n) => n + 1);
    window.addEventListener("authChanged", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("authChanged", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
      if (
        staffAccountRef.current &&
        !staffAccountRef.current.contains(e.target)
      ) {
        setStaffAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!isOwner || !token) {
      setOwnerGyms([]);
      return;
    }

    let alive = true;

    const loadOwnerGyms = async () => {
      try {
        const res = await ownerGetMyGyms();
        const gyms = Array.isArray(res?.data?.data) ? res.data.data : [];
        if (!alive) return;
        setOwnerGyms(gyms);
        if (!selectedGymId && gyms.length === 1) {
          setSelectedGym(gyms[0]);
        }
      } catch {
        if (alive) setOwnerGyms([]);
      }
    };

    loadOwnerGyms();

    return () => {
      alive = false;
    };
  }, [isOwner, selectedGymId, setSelectedGym, token]);

  useEffect(() => {
    document.body.style.overflow = menuOpened ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpened]);

  const go = (path) => {
    setMenuOpened(false);
    setAccountOpen(false);
    setStaffAccountOpen(false);
    navigate(path);
  };

  const logout = () => {
    localStorage.clear();
    window.dispatchEvent(new Event("authChanged"));
    go("/");
  };

  const handleSelectOwnerGym = (gym) => {
    if (gym) {
      setSelectedGym(gym);
    } else {
      clearSelectedGym();
    }
    go("/owner/overview");
  };

  const initials = useMemo(() => {
    const parts = String(username || "T")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return String(username || "T")
      .slice(0, 1)
      .toUpperCase();
  }, [username]);

  const NavItem = ({ to, label }) => (
    <NavLink
      to={to}
      onClick={() => setMenuOpened(false)}
      className={({ isActive }) =>
        isActive
          ? "nav-link modern-nav-link active"
          : "nav-link modern-nav-link"
      }
    >
      {label}
    </NavLink>
  );

  const SimpleNotificationButton = () => (
    <button
      type="button"
      className="header-icon-btn"
      aria-label="Thông báo"
      onClick={() => {
        if (notificationPath) go(notificationPath);
      }}
    >
      <Bell size={18} />
      {notifications.unreadCount > 0 ? (
        <span className="header-noti-dot" />
      ) : null}
    </button>
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
        {avatar ? (
          <img src={avatar} alt={username} className="header-user-avatar" />
        ) : (
          <span className="header-user-fallback">{initials}</span>
        )}
        <span>{username}</span>
        <ChevronDown size={16} className="profile-caret" />
      </button>

      {accountOpen && (
        <div className="profile-dropdown-menu" role="menu">
          <button onClick={() => go("/member/bookings")} type="button">
            <CalendarDays size={16} />
            <span>Lịch đã đặt</span>
          </button>
          <button onClick={() => go("/member/my-packages")} type="button">
            <Package size={16} />
            <span>Gói của tôi</span>
          </button>
          <button onClick={() => go("/member/profile")} type="button">
            <User size={16} />
            <span>Hồ sơ</span>
          </button>
          <button onClick={() => go("/member/messages")} type="button">
            <MessageCircle size={16} />
            <span>Tin nhắn</span>
          </button>
          <button onClick={() => go("/member/progress")} type="button">
            <Activity size={16} />
            <span>Tiến độ</span>
          </button>
          <button onClick={() => go("/member/reviews")} type="button">
            <Star size={16} />
            <span>Đánh giá</span>
          </button>
          <div className="dropdown-divider" />
          <button className="logout-btn" onClick={logout} type="button">
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );

  const StaffAccountDropdown = () => (
    <div className="profile-dropdown-wrap" ref={staffAccountRef}>
      <button
        className={`profile-btn ${staffAccountOpen ? "open" : ""}`}
        onClick={() => setStaffAccountOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={staffAccountOpen}
        type="button"
      >
        <User size={16} />
        <span className="profile-btn__stack">
          <span>{username}</span>
          {isOwner ? (
            <span className="profile-btn__sub">{selectedGymName || "Tất cả chi nhánh"}</span>
          ) : null}
        </span>
        <ChevronDown size={16} className="profile-caret" />
      </button>

      {staffAccountOpen && (
        <div className="profile-dropdown-menu" role="menu">
          {portalPath ? (
            <button onClick={() => go(portalPath)} type="button">
              <LayoutDashboard size={16} />
              <span>Bảng điều khiển</span>
            </button>
          ) : null}

          {isOwner ? (
            <>
              {portalPath ? <div className="dropdown-divider" /> : null}
              <div className="profile-dropdown-sectionTitle">Quản lý chi nhánh</div>
              <button
                onClick={() => handleSelectOwnerGym(null)}
                type="button"
                className={`profile-dropdown-branch ${!selectedGymId ? "is-active" : ""}`}
              >
                <span className="profile-dropdown-branch__label">
                  <Building2 size={16} />
                  <span>Tất cả chi nhánh</span>
                </span>
                {!selectedGymId ? <Check size={15} /> : null}
              </button>
              {ownerGyms.map((gym) => (
                <button
                  key={gym.id}
                  onClick={() => handleSelectOwnerGym(gym)}
                  type="button"
                  className={`profile-dropdown-branch ${Number(selectedGymId) === Number(gym.id) ? "is-active" : ""}`}
                >
                  <span className="profile-dropdown-branch__label">
                    <Building2 size={16} />
                    <span>{gym.name}</span>
                  </span>
                  {Number(selectedGymId) === Number(gym.id) ? <Check size={15} /> : null}
                </button>
              ))}
            </>
          ) : null}

          {portalPath || isOwner ? <div className="dropdown-divider" /> : null}

          <button className="logout-btn" onClick={logout} type="button">
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );

  const MobileDrawer = () => (
    <div className="mobile-menu-wrap" aria-hidden={!menuOpened}>
      <div
        className="mobile-menu-backdrop"
        onClick={() => setMenuOpened(false)}
      />
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
            <button
              className="profile-btn full-width-btn"
              onClick={() => go("/login")}
              type="button"
            >
              <User size={16} />
              Đăng nhập
            </button>
          ) : isMember ? (
            <>
              <button
                className="profile-btn full-width-btn"
                onClick={() => go("/member/profile")}
                type="button"
              >
                <User size={16} />
                Hồ sơ
              </button>
              <button
                className="logout-btn full-width-btn"
                onClick={logout}
                type="button"
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              {portalPath ? (
                <button
                  className="profile-btn full-width-btn"
                  onClick={() => go(portalPath)}
                  type="button"
                >
                  <LayoutDashboard size={16} />
                  Bảng điều khiển
                </button>
              ) : null}
              <button
                className="logout-btn full-width-btn"
                onClick={logout}
                type="button"
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </>
          )}
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
          <button
            className="logo-wrap"
            onClick={() => go("/")}
            aria-label="Go home"
            type="button"
          >
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
              <button
                className="profile-btn"
                onClick={() => go("/login")}
                type="button"
              >
                <User size={16} />
                Đăng nhập
              </button>
            )}

            {isOwner && notificationPath ? <OwnerHeaderNotifications onNavigate={go} /> : null}
            {!isOwner && isMember && notificationPath ? <SimpleNotificationButton /> : null}
            {isMember && <MemberDropdown />}
            {isLoggedInNonMember && <StaffAccountDropdown />}

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