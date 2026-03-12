// src/components/landing/PricingSectionModern.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./PricingSectionModern.css";

const plans = [
  {
    name: "Starter",
    price: "0đ",
    desc: "Cho demo nội bộ hoặc trải nghiệm cơ bản",
    features: ["1 chi nhánh", "Gói tập cơ bản", "Hội viên cơ bản"],
  },
  {
    name: "Franchise",
    price: "Liên hệ",
    desc: "Dành cho mô hình nhượng quyền và chuỗi gym đang phát triển",
    popular: true,
    features: ["Multi-branch", "Booking / Slot", "Doanh thu", "PT / BMI / Dashboard"],
  },
  {
    name: "Enterprise",
    price: "Tùy chỉnh",
    desc: "Giải pháp mở rộng theo quy trình riêng",
    features: ["Tích hợp thanh toán", "Dashboard riêng", "Mở rộng phân hệ"],
  },
];

export default function PricingSectionModern() {
  const navigate = useNavigate();

  return (
    <section className="pricing-modern" id="pricing-modern">
      <div className="lm-sectionHead center">
        <span className="lm-kicker">Giải pháp & ưu đãi</span>
        <h2>Lựa chọn hấp dẫn cho đối tác và người dùng</h2>
      </div>

      <div className="pricing-modern__grid">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`price-modern-card ${plan.popular ? "is-popular" : ""}`}
          >
            {plan.popular && <div className="price-ribbon">Popular</div>}

            <div className="price-modern-card__name">{plan.name}</div>
            <div className="price-modern-card__price">{plan.price}</div>
            <div className="price-modern-card__desc">{plan.desc}</div>

            <div className="price-modern-card__features">
              {plan.features.map((f) => (
                <div key={f} className="price-modern-card__feature">
                  <span>•</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <button
              className={`lm-btn ${plan.popular ? "lm-btn--primary" : "lm-btn--secondary"}`}
              onClick={() => navigate("/register")}
            >
              Bắt đầu ngay
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}