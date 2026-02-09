import React from "react";
import "../member-pages.css";

export default function MemberProgressPage() {
  return (
    <div className="mh-wrap">
      <div className="mh-head">
        <div>
          <h2 className="mh-title">📈 Tiến độ</h2>
          <div className="mh-sub">Theo dõi buổi tập, kết quả, ghi chú của PT.</div>
        </div>
      </div>

      <div className="m-card padded">
        <div className="m-empty">
          (MVP) Nối dữ liệu từ <b>sessionprogress</b> + <b>attendance</b>.<br />
          Gợi ý: timeline các buổi tập + note, metrics (cân nặng, rep, cardio...).
        </div>
      </div>
    </div>
  );
}
