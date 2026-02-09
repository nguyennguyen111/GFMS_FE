import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./MemberHomePage.css";

export default function MemberHomePage() {
  const navigate = useNavigate();

  const username = useMemo(() => localStorage.getItem("username") || "Member", []);

  return (
    <div className="mh">
      <section className="mh-hero">
        <div className="mh-hero__content">
          <div className="mh-badge">GFMS • Member</div>
          <h1 className="mh-title">
            Xin chào, <span className="mh-accent">{username}</span>
          </h1>
          <p className="mh-sub">
            Quản lý gói tập, đặt lịch PT, theo dõi tiến độ và check-in — trong một hệ thống hiện đại, rõ ràng.
          </p>

          <div className="mh-cta">
            <button className="mh-btn mh-btn--primary" onClick={() => navigate("/member/bookings/new")}>
              📅 Đặt lịch PT
            </button>
            <button className="mh-btn mh-btn--ghost" onClick={() => navigate("/member/packages")}>
              📦 Mua gói tập
            </button>
          </div>
        </div>

        <div className="mh-hero__glass">
          <div className="mh-stat">
            <div className="mh-stat__k">Gói active</div>
            <div className="mh-stat__v">—</div>
            <div className="mh-stat__s">Tự nối API sau</div>
          </div>
          <div className="mh-stat">
            <div className="mh-stat__k">Buổi PT còn</div>
            <div className="mh-stat__v">—</div>
            <div className="mh-stat__s">Theo gói đang dùng</div>
          </div>
          <div className="mh-stat">
            <div className="mh-stat__k">Lịch tuần</div>
            <div className="mh-stat__v">—</div>
            <div className="mh-stat__s">Bookings upcoming</div>
          </div>
        </div>
      </section>

      <section className="mh-grid">
        <div className="mh-card mh-card--wide">
          <div className="mh-card__head">
            <div>
              <div className="mh-card__title">Quick Actions</div>
              <div className="mh-card__desc">Những tác vụ bạn dùng thường xuyên</div>
            </div>
          </div>

          <div className="mh-actions">
            <button className="mh-action" onClick={() => navigate("/member/packages")}>
              <div className="mh-action__icon">📦</div>
              <div className="mh-action__text">
                <div className="mh-action__label">Mua gói tập</div>
                <div className="mh-action__sub">Chọn gói phù hợp mục tiêu</div>
              </div>
            </button>

            <button className="mh-action" onClick={() => navigate("/member/bookings/new")}>
              <div className="mh-action__icon">🗓️</div>
              <div className="mh-action__text">
                <div className="mh-action__label">Đặt lịch PT</div>
                <div className="mh-action__sub">Chọn PT & khung giờ</div>
              </div>
            </button>

            <button className="mh-action" onClick={() => navigate("/member/bookings")}>
              <div className="mh-action__icon">📖</div>
              <div className="mh-action__text">
                <div className="mh-action__label">Lịch đã đặt</div>
                <div className="mh-action__sub">Xem / đổi lịch nhanh</div>
              </div>
            </button>

            <button className="mh-action" onClick={() => navigate("/member/my")}>
              <div className="mh-action__icon">🎫</div>
              <div className="mh-action__text">
                <div className="mh-action__label">Gói của tôi</div>
                <div className="mh-action__sub">Theo dõi buổi còn & giao dịch</div>
              </div>
            </button>

            <button className="mh-action" onClick={() => navigate("/member/profile")}>
              <div className="mh-action__icon">⚙️</div>
              <div className="mh-action__text">
                <div className="mh-action__label">Hồ sơ</div>
                <div className="mh-action__sub">Thông tin tài khoản</div>
              </div>
            </button>

            <button className="mh-action" onClick={() => navigate("/member/progress")}>
              <div className="mh-action__icon">📈</div>
              <div className="mh-action__text">
                <div className="mh-action__label">Tiến độ</div>
                <div className="mh-action__sub">Theo dõi kết quả luyện tập</div>
              </div>
            </button>
          </div>
        </div>

        <div className="mh-card">
          <div className="mh-card__title">Lịch sắp tới</div>
          <div className="mh-list">
            <div className="mh-item">
              <div className="mh-item__left">
                <div className="mh-item__name">PT Session • Upper Body</div>
                <div className="mh-item__meta">Thứ 4, 19:00 • PT: An</div>
              </div>
              <button className="mh-mini" onClick={() => navigate("/member/bookings")}>
                Xem
              </button>
            </div>

            <div className="mh-item">
              <div className="mh-item__left">
                <div className="mh-item__name">Gym Class • HIIT</div>
                <div className="mh-item__meta">Thứ 6, 18:30 • Studio A</div>
              </div>
              <button className="mh-mini" onClick={() => navigate("/member/bookings")}>
                Xem
              </button>
            </div>

            <div className="mh-empty">
              *Khi nối API booking thật, bạn chỉ cần map list booking vào đây.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
