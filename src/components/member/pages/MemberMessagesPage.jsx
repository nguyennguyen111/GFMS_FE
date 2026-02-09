import React from "react";
import "../member-pages.css";

export default function MemberMessagesPage() {
  return (
    <div className="mh-wrap">
      <div className="mh-head">
        <div>
          <h2 className="mh-title">💬 Tin nhắn</h2>
          <div className="mh-sub">Trao đổi với PT hoặc hệ thống.</div>
        </div>
      </div>

      <div className="m-card padded">
        <div className="m-empty">
          (MVP) Nối dữ liệu từ <b>message</b>.<br />
          Gợi ý: 2 cột: danh sách cuộc trò chuyện (PT/admin) và khung chat.
        </div>
      </div>
    </div>
  );
}
