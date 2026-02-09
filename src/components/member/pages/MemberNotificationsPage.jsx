import React from "react";
import "../member-pages.css";

export default function MemberNotificationsPage() {
  return (
    <div className="mh-wrap">
      <div className="mh-head">
        <div>
          <h2 className="mh-title">🔔 Thông báo</h2>
          <div className="mh-sub">Nhận thông báo booking, thanh toán, hệ thống.</div>
        </div>
      </div>

      <div className="m-card padded">
        <div className="m-empty">
          (MVP) Nối dữ liệu từ <b>notification</b>.<br />
          Gợi ý: list thông báo + trạng thái đã đọc.
        </div>
      </div>
    </div>
  );
}
