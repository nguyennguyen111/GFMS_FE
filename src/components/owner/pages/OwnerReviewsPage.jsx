import React, { useEffect, useMemo, useState } from "react";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { ownerGetReviews } from "../../../services/ownerReviewService";
import "./OwnerReviewsPage.css";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const typeLabel = (type) => {
  const key = String(type || "").toLowerCase();
  if (key === "gym") return "Đánh giá phòng tập";
  if (key === "trainer") return "Đánh giá huấn luyện viên";
  return "Khác";
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("vi-VN");
};

const stars = (rating) => {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.round(safe);
  return "★".repeat(full) + "☆".repeat(5 - full);
};

export default function OwnerReviewsPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [reviews, setReviews] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ q: "", reviewType: "", gymId: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  useEffect(() => {
    setFilters((prev) => ({ ...prev, gymId: selectedGymId ? String(selectedGymId) : "" }));
  }, [selectedGymId]);

  const fetchGyms = async () => {
    try {
      const res = await ownerGetMyGyms();
      setGyms(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (_e) {
      setGyms([]);
    }
  };

  const fetchReviews = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        limit: pagination.limit,
        q: filters.q || undefined,
        reviewType: filters.reviewType || undefined,
        gymId: selectedGymId ? String(selectedGymId) : filters.gymId || undefined,
      };
      const res = await ownerGetReviews(params);
      setReviews(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (e) {
      setReviews([]);
      setError(e?.response?.data?.message || "Không tải được danh sách đánh giá");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGyms();
    fetchReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchReviews(pagination.page || 1);
    },
    events: ["notification:new"],
    notificationTypes: ["review"],
  });

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return Math.round((total / reviews.length) * 10) / 10;
  }, [reviews]);

  const onSearch = () => fetchReviews(1);

  return (
    <div className="owner-reviews-page">
      <div className="orv-topbar">
        <h1 className="orv-title">Đánh giá từ hội viên {selectedGymName ? `- ${selectedGymName}` : ""}</h1>
        <div className="orv-kpis">
          <div className="orv-kpi">
            <span className="orv-kpi-label">Tổng đánh giá</span>
            <span className="orv-kpi-value">{pagination.total || 0}</span>
          </div>
          <div className="orv-kpi">
            <span className="orv-kpi-label">Điểm trung bình</span>
            <span className="orv-kpi-value">{avgRating || 0}/5</span>
          </div>
        </div>
      </div>

      <div className="orv-filters">
        <input
          className="orv-input"
          placeholder="Tìm theo hội viên, huấn luyện viên, phòng tập, nội dung..."
          value={filters.q}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
        />
        <select
          className="orv-select"
          value={filters.reviewType}
          onChange={(e) => setFilters((prev) => ({ ...prev, reviewType: e.target.value }))}
        >
          <option value="">Tất cả loại</option>
          <option value="gym">Đánh giá phòng tập</option>
          <option value="trainer">Đánh giá huấn luyện viên</option>
        </select>
        <select
          className="orv-select"
          value={filters.gymId}
          onChange={(e) => setFilters((prev) => ({ ...prev, gymId: e.target.value }))}
          disabled={Boolean(selectedGymId)}
        >
          <option value="">{selectedGymId ? (selectedGymName || "Chi nhánh đang quản lý") : "Tất cả phòng tập"}</option>
          {gyms.map((gym) => (
            <option key={gym.id} value={gym.id}>{gym.name}</option>
          ))}
        </select>
        <button className="orv-btn" onClick={onSearch}>Tìm kiếm </button>
      </div>

      {error ? <div className="orv-error">{error}</div> : null}

      <div className="orv-table-wrap">
        {loading ? (
          <div className="orv-empty">Đang tải đánh giá...</div>
        ) : reviews.length === 0 ? (
          <div className="orv-empty">Chưa có đánh giá phù hợp</div>
        ) : (
          <table className="orv-table">
            <thead>
              <tr>
                <th>Hội viên</th>
                <th>Loại đánh giá</th>
                <th>Huấn luyện viên</th>
                <th>Phòng tập</th>
                <th>Điểm</th>
                <th>Nội dung</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((item) => (
                <tr key={item.id}>
                  <td>{item.member?.username || "N/A"}</td>
                  <td>
                    <span className={`orv-type is-${String(item.reviewType || "").toLowerCase()}`}>
                      {typeLabel(item.reviewType)}
                    </span>
                  </td>
                  <td>{item.trainer?.username || "N/A"}</td>
                  <td>{item.gym?.name || "N/A"}</td>
                  <td>
                    <div className="orv-rating">
                      <span>{stars(item.rating)}</span>
                      <b>{item.rating || 0}/5</b>
                    </div>
                  </td>
                  <td>
                    <div className="orv-comment">{item.comment || "Không có nội dung"}</div>
                  </td>
                  <td>{formatDateTime(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && pagination.totalPages > 1 && (
        <div className="pagination-controls">
          <button
            disabled={pagination.page <= 1}
            onClick={() => fetchReviews(pagination.page - 1)}
            className="pagination-btn"
          >
            Trước
          </button>
          <span className="pagination-info">Trang {pagination.page} / {pagination.totalPages}</span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchReviews(pagination.page + 1)}
            className="pagination-btn"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
