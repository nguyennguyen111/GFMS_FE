import React from "react";
import "./Hero.css";

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-overlay" />
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop"
          alt="Elite Gym Training"
          className="hero-img"
        />
      </div>

      <div className="hero-content">
        <div className="hero-label">
          Elite Franchise Gym Standard
        </div>

        <h1 className="hero-title">
          ĐẲNG CẤP <br />
          FRANCHISE GYM <br />
          <span className="hero-title-accent">TỪ GFMS</span>
        </h1>

        <p className="hero-description">
          Trải nghiệm hệ sinh thái nhượng quyền phòng tập chuyên nghiệp. Công nghệ dẫn đầu, huấn luyện viên tinh anh, và không gian bứt phá giới hạn.
        </p>

        <div className="hero-actions">
          <button className="hero-btn-primary">
            Tham gia ngay
          </button>
          <button className="hero-btn-secondary">
            Khám phá cơ sở
          </button>
        </div>
      </div>

      <div className="hero-floating-text">
        <div className="floating-title">Kinetic Monolith</div>
        <div className="floating-subtitle">Evolution of Strength</div>
      </div>
    </section>
  );
};

export default Hero;