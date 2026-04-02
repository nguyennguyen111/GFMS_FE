import React, { useEffect, useMemo, useState } from "react";
import "./MemberReviewsPage.css";
import {
  memberCreateReview,
  memberGetEligibleReviewCourses,
  memberGetMyReviews,
} from "../../../services/memberReviewService";

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

function ReviewCard({ review }) {
  const trainerName = review?.Trainer?.User?.username || "PT";
  const packageName = review?.Booking?.Package?.name || "Gói tập";
  const createdAt = fmtDate(review?.createdAt);
  return (
    <article className="member-reviews-item">
      <div className="member-reviews-item-header">
        <div className="member-reviews-author">
          <div className="member-reviews-avatar">
            <img src={`https://picsum.photos/seed/review-${review.id}/100/100`} alt={trainerName} />
          </div>

          <div className="member-reviews-author-info">
            <h3 className="member-reviews-author-name">{trainerName}</h3>
            <p className="member-reviews-date">{createdAt} · {packageName}</p>
          </div>
        </div>

        <div className="member-reviews-rating">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`material-symbols-outlined ${i < Number(review.rating || 0) ? "active" : ""}`}
            >
              star
            </span>
          ))}
        </div>
      </div>

      <p className="member-reviews-content">{review.comment}</p>
    </article>
  );
}

export default function MemberReviewsPage() {
  const [eligibleCourses, setEligibleCourses] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [selectedActivationId, setSelectedActivationId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setMessage("");
    try {
      const [eligibleRes, reviewsRes] = await Promise.all([
        memberGetEligibleReviewCourses(),
        memberGetMyReviews(),
      ]);
      const eligible = Array.isArray(eligibleRes?.data?.data) ? eligibleRes.data.data : [];
      const reviews = Array.isArray(reviewsRes?.data?.data) ? reviewsRes.data.data : [];
      setEligibleCourses(eligible);
      setMyReviews(reviews);

      const notReviewed = eligible.filter((x) => !x.reviewed);
      setSelectedActivationId(notReviewed[0]?.activationId ? String(notReviewed[0].activationId) : "");
    } catch (e) {
      setMessage(e?.response?.data?.message || "Không tải được dữ liệu đánh giá.");
      setEligibleCourses([]);
      setMyReviews([]);
      setSelectedActivationId("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentSelectedCourse = useMemo(() => {
    return eligibleCourses.find((x) => String(x.activationId) === String(selectedActivationId)) || null;
  }, [eligibleCourses, selectedActivationId]);

  const pendingReviewCourses = useMemo(() => {
    return eligibleCourses.filter((x) => !x.reviewed);
  }, [eligibleCourses]);

  const avgRating = useMemo(() => {
    if (!myReviews.length) return "0.0";
    const sum = myReviews.reduce((acc, x) => acc + Number(x.rating || 0), 0);
    return (sum / myReviews.length).toFixed(1);
  }, [myReviews]);

  const progressPct = Math.min(100, Math.round((comment.length / 300) * 100));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedActivationId) {
      setMessage("Hiện chưa có khóa học đủ điều kiện để đánh giá.");
      return;
    }
    if (!comment.trim()) {
      setMessage("Vui lòng nhập nội dung đánh giá.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      await memberCreateReview({
        activationId: Number(selectedActivationId),
        rating: Number(rating),
        comment: comment.trim(),
      });
      setComment("");
      setRating(5);
      setMessage("Gửi đánh giá thành công.");
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Gửi đánh giá thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="member-reviews-page">
      <div className="member-reviews-hero">
        <div className="member-reviews-head">
          <h1 className="member-reviews-title">
            ĐÁNH GIÁ <span>HỘI VIÊN</span>
          </h1>
          <p className="member-reviews-sub">
            Sau khi hoàn thành đủ số buổi của khóa học, bạn có thể đánh giá PT để cải thiện chất lượng huấn luyện.
          </p>
        </div>

        <div className="member-reviews-grid">
          <section className="member-reviews-form-wrap">
            <div className="member-reviews-form-card">
              <h2 className="member-reviews-section-title">VIẾT ĐÁNH GIÁ</h2>

              <form className="member-reviews-form" onSubmit={onSubmit}>
                <div className="member-reviews-group">
                  <label className="member-reviews-label">Khóa học đủ điều kiện đánh giá</label>
                  <select
                    className="member-reviews-textarea"
                    style={{ minHeight: 52 }}
                    value={selectedActivationId}
                    onChange={(e) => setSelectedActivationId(e.target.value)}
                    disabled={pendingReviewCourses.length === 0 || submitting || loading}
                  >
                    {pendingReviewCourses.length === 0 ? (
                      <option value="">Chưa có khóa học hoàn thành để đánh giá</option>
                    ) : (
                      pendingReviewCourses.map((x) => (
                        <option key={x.activationId} value={x.activationId}>
                          {x.packageName} - PT {x.trainerName} ({x.completedSessions}/{x.totalSessions} buổi)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="member-reviews-group">
                  <label className="member-reviews-label">Xếp hạng của bạn</label>
                  <div className="member-reviews-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`material-symbols-outlined ${n <= rating ? "active" : ""}`}
                        onClick={() => setRating(n)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") setRating(n);
                        }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                </div>

                <div className="member-reviews-group">
                  <label className="member-reviews-label">Cảm nghĩ chi tiết</label>
                  <textarea
                    className="member-reviews-textarea"
                    rows="5"
                    placeholder="Chia sẻ trải nghiệm tập luyện với PT..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={2000}
                  />
                  <div className="member-reviews-progress-track">
                    <div className="member-reviews-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="member-reviews-submit"
                  disabled={pendingReviewCourses.length === 0 || submitting || loading}
                  style={{ opacity: pendingReviewCourses.length === 0 || submitting ? 0.65 : 1 }}
                >
                  {submitting ? "ĐANG GỬI..." : "GỬI ĐÁNH GIÁ NGAY"}
                </button>
                {currentSelectedCourse && (
                  <p className="member-reviews-sub" style={{ marginTop: 8 }}>
                    Bạn đang đánh giá PT {currentSelectedCourse.trainerName} cho khóa {currentSelectedCourse.packageName}.
                  </p>
                )}
                {!!message && (
                  <p className="member-reviews-sub" style={{ marginTop: 4 }}>
                    {message}
                  </p>
                )}
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
              </div>
            </div>

            <div className="member-reviews-list">
              {myReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
              {!myReviews.length && (
                <article className="member-reviews-item">
                  <p className="member-reviews-content">Bạn chưa có đánh giá nào.</p>
                </article>
              )}
            </div>
          </section>
        </div>

        <section className="member-reviews-metrics">
          <div className="member-reviews-metric-card">
            <span className="member-reviews-metric-value">{avgRating}/5</span>
            <span className="member-reviews-metric-label">ĐIỂM TRUNG BÌNH HỘI VIÊN</span>
          </div>
          <div className="member-reviews-metric-card">
            <span className="member-reviews-metric-value">{myReviews.length}</span>
            <span className="member-reviews-metric-label">ĐÁNH GIÁ ĐÃ GỬI</span>
          </div>
          <div className="member-reviews-metric-card">
            <span className="member-reviews-metric-value">{pendingReviewCourses.length}</span>
            <span className="member-reviews-metric-label">KHÓA HỌC CHỜ ĐÁNH GIÁ</span>
          </div>
        </section>
      </div>
    </div>
  );
}
