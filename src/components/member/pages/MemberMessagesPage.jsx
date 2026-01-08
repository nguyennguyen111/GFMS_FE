import React from "react";

export default function MemberMessagesPage() {
  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">💬 Tin nhắn</h2>
          <div className="op-sub">Trao đổi với PT hoặc hệ thống.</div>
        </div>
      </div>

      <div className="op-card padded">
        <div className="op-empty">
          (MVP) Nối dữ liệu từ <b>message</b>.<br />
          Gợi ý: 2 cột: danh sách cuộc trò chuyện (PT/admin) và khung chat.
        </div>
      </div>
    </div>
  );
}
