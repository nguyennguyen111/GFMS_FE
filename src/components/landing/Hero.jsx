import React from "react";
import "./Hero.css";
import { motion } from "motion/react";

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hero-label"
        >
          Elite Franchise Gym Standard
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="hero-title"
        >
          ĐẲNG CẤP <br />
          FRANCHISE GYM <br />
          <span className="hero-title-accent">TỪ GFMS</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hero-description"
        >
          Trải nghiệm hệ sinh thái nhượng quyền phòng tập chuyên nghiệp. Công nghệ dẫn đầu, huấn luyện viên tinh anh, và không gian bứt phá giới hạn.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="hero-actions"
        >
          <button className="hero-btn-primary">
            Tham gia ngay
          </button>
          <button className="hero-btn-secondary">
            Khám phá cơ sở
          </button>
        </motion.div>
      </div>

      <div className="hero-floating-text">
        <div className="floating-title">Kinetic Monolith</div>
        <div className="floating-subtitle">Evolution of Strength</div>
      </div>
    </section>
  );
};

export default Hero;