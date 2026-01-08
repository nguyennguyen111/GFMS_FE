import React from "react";

export default function MemberProgressPage() {
  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">📈 Tiến độ</h2>
          <div className="op-sub">Theo dõi buổi tập, kết quả, ghi chú của PT.</div>
        </div>
      </div>

      <div className="op-card padded">
        <div className="op-empty">
          (MVP) Nối dữ liệu từ <b>sessionprogress</b> + <b>attendance</b>.<br />
          Gợi ý: timeline các buổi tập + note, metrics (cân nặng, rep, cardio...).
        </div>
      </div>
    </div>
  );
}
