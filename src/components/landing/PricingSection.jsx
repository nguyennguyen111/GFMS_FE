import React from "react";
import "./PricingSection.css";

const plans = [
  { name: "Starter", price: "0", desc: "Dành cho demo nội bộ / đồ án", features: ["1 chi nhánh", "Quản lý gói", "Quản lý hội viên"] },
  { name: "Franchise", price: "29", desc: "Chuẩn nhượng quyền", features: ["Multi-branch", "Role-based", "Báo cáo doanh thu"] },
  { name: "Enterprise", price: "Liên hệ", desc: "Tuỳ biến quy trình", features: ["Tích hợp cổng thanh toán", "Audit log nâng cao", "Tuỳ biến dashboard"] },
];

const PricingSection = () => {
  return (
    <section className="pricing" id="pricing">
      <div className="section-header">
        <span className="stroke-text">Gói</span>
        <span>tham khảo</span>
      </div>

      <div className="pricing-grid">
        {plans.map((p) => (
          <div className="price-card" key={p.name}>
            <div className="p-name">{p.name}</div>
            <div className="p-price">{p.price === "Liên hệ" ? p.price : `$ ${p.price}`}</div>
            <div className="p-desc">{p.desc}</div>
            <div className="p-features">
              {p.features.map((f) => <div className="p-feature" key={f}>• {f}</div>)}
            </div>
            <button className="btn">Bắt đầu</button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
