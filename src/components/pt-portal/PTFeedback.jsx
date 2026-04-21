import React, { useEffect, useMemo, useState } from "react";
import { getMyPTReviews, replyPTReview } from "../../services/ptService";
import "./PTFeedback.css";

const stars = (n) => "★".repeat(Number(n || 0)) + "☆".repeat(5 - Number(n || 0));
const MAX_REPLY_LENGTH = 1000;
const REQUEST_TIMEOUT_MESSAGE =
  "Hệ thống đang xử lý phản hồi lâu hơn bình thường. Vui lòng thử lại sau ít giây.";

const getFeedbackErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message || error?.message || "";
  const isTimeout =
    error?.code === "ECONNABORTED" ||
    /timeout/i.test(String(message));

  if (isTimeout) return REQUEST_TIMEOUT_MESSAGE;
  return message || fallback;
};

const PTFeedback = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [replyDraft, setReplyDraft] = useState({});
  const [savingId, setSavingId] = useState(null);

  const fetchReviews = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const params = ratingFilter ? { rating: ratingFilter } : {};
      const res = await getMyPTReviews(params);
      setReviews(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(getFeedbackErrorMessage(e, "Không tải được danh sách đánh giá."));
    } finally {
      if (!silent) setLoading(false);
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
    if (text.length > MAX_REPLY_LENGTH) {
      setError(`Phản hồi tối đa ${MAX_REPLY_LENGTH} ký tự.`);
      return;
    }
    try {
      setSavingId(reviewId);
      const response = await replyPTReview(reviewId, text);
      const repliedAt = response?.data?.repliedAt || new Date().toISOString();
      setReviews((prev) =>
        prev.map((item) =>
          item.id === reviewId ? { ...item, trainerReply: text, repliedAt } : item
        )
      );
      setReplyDraft((prev) => ({ ...prev, [reviewId]: "" }));
      fetchReviews({ silent: true });
    } catch (e) {
      setError(getFeedbackErrorMessage(e, "Gửi phản hồi thất bại."));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="ptp-wrap">
      <div className="ptp-head">
        <div>
          <h2 className="ptp-title">Đánh giá từ học viên</h2>
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
                        maxLength={MAX_REPLY_LENGTH}
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
