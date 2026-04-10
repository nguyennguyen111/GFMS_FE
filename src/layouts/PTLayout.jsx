
import React from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import { getTrainerId } from "../components/pt-portal/ptStorage";
import "../components/member/member-pages.css";
import "../components/member/pages/MemberHomePage.css";
import "./PTLayout.css";

const PTLayout = () => {
  const trainerId = getTrainerId();
  const params = useParams();
  const location = useLocation();
  const routeId = params?.id ? Number(params.id) : null;
  const effectiveId = routeId || trainerId;

  const scheduleLink = effectiveId ? `/pt/${effectiveId}/schedule` : "/pt/dashboard";
  const profileLink = effectiveId ? `/pt/${effectiveId}/details` : "/pt/profile";
  const isScheduleActive = Boolean(
    effectiveId &&
      (location.pathname === `/pt/${effectiveId}/schedule` ||
        location.pathname === `/pt/${effectiveId}/schedule-update`)
  );

  return (
    <div className="site pt-app">
      <Header />
      <main className="site-main">
        <div className="pt-shell">
          <aside className="pt-shell__sidebar" aria-label="Điều hướng PT">
            <div className="pt-shell__brand">
              <div className="pt-shell__mark">PT</div>
              <div>
                <div className="pt-shell__name">GFMS</div>
                <div className="pt-shell__sub">Khu vực huấn luyện viên</div>
              </div>
            </div>

            <nav className="pt-shell__nav">
              <NavLink
                to="/pt/dashboard"
                className={({ isActive }) =>
                  `pt-shell__link ${isActive ? "is-active" : ""}`
                }
                end
              >
                <span className="pt-shell__dot" />
                Tổng quan
              </NavLink>

              <NavLink
                to="/pt/clients"
                className={({ isActive }) =>
                  `pt-shell__link ${isActive ? "is-active" : ""}`
                }
              >
                <span className="pt-shell__dot" />
                Học viên
              </NavLink>

              <NavLink
                to="/pt/messages"
                className={({ isActive }) =>
                  `pt-shell__link ${isActive ? "is-active" : ""}`
                }
              >
                <span className="pt-shell__dot" />
                Tin nhắn
              </NavLink>

              <NavLink
                to={profileLink}
                className={({ isActive }) =>
                  `pt-shell__link ${isActive ? "is-active" : ""}`
                }
              >
                <span className="pt-shell__dot" />
                Hồ sơ
              </NavLink>

              <NavLink
                to={scheduleLink}
                className={() => `pt-shell__link ${isScheduleActive ? "is-active" : ""}`}
              >
                <span className="pt-shell__dot" />
                Lịch làm việc
              </NavLink>

              <NavLink
                to="/pt/feedback"
                className={({ isActive }) =>
                  `pt-shell__link ${isActive ? "is-active" : ""}`
                }
              >
                <span className="pt-shell__dot" />
                Đánh giá
              </NavLink>

              <NavLink
                to="/pt/demo-videos"
                className={({ isActive }) =>
                  `pt-shell__link ${isActive ? "is-active" : ""}`
                }
              >
                <span className="pt-shell__dot" />
                Kế hoạch tập luyện
              </NavLink>

              <NavLink
                to="/pt/finance"
                className={({ isActive }) =>
                  `pt-shell__link ${isActive ? "is-active" : ""}`
                }
              >
                <span className="pt-shell__dot" />
                Tài chính
              </NavLink>

              <NavLink
                to="/pt/requests"
                className={({ isActive }) =>
                  `pt-shell__link ${isActive ? "is-active" : ""}`
                }
              >
                <span className="pt-shell__dot" />
                Gửi yêu cầu
              </NavLink>

              <NavLink
                to="/pt/reschedule-requests"
                className={({ isActive }) =>
                  `pt-shell__link ${isActive ? "is-active" : ""}`
                }
              >
                <span className="pt-shell__dot" />
                Yêu cầu đổi lịch
              </NavLink>
            </nav>
          </aside>

          <div className="pt-shell__content">
            <div className="pt-shell__contentInner mh">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PTLayout;
