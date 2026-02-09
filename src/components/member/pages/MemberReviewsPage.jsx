import React from "react";
import "../member-pages.css";

export default function MemberReviewsPage() {
  return (
    <div className="mh-wrap">
      <div className="mh-head">
        <div>
          <h2 className="mh-title">⭐ Đánh giá</h2>
          <div className="mh-sub">Đánh giá PT/Gym sau buổi tập để nâng chất lượng dịch vụ.</div>
        </div>
      </div>

      <div className="m-card padded">
        <div className="m-empty">
          (MVP) Nối dữ liệu từ <b>review</b>.<br />
          Gợi ý: list review đã gửi + form tạo review (rating + comment).
        </div>
      </div>
    </div>
  );
}
