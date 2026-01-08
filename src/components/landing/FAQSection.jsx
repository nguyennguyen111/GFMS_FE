import React from "react";
import "./FAQSection.css";

const faqs = [
  { q: "GFMS dành cho ai?", a: "Dành cho chuỗi gym nhượng quyền: Admin (HQ), Owner (chi nhánh) và Member (hội viên)." },
  { q: "Hệ thống có hỗ trợ nhiều chi nhánh không?", a: "Có. Dữ liệu tách theo gymId, vẫn có báo cáo tổng cho Admin." },
  { q: "Có đúng nghiệp vụ không?", a: "Có luồng: cấu hình gói → vận hành chi nhánh → hội viên đăng ký → báo cáo/đối soát." },
];

const FAQSection = () => {
  return (
    <section className="faq" id="faq">
      <div className="section-header">
        <span className="stroke-text">FAQ</span>
        <span>hỏi nhanh đáp gọn</span>
      </div>

      <div className="faq-list">
        {faqs.map((x) => (
          <div className="faq-item" key={x.q}>
            <div className="faq-q">{x.q}</div>
            <div className="faq-a">{x.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQSection;
