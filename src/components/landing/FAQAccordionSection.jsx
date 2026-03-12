// src/components/landing/FAQAccordionSection.jsx
import React, { useState } from "react";
import "./FAQAccordionSection.css";

const faqs = [
  {
    q: "GFMS dành cho ai?",
    a: "Dành cho Admin tổng, Owner chi nhánh, PT và Member trong mô hình gym hoặc chuỗi gym nhượng quyền.",
  },
  {
    q: "Có quản lý được nhiều chi nhánh không?",
    a: "Có. Hệ thống được thiết kế để tách dữ liệu theo gym nhưng vẫn tổng hợp báo cáo cho toàn hệ thống.",
  },
  {
    q: "Người dùng có theo dõi được BMI không?",
    a: "Có. Hội viên có thể tính BMI, lưu lịch sử chỉ số và xem biểu đồ tiến trình cá nhân.",
  },
  {
    q: "Có thể mở rộng thêm tính năng không?",
    a: "Có. Hệ thống phù hợp để mở rộng thêm thanh toán, CRM, loyalty, AI chatbox, dashboard nâng cao.",
  },
];

export default function FAQAccordionSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="faq-accordion-modern">
      <div className="lm-sectionHead center">
        <span className="lm-kicker">FAQ</span>
        <h2>Hỏi nhanh đáp gọn</h2>
      </div>

      <div className="faq-accordion-modern__list">
        {faqs.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              className={`faq-acc-item ${isOpen ? "open" : ""}`}
              key={item.q}
            >
              <button
                className="faq-acc-item__head"
                onClick={() => setOpenIndex(isOpen ? -1 : idx)}
              >
                <span>{item.q}</span>
                <b>{isOpen ? "−" : "+"}</b>
              </button>

              <div className="faq-acc-item__body">
                <div className="faq-acc-item__bodyInner">{item.a}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}