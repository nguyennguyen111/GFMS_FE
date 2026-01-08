import React from "react";

export default function MemberReviewsPage() {
  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">⭐ Đánh giá</h2>
          <div className="op-sub">Đánh giá PT/Gym sau buổi tập để nâng chất lượng dịch vụ.</div>
        </div>
      </div>

      <div className="op-card padded">
        <div className="op-empty">
          (MVP) Nối dữ liệu từ <b>review</b>.<br />
          Gợi ý: list review đã gửi + form tạo review (rating + comment).
        </div>
      </div>
    </div>
  );
}
