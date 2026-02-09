import React from "react";
import "./BookingDetailModal.css";

export default function BookingDetailModal({ booking, onClose }) {
  return (
    <div className="bd-backdrop" onClick={onClose}>
      <div className="bd-modal" onClick={e => e.stopPropagation()}>
        <h3>📖 Chi tiết buổi tập</h3>

        <div className="bd-row">
          <span>📅 Ngày</span>
          <b>{booking.bookingDate}</b>
        </div>

        <div className="bd-row">
          <span>⏰ Giờ</span>
          <b>{booking.startTime} – {booking.endTime}</b>
        </div>

        <div className="bd-row">
          <span>🏋️ PT</span>
          <b>{booking.Trainer.User.username}</b>
        </div>

        <div className="bd-row">
          <span>📦 Gói</span>
          <b>{booking.Package.name}</b>
        </div>

        <div className="bd-row">
          <span>🏟️ Gym</span>
          <b>{booking.Gym.name}</b>
        </div>

        <div className="bd-row">
          <span>📌 Trạng thái</span>
          <b className={`st ${booking.status}`}>{booking.status}</b>
        </div>

        <div className="bd-actions">
          <button className="bd-btn primary">📱 QR Check-in</button>
          <button className="bd-btn ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
