import React from "react";
import { MessageCircleQuestion, Phone, Mail, Clock3 } from "lucide-react";
import "./SupportPage.css";

const cards = [
  { icon: <MessageCircleQuestion size={20} />, title: "Chat hỗ trợ", desc: "Mở AI chat hoặc hộp thoại hỗ trợ để được hướng dẫn nhanh theo nhu cầu tập luyện, gói tập, PT và thao tác hệ thống.", meta: "Phản hồi nhanh trong giờ hoạt động" },
  { icon: <Phone size={20} />, title: "Hotline", desc: "Liên hệ trực tiếp khi cần xử lý booking, thanh toán, checkin hoặc vấn đề tài khoản.", meta: "0911 222 333" },
  { icon: <Mail size={20} />, title: "Email", desc: "Phù hợp với các yêu cầu cần gửi ảnh chụp, hóa đơn, thông tin chi tiết hoặc phản ánh chính thức.", meta: "support@gfms.local" },
  { icon: <Clock3 size={20} />, title: "Giờ hỗ trợ", desc: "Đội ngũ chăm sóc hỗ trợ từ thứ 2 đến chủ nhật cho các vấn đề thường gặp của hội viên.", meta: "08:00 - 21:00" },
];

export default function SupportPage() {
  return (
    <div className="support-page">
      <section className="support-hero">
        <span className="support-kicker">GFMS SUPPORT</span>
        <h1>TRUNG TÂM HỖ TRỢ</h1>
      </section>

      <section className="support-grid">
        {cards.map((card) => (
          <article className="support-card" key={card.title}>
            <div className="support-icon">{card.icon}</div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
            <strong>{card.meta}</strong>
          </article>
        ))}
      </section>
    </div>
  );
}
