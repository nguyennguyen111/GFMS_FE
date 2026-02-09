import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./GFMSHero.css";

const GFMSHero = () => {
  const navigate = useNavigate();
  const transition = { type: "spring", duration: 1.2 };

  return (
    <section className="gfms-hero" id="home">
      <div className="gfms-hero__bg" />

      <div className="gfms-hero__content">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={transition}
          className="gfms-hero__badge"
        >
          GFMS • Gym Franchise Management System
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ ...transition, delay: 0.05 }}
          className="gfms-hero__title"
        >
          Quản lý chuỗi gym nhượng quyền <span className="stroke-text">chuẩn nghiệp vụ</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ ...transition, delay: 0.1 }}
          className="gfms-hero__desc"
        >
          Một nền tảng giúp Admin, Owner và Member vận hành hệ thống gym thống nhất:
          gói tập – hội viên – lịch/slot – doanh thu – phân quyền – báo cáo theo chi nhánh.
        </motion.p>

        <div className="gfms-hero__stats">
          <div className="stat">
            <span className="stat__value">Multi-branch</span>
            <span className="stat__label">Hỗ trợ nhiều chi nhánh</span>
          </div>
          <div className="stat">
            <span className="stat__value">Role-based</span>
            <span className="stat__label">Phân quyền theo vai trò</span>
          </div>
          <div className="stat">
            <span className="stat__value">Reports</span>
            <span className="stat__label">Báo cáo doanh thu & vận hành</span>
          </div>
        </div>

        <div className="gfms-hero__actions">
          <button className="btn" onClick={() => navigate("/login")}>Đăng nhập</button>
          <button className="btn btn-outline" onClick={() => navigate("/register")}>Dùng thử / Tạo tài khoản</button>
          <button className="btn btn-ghost" onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}>
            Xem demo nghiệp vụ
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={transition}
        className="gfms-hero__panel"
      >
      </motion.div>
    </section>
  );
};

export default GFMSHero;
