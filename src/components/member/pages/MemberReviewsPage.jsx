import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./MemberReviewsPage.css";
import {
  createReview,
  getEligibleReviewTargets,
  getMyReviews,
} from "../../../services/memberReviewService";

const typeConfig = {
  gym: { label: "Phòng tập", icon: "fitness_center" },
  trainer: { label: "Huấn luyện viên", icon: "person" },
  package: { label: "Gói tập", icon: "inventory_2" },
};

const initialForm = {
  reviewType: "trainer",
  targetKey: "",
  rating: 5,
  comment: "",
};

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
  const reviewType = review?.reviewType || "trainer";
  const trainerName = review?.Trainer?.User?.username || `PT #${review?.trainerId || "?"}`;
  const packageName = review?.Package?.name || review?.Booking?.Package?.name || "Gói tập";
  const gymName = review?.Gym?.name || "Phòng tập";

  const label =
    reviewType === "gym"
      ? gymName
      : reviewType === "package"
      ? packageName
      : trainerName;

  const bookingDate = review?.Booking?.bookingDate ? fmtDate(review.Booking.bookingDate) : fmtDate(review?.createdAt);
  const bookingTime = review?.Booking?.startTime && review?.Booking?.endTime
    ? `${String(review.Booking.startTime).slice(0, 5)}-${String(review.Booking.endTime).slice(0, 5)}`
    : "";

  const subLabel =
    reviewType === "gym"
      ? `${bookingDate} · Phòng tập`
      : reviewType === "package"
      ? `${bookingDate} · Gói tập`
      : `${bookingDate}${bookingTime ? ` · ${bookingTime}` : ""} · ${packageName}`;

  return (
    <article className="member-reviews-item">
      <div className="member-reviews-item-header">
        <div className="member-reviews-author">
          <div className="member-reviews-avatar member-reviews-avatar--fallback">
            {String(label || "G")
              .slice(0, 1)
              .toUpperCase()}
          </div>

          <div className="member-reviews-author-info">
            <h3 className="member-reviews-author-name">{label}</h3>
            <p className="member-reviews-date">{subLabel}</p>
          </div>
        </div>

        <div className="member-reviews-rating">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`material-symbols-outlined ${
                i < Number(review?.rating || 0) ? "active" : ""
              }`}
            >
              star
            </span>
          ))}
        </div>
      </div>

      <p className="member-reviews-content">{review?.comment}</p>
      {review?.trainerReply ? (
        <div className="member-reviews-reply">
          <p className="member-reviews-reply-label">
            Phản hồi từ PT
            {review?.repliedAt ? ` · ${fmtDate(review.repliedAt)}` : ""}
          </p>
          <p className="member-reviews-reply-content">{review.trainerReply}</p>
        </div>
      ) : null}
    </article>
  );
}

export default function MemberReviewsPage() {
  const [searchParams] = useSearchParams();
  const [eligible, setEligible] = useState({
    trainer: [],
    package: [],
    gym: [],
    courses: [],
  });
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const [eligibleData, myReviews] = await Promise.all([
        getEligibleReviewTargets(),
        getMyReviews(),
      ]);

      setEligible(
        eligibleData || { trainer: [], package: [], gym: [], courses: [] }
      );
      setReviews(Array.isArray(myReviews) ? myReviews : []);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Không tải được dữ liệu đánh giá."
      );
      setEligible({ trainer: [], package: [], gym: [], courses: [] });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const type = String(searchParams.get("type") || "").toLowerCase();
    if (["trainer","package","gym"].includes(type)) {
      setForm((prev) => ({ ...prev, reviewType: type }));
    }
  }, [searchParams]);

  const currentTargets = useMemo(() => {
  const directTargets = Array.isArray(eligible?.[form.reviewType])
    ? eligible[form.reviewType]
    : [];

  if (directTargets.length) return directTargets;

  if (form.reviewType === "trainer" && Array.isArray(eligible?.courses)) {
    return eligible.courses
      .filter((item) => !item.reviewed)
      .map((item) => ({
        reviewType: "trainer",
        activationId: item.activationId,
        trainerId: item.trainerId,
        label: item.trainerName || "PT",
        subtitle: `${item.packageName || "Gói tập"} (${item.completedSessions || 0}/${item.totalSessions || 0} buổi)`,
      }));
  }

  return [];
}, [eligible, form.reviewType]);

  const targetOptions = useMemo(
    () =>
      currentTargets.map((item) => ({
        ...item,
        key: JSON.stringify(item),
      })),
    [currentTargets]
  );

  useEffect(() => {
    const activationId = Number(searchParams.get("activationId") || 0);
    if (!targetOptions.length) {
      setForm((prev) => ({ ...prev, targetKey: "" }));
      return;
    }
    const matched = activationId ? targetOptions.find((x) => Number(x.packageActivationId || x.activationId) === activationId) : null;
    if (matched) {
      setForm((prev) => ({ ...prev, targetKey: matched.key }));
      return;
    }
    if (!targetOptions.some((x) => x.key === form.targetKey)) {
      setForm((prev) => ({ ...prev, targetKey: targetOptions[0].key }));
    }
  }, [targetOptions, form.targetKey, searchParams]);

  const metrics = useMemo(() => {
    const total = reviews.length;
    const avg = total
      ? (
          reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total
        ).toFixed(1)
      : "0.0";
    const good = total
      ? Math.round(
          (reviews.filter((item) => Number(item.rating || 0) >= 4).length /
            total) *
            100
        )
      : 0;
    const pending = targetOptions.length;

    return { total, avg, good, pending };
  }, [reviews, targetOptions]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      setSubmitting(true);

      const target = form.targetKey ? JSON.parse(form.targetKey) : null;
      if (!target) {
        throw new Error("Vui lòng chọn đối tượng đánh giá.");
      }

      const cleanComment = String(form.comment || "").trim();
      if (cleanComment.length < 10) {
        throw new Error("Nội dung đánh giá tối thiểu 10 ký tự.");
      }
      if (cleanComment.length > 2000) {
        throw new Error("Nội dung đánh giá tối đa 2000 ký tự.");
      }

      let payload = {
        reviewType: form.reviewType,
        rating: Number(form.rating),
        comment: cleanComment,
        ...target,
      };

      // fallback cho flow cũ activationId của dev
      if (target.activationId && !payload.bookingId && !payload.packageActivationId) {
        payload = {
          activationId: Number(target.activationId),
          rating: Number(form.rating),
          comment: cleanComment,
        };
      }

      const saved = await createReview(payload);

      setReviews((prev) => [saved, ...prev]);
      setForm((prev) => ({ ...prev, comment: "" }));
      setSuccess("Đã gửi đánh giá thành công.");

      await loadData();
    } catch (e2) {
      setError(
        e2?.response?.data?.message ||
          e2?.message ||
          "Gửi đánh giá thất bại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="member-reviews-page">
      <div className="member-reviews-hero">
        <div className="member-reviews-head">
          <h1 className="member-reviews-title">
            ĐÁNH GIÁ 
          </h1>
        </div>
        {success ? <div className="m-badge is-on">{success}</div> : null}

        <div className="member-reviews-grid">
          <section className="member-reviews-form-wrap">
            <div className="member-reviews-form-card">
              <h2 className="member-reviews-section-title">VIẾT ĐÁNH GIÁ</h2>

              {loading ? (
                <div className="m-empty">Đang tải...</div>
              ) : (
                <form className="member-reviews-form" onSubmit={submit}>
                  <div className="member-reviews-group">
                    <label className="member-reviews-label">
                      Chọn đối tượng
                    </label>
                    <div className="member-reviews-targets member-reviews-targets--triple">
                      {Object.entries(typeConfig).map(([type, cfg]) => (
                        <button
                          key={type}
                          type="button"
                          className={`member-reviews-target ${
                            form.reviewType === type ? "active" : ""
                          }`}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              reviewType: type,
                              targetKey: "",
                            }))
                          }
                        >
                          <span className="material-symbols-outlined">
                            {cfg.icon}
                          </span>
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="member-reviews-group">
                    <label className="member-reviews-label">
                      Đối tượng đủ điều kiện
                    </label>
                    <select
                      className="member-reviews-textarea"
                      style={{ minHeight: 52 }}
                      value={form.targetKey}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          targetKey: e.target.value,
                        }))
                      }
                      disabled={!targetOptions.length || submitting || loading}
                    >
                      {!targetOptions.length ? (
                        <option value="">Không có mục đủ điều kiện</option>
                      ) : (
                        targetOptions.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.label} - {item.subtitle}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="member-reviews-group">
                    <label className="member-reviews-label">
                      Xếp hạng của bạn
                    </label>
                    <div className="member-reviews-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="member-reviews-star-btn"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, rating: star }))
                          }
                        >
                          <span
                            className={`material-symbols-outlined ${
                              star <= form.rating ? "active" : ""
                            }`}
                          >
                            star
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="member-reviews-group">
                    <label className="member-reviews-label">
                      Cảm nghĩ chi tiết
                    </label>
                    <textarea
                      className="member-reviews-textarea"
                      rows="5"
                      placeholder="Chia sẻ trải nghiệm tập luyện của bạn..."
                      value={form.comment}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          comment: e.target.value,
                        }))
                      }
                      maxLength={2000}
                    />
                    <div className="member-reviews-progress-track">
                      <div
                        className="member-reviews-progress-fill"
                        style={{
                          width: `${Math.min(
                            (form.comment.length / 300) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="member-reviews-submit"
                    disabled={submitting || !targetOptions.length}
                    style={{
                      opacity: !targetOptions.length || submitting ? 0.65 : 1,
                    }}
                  >
                    {submitting ? "ĐANG GỬI..." : "GỬI ĐÁNH GIÁ NGAY"}
                  </button>
                </form>
              )}
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
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
              {!reviews.length && (
                <article className="member-reviews-item">
                  <p className="member-reviews-content">
                    Bạn chưa có đánh giá nào.
                  </p>
                </article>
              )}
            </div>
          </section>
        </div>

        <section className="member-reviews-metrics">
          <div className="member-reviews-metric-card">
            <span className="member-reviews-metric-value">{metrics.avg}/5</span>
            <span className="member-reviews-metric-label">
              ĐIỂM TRUNG BÌNH HỘI VIÊN ĐÁNH GIÁ
            </span>
          </div>
          <div className="member-reviews-metric-card">
            <span className="member-reviews-metric-value">{metrics.total}</span>
            <span className="member-reviews-metric-label">
              ĐÁNH GIÁ ĐÃ GỬI
            </span>
          </div>
          <div className="member-reviews-metric-card">
            <span className="member-reviews-metric-value">{metrics.pending}</span>
            <span className="member-reviews-metric-label">
              MỤC CHỜ ĐÁNH GIÁ
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}