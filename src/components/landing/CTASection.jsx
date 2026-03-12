// src/components/landing/CTASection.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./CTASection.css";

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="cta-modern">
      <div className="cta-modern__glow cta-modern__glow--a" />
      <div className="cta-modern__glow cta-modern__glow--b" />

      <div className="cta-modern__card">
        <div className="cta-modern__content">
          <span className="lm-kicker">Sẵn sàng trải nghiệm?</span>
          <h2>Đưa hệ thống gym của bạn lên một chuẩn vận hành mới</h2>
          <p>
            Bắt đầu với giao diện hiện đại, quy trình rõ ràng và trải nghiệm tốt
            hơn cho cả đối tác lẫn hội viên.
          </p>
        </div>

        <div className="cta-modern__actions">
          <button className="lm-btn lm-btn--primary" onClick={() => navigate("/login")}>
            Đăng nhập
          </button>
          <button className="lm-btn lm-btn--secondary" onClick={() => navigate("/register")}>
            Tạo tài khoản
          </button>
        </div>
      </div>
    </section>
  );
}