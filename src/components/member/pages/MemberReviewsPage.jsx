import React, { useEffect, useMemo, useState } from "react";
import "./MemberReviewsPage.css";
import { createReview, getEligibleReviewTargets, getMyReviews } from "../../../services/memberReviewService";

const typeConfig = {
  gym: { label: "Phòng tập", icon: "fitness_center" },
  trainer: { label: "Huấn luyện viên", icon: "person" },
  package: { label: "Gói tập", icon: "inventory_2" },
};

const initialForm = { reviewType: "trainer", targetKey: "", rating: 5, comment: "" };

function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ReviewCard({ review }) {
  const label = review.reviewType === "gym" ? review.Gym?.name : review.reviewType === "package" ? review.Package?.name : review.Trainer?.User?.username || `PT #${review.trainerId}`;
  return (
    <article className="member-reviews-item">
      <div className="member-reviews-item-header">
        <div className="member-reviews-author">
          <div className="member-reviews-avatar member-reviews-avatar--fallback">{String(label || "G").slice(0, 1).toUpperCase()}</div>
          <div className="member-reviews-author-info">
            <h3 className="member-reviews-author-name">{label || "Đối tượng đánh giá"}</h3>
            <p className="member-reviews-date">{fmtDate(review.createdAt)} · {typeConfig[review.reviewType]?.label || review.reviewType}</p>
          </div>
        </div>

        <div className="member-reviews-rating">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`material-symbols-outlined ${i < Number(review.rating || 0) ? "active" : ""}`}>star</span>
          ))}
        </div>
      </div>

      <p className="member-reviews-content">{review.comment}</p>
    </article>
  );
}

export default function MemberReviewsPage() {
  const [eligible, setEligible] = useState({ trainer: [], package: [], gym: [] });
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [eligibleData, myReviews] = await Promise.all([getEligibleReviewTargets(), getMyReviews()]);
        if (!mounted) return;
        setEligible(eligibleData || { trainer: [], package: [], gym: [] });
        setReviews(myReviews || []);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.message || e.message || "Không tải được dữ liệu đánh giá.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const currentTargets = useMemo(() => eligible?.[form.reviewType] || [], [eligible, form.reviewType]);
  const targetOptions = useMemo(() => currentTargets.map((item) => ({ ...item, key: JSON.stringify(item) })), [currentTargets]);

  useEffect(() => {
    if (!targetOptions.length) {
      setForm((prev) => ({ ...prev, targetKey: "" }));
      return;
    }
    if (!targetOptions.some((x) => x.key === form.targetKey)) {
      setForm((prev) => ({ ...prev, targetKey: targetOptions[0].key }));
    }
  }, [targetOptions, form.targetKey]);

  const metrics = useMemo(() => {
    const total = reviews.length;
    const avg = total ? (reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total).toFixed(1) : "0.0";
    const good = total ? Math.round((reviews.filter((item) => Number(item.rating || 0) >= 4).length / total) * 100) : 0;
    return { total, avg, good };
  }, [reviews]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setSubmitting(true);
      const target = form.targetKey ? JSON.parse(form.targetKey) : null;
      if (!target) throw new Error("Vui lòng chọn đối tượng đánh giá.");
      const cleanComment = String(form.comment || "").trim();
      if (cleanComment.length < 10) throw new Error("Nội dung đánh giá tối thiểu 10 ký tự.");
      if (cleanComment.length > 2000) throw new Error("Nội dung đánh giá tối đa 2000 ký tự.");
      const payload = { reviewType: form.reviewType, rating: form.rating, comment: cleanComment, ...target };
      const saved = await createReview(payload);
      setReviews((prev) => [saved, ...prev]);
      setForm((prev) => ({ ...prev, comment: "" }));
      setSuccess("Đã gửi đánh giá thành công.");
    } catch (e2) {
      setError(e2?.response?.data?.message || e2.message || "Gửi đánh giá thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="member-reviews-page">
      <div className="member-reviews-hero">
        <div className="member-reviews-head">
          <h1 className="member-reviews-title">Đánh giá <span>hội viên</span></h1>
          <p className="member-reviews-sub">Gửi cảm nhận sau buổi tập để nâng tầm trải nghiệm và chất lượng dịch vụ tại GFMS. Chỉ mục đã hoàn thành thật mới được đánh giá.</p>
        </div>

        {error ? <div className="m-error">{error}</div> : null}
        {success ? <div className="m-badge is-on">{success}</div> : null}

        <div className="member-reviews-grid">
          <section className="member-reviews-form-wrap">
            <div className="member-reviews-form-card">
              <h2 className="member-reviews-section-title">Viết đánh giá</h2>
              {loading ? <div className="m-empty">Đang tải...</div> : (
                <form className="member-reviews-form" onSubmit={submit}>
                  <div className="member-reviews-group">
                    <label className="member-reviews-label">Chọn đối tượng</label>
                    <div className="member-reviews-targets member-reviews-targets--triple">
                      {Object.entries(typeConfig).map(([type, cfg]) => (
                        <button key={type} type="button" className={`member-reviews-target ${form.reviewType === type ? "active" : ""}`} onClick={() => setForm((prev) => ({ ...prev, reviewType: type, targetKey: "" }))}>
                          <span className="material-symbols-outlined">{cfg.icon}</span>
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="member-reviews-group">
                    <label className="member-reviews-label">Đối tượng đủ điều kiện</label>
                    <select className="member-reviews-select" value={form.targetKey} onChange={(e) => setForm((prev) => ({ ...prev, targetKey: e.target.value }))}>
                      {!targetOptions.length ? <option value="">Không có mục đủ điều kiện</option> : null}
                      {targetOptions.map((item) => <option key={item.key} value={item.key}>{item.label} - {item.subtitle}</option>)}
                    </select>
                  </div>

                  <div className="member-reviews-group">
                    <label className="member-reviews-label">Xếp hạng của bạn</label>
                    <div className="member-reviews-stars">
                      {[1,2,3,4,5].map((star) => (
                        <button key={star} type="button" className="member-reviews-star-btn" onClick={() => setForm((prev) => ({ ...prev, rating: star }))}>
                          <span className={`material-symbols-outlined ${star <= form.rating ? "active" : ""}`}>star</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="member-reviews-group">
                    <label className="member-reviews-label">Cảm nghĩ chi tiết</label>
                    <textarea className="member-reviews-textarea" rows="5" value={form.comment} onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))} placeholder="Chia sẻ trải nghiệm tập luyện của bạn..." />
                    <div className="member-reviews-progress-track">
                      <div className="member-reviews-progress-fill" style={{ width: `${Math.min((form.comment.length / 300) * 100, 100)}%` }} />
                    </div>
                  </div>

                  <button type="submit" className="member-reviews-submit" disabled={submitting || !targetOptions.length}>Gửi đánh giá ngay</button>
                </form>
              )}
            </div>
          </section>

          <section className="member-reviews-list-wrap">
            <div className="member-reviews-list-head">
              <h2 className="member-reviews-list-title">Lịch sử đánh giá</h2>
              <div className="member-reviews-filters"><button className="member-reviews-filter active" type="button">Tất cả</button></div>
            </div>
            <div className="member-reviews-list">
              {!reviews.length ? <div className="m-empty">Bạn chưa gửi đánh giá nào.</div> : null}
              {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
            </div>
          </section>
        </div>

        <section className="member-reviews-metrics">
          <div className="member-reviews-metric-card"><span className="member-reviews-metric-value">{metrics.avg}/5</span><span className="member-reviews-metric-label">Điểm trung bình cá nhân</span></div>
          <div className="member-reviews-metric-card"><span className="member-reviews-metric-value">{metrics.total}+</span><span className="member-reviews-metric-label">Đánh giá đã gửi</span></div>
          <div className="member-reviews-metric-card"><span className="member-reviews-metric-value">{metrics.good}%</span><span className="member-reviews-metric-label">Tỷ lệ đánh giá 4-5 sao</span></div>
        </section>
      </div>
    </div>
  );
}
