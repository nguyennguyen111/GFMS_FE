import React from "react";

export default function MemberNotificationsPage() {
  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">🔔 Thông báo</h2>
          <div className="op-sub">Nhắc lịch, thông báo hệ thống, trạng thái gói tập...</div>
        </div>
      </div>

      <div className="op-card padded">
        <div className="op-empty">
          (MVP) Nối dữ liệu từ <b>notification</b>.<br />
          Gợi ý: hiển thị list: title • content • createdAt • read/unread.
        </div>
      </div>
    </div>
  );
}
