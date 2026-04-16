import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./OwnerQuotationsPage.css";
import { ownerGetQuotations, ownerGetQuotationDetail } from "../../../services/ownerPurchaseService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const statusBadge = (status) => {
  const map = {
    pending: "Chờ chốt giá",
    approved: "Đã duyệt",
    rejected: "Bị từ chối",
    expired: "Hết hiệu lực",
  };
  return map[status] || status;
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

export default function OwnerQuotationsPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [searchParams] = useSearchParams();
  const openedQuotationRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [gyms, setGyms] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", gymId: "" });
  const [appliedFilters, setAppliedFilters] = useState({ q: "", status: "", gymId: "" });
  const [detail, setDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const scopedGymId = selectedGymId ? String(selectedGymId) : "";
    setFilters((prev) => ({ ...prev, gymId: scopedGymId }));
    setAppliedFilters((prev) => ({ ...prev, gymId: scopedGymId }));
    setPage(1);
  }, [selectedGymId]);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerGetQuotations({
        page,
        limit: 10,
        q: appliedFilters.q || undefined,
        status: appliedFilters.status || undefined,
        gymId: selectedGymId ? String(selectedGymId) : appliedFilters.gymId || undefined,
      });
      setQuotations(res?.data?.data ?? []);
      setMeta(res?.data?.meta ?? { page, limit: 10, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  const loadGyms = useCallback(async () => {
    try {
      const response = await ownerGetMyGyms();
      const list = response?.data?.data ?? response?.data ?? [];
      setGyms(Array.isArray(list) ? list : []);
    } catch (e) {
      setGyms([]);
    }
  }, []);

  const fetchDetail = useCallback(async (quotationId) => {
    try {
      const res = await ownerGetQuotationDetail(quotationId);
      setDetail(res?.data?.data);
      setShowDetailModal(true);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }, []);

  useEffect(() => {
    loadGyms();
  }, [loadGyms]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchQuotations();
      if (detail?.id) {
        await fetchDetail(detail.id);
      }
    },
    events: ["notification:new"],
    notificationTypes: ["quotation"],
  });

  useEffect(() => {
    const quotationId = searchParams.get("quotationId");
    if (!quotationId || openedQuotationRef.current === quotationId) return;
    openedQuotationRef.current = quotationId;
    fetchDetail(quotationId);
  }, [fetchDetail, searchParams]);

  const filteredQuotations = useMemo(() => {
    if (!appliedFilters.gymId) return quotations;
    return quotations.filter((item) => Number(item?.gym?.id) === Number(appliedFilters.gymId));
  }, [quotations, appliedFilters.gymId]);

  const handleSearch = () => {
    const nextFilters = {
      q: (filters.q || "").trim(),
      status: filters.status || "",
      gymId: filters.gymId || "",
    };
    setAppliedFilters(nextFilters);
    setPage(1);
  };

  return (
    <div className="oq-page">
      <div className="oq-head">
        <div>
          <h2>Báo giá</h2>
          <p>Theo dõi báo giá do admin chốt từ yêu cầu mua sắm của owner tại {selectedGymName || "các chi nhánh"}</p>
        </div>
      </div>

      <div className="oq-container">
        <div className="oq-list">
          {loading && <div className="oq-loading">Đang tải...</div>}

          <div className="oq-filters">
            <input
              type="text"
              className="oq-search-input"
              placeholder="Tìm theo mã, nhà cung cấp, gym..."
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <select
              className="oq-status-select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ chốt giá</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Bị từ chối</option>
              <option value="expired">Hết hiệu lực</option>
            </select>
            <select
              className="oq-status-select"
              value={filters.gymId}
              onChange={(e) => setFilters({ ...filters, gymId: e.target.value })}
              disabled={Boolean(selectedGymId)}
            >
              <option value="">{selectedGymId ? (selectedGymName || "Chi nhánh đang quản lý") : "Tất cả phòng gym"}</option>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
            <button className="oq-filter-btn" onClick={handleSearch}>Tìm</button>
          </div>

          <div className="oq-table-wrap">
            <table className="oq-table">
              <thead>
                <tr>
                  <th>Mã báo giá</th>
                  <th>Nhà cung cấp</th>
                  <th>Gym</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation.id} onClick={() => fetchDetail(quotation.id)}>
                    <td>{quotation.code || `#${quotation.id}`}</td>
                    <td>{quotation.supplier?.name || "-"}</td>
                    <td>{quotation.gym?.name || "-"}</td>
                    <td>{formatCurrency(quotation.totalAmount)}</td>
                    <td>
                      <span className={`oq-badge oq-badge-${quotation.status}`}>
                        {statusBadge(quotation.status)}
                      </span>
                    </td>
                    <td>{quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString("vi-VN") : "-"}</td>
                  </tr>
                ))}
                {filteredQuotations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="oq-empty">Không có báo giá</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Trước</button>
              <span>Trang {meta.page} / {meta.totalPages}</span>
              <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page === meta.totalPages}>Sau</button>
            </div>
          )}
        </div>
      </div>

      {showDetailModal && detail && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết báo giá {detail.code || `#${detail.id}`}</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Gym</span><span className="detail-value">{detail.gym?.name || "-"}</span></div>
                <div className="detail-row"><span className="detail-label">Nhà cung cấp</span><span className="detail-value">{detail.supplier?.name || "-"}</span></div>
                <div className="detail-row"><span className="detail-label">Trạng thái</span><span className="detail-value"><span className={`oq-badge oq-badge-${detail.status}`}>{statusBadge(detail.status)}</span></span></div>
                <div className="detail-row"><span className="detail-label">Tổng tiền</span><span className="detail-value">{formatCurrency(detail.totalAmount)}</span></div>
                <div className="detail-row detail-row--full"><span className="detail-label">Ghi chú</span><span className="detail-value">{detail.notes || "-"}</span></div>
              </div>

              <h4 style={{ marginTop: "20px", marginBottom: "12px", color: "#f1f5f9" }}>Danh sách thiết bị</h4>
              <div className="oq-items-table">
                <table>
                  <thead>
                    <tr>
                      <th>Thiết bị</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.equipment?.name || "-"}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
