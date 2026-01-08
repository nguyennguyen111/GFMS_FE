import React from "react";
import { useNavigate } from "react-router-dom";

export default function MemberHomePage() {
  const navigate = useNavigate();

  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">🏠 Member Home</h2>
          <div className="op-sub">
            Chào mừng bạn đến GFMS. Mua gói • Đặt lịch PT • Xem lịch • Check-in.
          </div>
        </div>
      </div>

      <div className="op-card padded">
        <div className="op-actions">
          <button className="op-btn op-btn--primary" onClick={() => navigate("/member/packages")}>
            📦 Mua gói tập
          </button>
          <button className="op-btn op-btn--ok" onClick={() => navigate("/member/bookings/new")}>
            📅 Đặt lịch PT
          </button>
          <button className="op-btn" onClick={() => navigate("/member/bookings")}>
            📖 Lịch đã đặt
          </button>
          <button className="op-btn" onClick={() => navigate("/member/my")}>
            🎫 Gói của tôi
          </button>
          <button className="op-btn" onClick={() => navigate("/member/profile")}>
            ⚙️ Hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}
