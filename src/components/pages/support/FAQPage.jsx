import React, { useState } from "react";
import "./SupportPage.css";

const faqs = [
  ["Làm sao để đặt lịch tập?", "Bạn vào trang gym hoặc PT, chọn mục đặt lịch rồi đăng nhập để vào booking wizard. Hệ thống sẽ tiếp tục theo gym/PT bạn đang xem."],
  ["Guest có xem được gym, PT, gói tập không?", "Có. Guest có thể xem danh sách công khai, feedback, thông tin cơ bản và dùng chat AI để được tư vấn trước khi đăng nhập."],
  ["Tôi thanh toán xong nhưng chưa thấy gói?", "Hãy vào hồ sơ thành viên để kiểm tra lịch sử thanh toán và trang gói của tôi. Nếu giao dịch pending quá lâu, liên hệ hỗ trợ để đối soát."],
  ["Feedback trên hệ thống gồm gì?", "Mỗi feedback hiển thị nội dung đánh giá, thời gian tạo và người đánh giá để đảm bảo rõ ràng và đáng tin cậy hơn."],
  ["Giờ mở cửa gym lấy ở đâu?", "Giờ mở cửa được lấy từ dữ liệu operatingHours của gym. Nếu chưa được cấu hình, hệ thống sẽ hiển thị trạng thái chưa cập nhật."],
];

export default function FAQPage() {
  const [open, setOpen] = useState(0);
  return (
    <div className="support-page">
      <section className="support-hero">
        <span className="support-kicker">FAQ</span>
        <h1>CÂU HỎI THƯỜNG GẶP</h1>
      </section>

      <section className="faq-list-page">
        {faqs.map(([q, a], index) => (
          <article key={q} className={`faq-item-page ${open === index ? 'open' : ''}`}>
            <button type="button" onClick={() => setOpen(open === index ? -1 : index)}>
              <span>{q}</span>
              <span>{open === index ? '−' : '+'}</span>
            </button>
            {open === index ? <div className="faq-answer-page">{a}</div> : null}
          </article>
        ))}
      </section>
    </div>
  );
}
