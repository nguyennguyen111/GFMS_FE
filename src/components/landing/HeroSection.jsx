// src/components/landing/HeroSection.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./HeroSection.css";

export default function HeroSection() {
  const navigate = useNavigate();
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const onScroll = () => setOffsetY(window.scrollY * 0.18);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="lm-hero2" id="home">
      <div
        className="lm-hero2__bg"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        <video
          className="lm-hero2__video"
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1600&auto=format&fit=crop"
        >
          <source
            src="https://cdn.coverr.co/videos/coverr-man-doing-push-ups-in-a-gym-1560676509277?download=1080p"
            type="video/mp4"
          />
        </video>
        <div className="lm-hero2__overlay" />
        <div className="lm-hero2__glow lm-hero2__glow--a" />
        <div className="lm-hero2__glow lm-hero2__glow--b" />
      </div>

      <div className="lm-hero2__container">
        <div className="lm-hero2__content">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="lm-hero2__badge"
          >
            GFMS • Gym Franchise Management System
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="lm-hero2__title"
          >
            Vận hành chuỗi gym nhượng quyền
            <span> mạnh mẽ – chuẩn hóa – sẵn sàng mở rộng</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.14 }}
            className="lm-hero2__desc"
          >
            Một nền tảng hiện đại giúp quản lý chi nhánh, gói tập, hội viên,
            booking, PT, chỉ số cơ thể, doanh thu và báo cáo vận hành trên cùng
            một hệ thống chuyên nghiệp.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.74, delay: 0.2 }}
            className="lm-hero2__actions"
          >
            <button
              className="lm-btn lm-btn--primary"
              onClick={() => navigate("/login")}
            >
              Đăng nhập
            </button>
            <button
              className="lm-btn lm-btn--secondary"
              onClick={() => navigate("/register")}
            >
              Dùng thử ngay
            </button>
            <button
              className="lm-btn lm-btn--ghost"
              onClick={() =>
                document
                  .getElementById("pricing-modern")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Xem gói giải pháp
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.85, delay: 0.16 }}
          className="lm-hero2__panel"
        >
          <div className="hero-mockup">
            <div className="hero-mockup__top">
              <div className="hero-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="hero-mockup__title">GFMS Dashboard</div>
            </div>

            <div className="hero-mockup__body">
              <div className="hero-side">
                <div className="hero-side__item active">Overview</div>
                <div className="hero-side__item">Branches</div>
                <div className="hero-side__item">Members</div>
                <div className="hero-side__item">Bookings</div>
                <div className="hero-side__item">Revenue</div>
              </div>

              <div className="hero-main">
                <div className="hero-cards">
                  <div className="hero-statCard">
                    <span>Chi nhánh</span>
                    <strong>12</strong>
                  </div>
                  <div className="hero-statCard">
                    <span>Hội viên</span>
                    <strong>2,480</strong>
                  </div>
                  <div className="hero-statCard">
                    <span>Booking hôm nay</span>
                    <strong>186</strong>
                  </div>
                </div>

                <div className="hero-chart">
                  <div className="hero-chart__header">
                    <span>Doanh thu theo tháng</span>
                    <b>+24.8%</b>
                  </div>
                  <div className="hero-bars">
                    <div className="bar h1" />
                    <div className="bar h2" />
                    <div className="bar h3" />
                    <div className="bar h4" />
                    <div className="bar h5" />
                    <div className="bar h6" />
                    <div className="bar h7" />
                  </div>
                </div>

                <div className="hero-bottomCards">
                  <div className="hero-listCard">
                    <div className="hero-listCard__title">Hoạt động gần đây</div>
                    <div className="hero-row">
                      <span>Gym Đà Nẵng Central</span>
                      <b>Active</b>
                    </div>
                    <div className="hero-row">
                      <span>Gói Premium 6 tháng</span>
                      <b>Booked</b>
                    </div>
                    <div className="hero-row">
                      <span>Chỉ số BMI cập nhật</span>
                      <b>New</b>
                    </div>
                  </div>

                  <div className="hero-miniCard">
                    <div className="hero-miniCard__title">Hiệu suất hệ thống</div>
                    <strong>98.2%</strong>
                    <span>Ổn định vận hành</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}