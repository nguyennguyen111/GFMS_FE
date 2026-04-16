import React from "react";
import "./Hero.css";

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-overlay" />
        <img
          src="https://i.pinimg.com/1200x/92/0f/b5/920fb57bdf4734e9673b4e5c64194fa9.jpg"
          alt="Elite Gym Training"
          className="hero-img"
        />
      </div>

      <div className="hero-content">
        <div className="hero-label">
          GFMS Franchise Management System
        </div>

        <h1 className="hero-title">
          ĐẲNG CẤP <br />
          FRANCHISE GYM <br />
        </h1>

        <p className="hero-description">
          Trải nghiệm hệ sinh thái nhượng quyền phòng tập chuyên nghiệp. Công nghệ dẫn đầu, huấn luyện viên tinh anh, và không gian bứt phá giới hạn.
        </p>
      </div>

      <div className="hero-floating-text">
        <div className="floating-title">GFMS</div>
        <div className="floating-subtitle">Franchise Gym</div>
      </div>
    </section>
  );
};

export default Hero;