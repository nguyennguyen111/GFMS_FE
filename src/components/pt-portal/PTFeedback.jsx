import React, { useEffect, useMemo, useState } from "react";
import { getMyPTReviews, replyPTReview } from "../../services/ptService";
import "./PTFeedback.css";

const stars = (n) => "★".repeat(Number(n || 0)) + "☆".repeat(5 - Number(n || 0));

const PTFeedback = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [replyDraft, setReplyDraft] = useState({});
  const [savingId, setSavingId] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError("");
      const params = ratingFilter ? { rating: ratingFilter } : {};
      const res = await getMyPTReviews(params);
      setReviews(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Không tải được danh sách đánh giá.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [ratingFilter]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, item) => acc + Number(item?.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const onReply = async (reviewId) => {
    const text = String(replyDraft[reviewId] || "").trim();
    if (!text) return;
    try {
      setSavingId(reviewId);
      await replyPTReview(reviewId, text);
      setReplyDraft((prev) => ({ ...prev, [reviewId]: "" }));
      await fetchReviews();
    } catch (e) {
      setError(e?.response?.data?.message || "Gửi phản hồi thất bại.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="ptp-wrap">
      <div className="ptp-head">
        <div>
          <h2 className="ptp-title">Đánh giá từ học viên</h2>
          <div className="ptp-sub">Xem đánh giá của hội viên và phản hồi trực tiếp.</div>
        </div>
      </div>

      <div className="ptp-kpi pt-feedback-kpi">
        <div className="ptp-kpi__item">
          <div className="ptp-kpi__label">Tổng đánh giá</div>
          <div className="ptp-kpi__value">{reviews.length}</div>
        </div>
        <div className="ptp-kpi__item">
          <div className="ptp-kpi__label">Điểm trung bình</div>
          <div className="ptp-kpi__value">{avgRating}/5</div>
        </div>
      </div>

      <div className="ptp-toolbar">
        <select
          className="ptp-select"
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
        >
          <option value="">Tất cả số sao</option>
          <option value="5">5 sao</option>
          <option value="4">4 sao</option>
          <option value="3">3 sao</option>
          <option value="2">2 sao</option>
          <option value="1">1 sao</option>
        </select>
      </div>

      {error ? <div className="ptp-error">{error}</div> : null}

      <div className="ptp-card">
        {loading ? (
          <div className="pt-feedback-loading">Đang tải...</div>
        ) : reviews.length === 0 ? (
          <div className="ptp-empty">Chưa có đánh giá nào từ hội viên.</div>
        ) : (
          <div className="pt-feedback-table-wrap">
            <table className="ptp-table pt-feedback-table">
            <thead>
              <tr>
                <th>Hội viên</th>
                <th>Đánh giá</th>
                <th>Nội dung</th>
                <th>Phản hồi của PT</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((item) => {
                const memberName =
                  item?.Member?.User?.username || item?.Member?.User?.email || `Học viên #${item?.memberId || "?"}`;
                const draft = replyDraft[item.id] || "";
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="ptp-name">{memberName}</div>
                      <div className="ptp-desc">
                        {item?.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : ""}
                      </div>
                    </td>
                    <td>{stars(item.rating)} ({item.rating}/5)</td>
                    <td>{item.comment || "—"}</td>
                    <td className="pt-feedback-reply-cell">
                      {item.trainerReply ? (
                        <div className="ptp-card pt-feedback-reply-box">
                          <div>{item.trainerReply}</div>
                          <div className="ptp-sub pt-feedback-reply-time">
                            {item.repliedAt ? `Phản hồi lúc ${new Date(item.repliedAt).toLocaleString("vi-VN")}` : ""}
                          </div>
                        </div>
                      ) : null}
                      <textarea
                        className="ptp-textarea"
                        rows={3}
                        placeholder={item.trainerReply ? "Cập nhật phản hồi..." : "Viết phản hồi..."}
                        value={draft}
                        onChange={(e) =>
                          setReplyDraft((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                      <div className="pt-feedback-reply-action">
                        <button
                          className="ptp-btn ptp-btn--primary ptp-btn--small"
                          disabled={savingId === item.id || !draft.trim()}
                          onClick={() => onReply(item.id)}
                        >
                          {savingId === item.id ? "Đang gửi..." : item.trainerReply ? "Cập nhật phản hồi" : "Gửi phản hồi"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PTFeedback;
