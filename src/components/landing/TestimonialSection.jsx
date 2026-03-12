// src/components/landing/TestimonialSection.jsx
import React from "react";
import "./TestimonialSection.css";

const testimonials = [
  {
    name: "Nguyễn Minh Anh",
    role: "Owner • GFMS Fitness Đà Nẵng",
    quote:
      "GFMS giúp chúng tôi chuẩn hóa vận hành chi nhánh rõ ràng hơn, đặc biệt là quản lý hội viên và booking.",
  },
  {
    name: "Trần Quốc Bảo",
    role: "Admin • Chuỗi nhượng quyền Gym",
    quote:
      "Từ dữ liệu doanh thu đến tình hình từng gym đều tập trung một nơi, rất tiện để ra quyết định nhanh.",
  },
  {
    name: "Lê Khánh Vy",
    role: "Member • Premium User",
    quote:
      "Mình thích nhất là theo dõi BMI, lịch tập và gói đang dùng rất trực quan, hiện đại và dễ hiểu.",
  },
];

export default function TestimonialSection() {
  return (
    <section className="testimonial-modern">
      <div className="lm-sectionHead center">
        <span className="lm-kicker">Phản hồi thực tế</span>
        <h2>Những người đang dùng hệ thống nói gì</h2>
      </div>

      <div className="testimonial-modern__grid">
        {testimonials.map((item) => (
          <div className="testimonial-card" key={item.name}>
            <div className="testimonial-card__quote">“{item.quote}”</div>
            <div className="testimonial-card__author">
              <strong>{item.name}</strong>
              <span>{item.role}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}