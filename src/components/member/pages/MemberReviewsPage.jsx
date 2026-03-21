import React from "react";
import "./MemberReviewsPage.css";

const mockReviews = [
  {
    id: 1,
    title: "PT NGUYỄN MINH ANH",
    date: "20 THÁNG 10, 2023",
    rating: 5,
    content:
      "Huấn luyện viên rất tận tâm, chỉnh form kỹ và xây dựng giáo án rõ ràng. Sau vài buổi tập tôi cảm nhận được tiến bộ rất rõ về sức bền và kỹ thuật.",
    avatar: "https://picsum.photos/seed/pt-review-1/100/100",
  },
  {
    id: 2,
    title: "GFMS THẢO ĐIỀN",
    date: "12 THÁNG 09, 2023",
    rating: 4,
    content:
      "Không gian sạch sẽ, máy móc hiện đại và nhân viên hỗ trợ nhiệt tình. Khu functional training khá ấn tượng, phù hợp cho cả tập sức mạnh lẫn cardio.",
    avatar: "https://picsum.photos/seed/gym-review-1/100/100",
  },
  {
    id: 3,
    title: "PT TRẦN GIA BẢO",
    date: "28 THÁNG 08, 2023",
    rating: 5,
    content:
      "Cách hướng dẫn rất dễ hiểu, theo sát từng buổi và giúp tôi duy trì động lực tốt hơn. Lịch tập được điều chỉnh hợp lý theo thể trạng thực tế.",
    avatar: "https://picsum.photos/seed/pt-review-2/100/100",
  },
];

function ReviewCard({ review }) {
  return (
    <article className="member-reviews-item">
      <div className="member-reviews-item-header">
        <div className="member-reviews-author">
          <div className="member-reviews-avatar">
            <img src={review.avatar} alt={review.title} />
          </div>

          <div className="member-reviews-author-info">
            <h3 className="member-reviews-author-name">{review.title}</h3>
            <p className="member-reviews-date">{review.date}</p>
          </div>
        </div>

        <div className="member-reviews-rating">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`material-symbols-outlined ${i < review.rating ? "active" : ""}`}
            >
              star
            </span>
          ))}
        </div>
      </div>

      <p className="member-reviews-content">{review.content}</p>
    </article>
  );
}

export default function MemberReviewsPage() {
  return (
    <div className="member-reviews-page">
      <div className="member-reviews-hero">
        <div className="member-reviews-head">
          <h1 className="member-reviews-title">
            ĐÁNH GIÁ <span>HỘI VIÊN</span>
          </h1>
          <p className="member-reviews-sub">
            Gửi cảm nhận sau buổi tập để nâng tầm trải nghiệm và chất lượng dịch vụ tại GFMS.
          </p>
        </div>

        <div className="member-reviews-grid">
          <section className="member-reviews-form-wrap">
            <div className="member-reviews-form-card">
              <h2 className="member-reviews-section-title">VIẾT ĐÁNH GIÁ</h2>

              <form className="member-reviews-form">
                <div className="member-reviews-group">
                  <label className="member-reviews-label">Chọn đối tượng</label>
                  <div className="member-reviews-targets">
                    <button type="button" className="member-reviews-target active">
                      <span className="material-symbols-outlined">fitness_center</span>
                      PHÒNG TẬP
                    </button>
                    <button type="button" className="member-reviews-target">
                      <span className="material-symbols-outlined">person</span>
                      HUẤN LUYỆN VIÊN
                    </button>
                  </div>
                </div>

                <div className="member-reviews-group">
                  <label className="member-reviews-label">Xếp hạng của bạn</label>
                  <div className="member-reviews-stars">
                    <span className="material-symbols-outlined active">star</span>
                    <span className="material-symbols-outlined active">star</span>
                    <span className="material-symbols-outlined active">star</span>
                    <span className="material-symbols-outlined active">star</span>
                    <span className="material-symbols-outlined">star</span>
                  </div>
                </div>

                <div className="member-reviews-group">
                  <label className="member-reviews-label">Cảm nghĩ chi tiết</label>
                  <textarea
                    className="member-reviews-textarea"
                    rows="5"
                    placeholder="Chia sẻ trải nghiệm tập luyện của bạn..."
                  />
                  <div className="member-reviews-progress-track">
                    <div className="member-reviews-progress-fill" style={{ width: "36%" }} />
                  </div>
                </div>

                <button type="submit" className="member-reviews-submit">
                  GỬI ĐÁNH GIÁ NGAY
                </button>
              </form>
            </div>
          </section>

          <section className="member-reviews-list-wrap">
            <div className="member-reviews-list-head">
              <h2 className="member-reviews-list-title">LỊCH SỬ ĐÁNH GIÁ</h2>

              <div className="member-reviews-filters">
                <button className="member-reviews-filter active" type="button">
                  Tất cả
                </button>
                <button className="member-reviews-filter" type="button">
                  Gần đây
                </button>
              </div>
            </div>

            <div className="member-reviews-list">
              {mockReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>

            <button className="member-reviews-load-more" type="button">
              TẢI THÊM ĐÁNH GIÁ
            </button>
          </section>
        </div>

        <section className="member-reviews-metrics">
          <div className="member-reviews-metric-card">
            <span className="member-reviews-metric-value">4.9/5</span>
            <span className="member-reviews-metric-label">ĐIỂM TRUNG BÌNH HỘI VIÊN</span>
          </div>
          <div className="member-reviews-metric-card">
            <span className="member-reviews-metric-value">328+</span>
            <span className="member-reviews-metric-label">ĐÁNH GIÁ ĐÃ GỬI</span>
          </div>
          <div className="member-reviews-metric-card">
            <span className="member-reviews-metric-value">97%</span>
            <span className="member-reviews-metric-label">TỶ LỆ HÀI LÒNG DỊCH VỤ</span>
          </div>
        </section>
      </div>
    </div>
  );
}