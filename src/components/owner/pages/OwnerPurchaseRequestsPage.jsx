import React, { useEffect, useMemo, useState } from "react";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { ownerGetEquipments } from "../../../services/ownerEquipmentService";
import {
  ownerGetSuppliers,
  ownerPreviewPurchaseStock,
  ownerCreatePurchaseRequest,
  ownerGetPurchaseRequests,
  ownerGetPurchaseRequestDetail,
} from "../../../services/ownerPurchaseService";
import "../OwnerDashboard.css";
import "./OwnerPurchaseRequestsPage.css";

const REASONS = [
  { value: "new_opening", label: "Mở mới / mở rộng" },
  { value: "low_stock", label: "Thiếu tồn (≤ min stock)" },
  { value: "replacement", label: "Thay mới" },
  { value: "maintenance_unfixable", label: "Bảo trì không sửa được" },
  { value: "upgrade", label: "Nâng cấp" },
];

export default function OwnerPurchaseRequestsPage() {
  const [gyms, setGyms] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [filters, setFilters] = useState({ q: "", status: "", gymId: "" });
  const [appliedFilters, setAppliedFilters] = useState({ q: "", status: "", gymId: "" });

  const [gymId, setGymId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [expectedUnitPrice, setExpectedUnitPrice] = useState("");
  const [expectedSupplierId, setExpectedSupplierId] = useState("");
  const [reason, setReason] = useState("new_opening");
  const [priority, setPriority] = useState("normal");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const reasonLabelMap = useMemo(
    () => REASONS.reduce((acc, item) => ({ ...acc, [item.value]: item.label }), {}),
    []
  );

  const loadRefs = async () => {
    try {
      const [gRes, eRes, sRes] = await Promise.all([
        ownerGetMyGyms(),
        ownerGetEquipments({ page: 1, limit: 500 }),
        ownerGetSuppliers({ page: 1, limit: 200 }),
      ]);
      const gData = gRes?.data?.data ?? gRes?.data ?? [];
      setGyms(Array.isArray(gData) ? gData : []);
      const eq = eRes?.data?.data ?? eRes?.data ?? [];
      setEquipments(Array.isArray(eq) ? eq : []);
      const sup = sRes?.data?.data ?? sRes?.data ?? [];
      setSuppliers(Array.isArray(sup) ? sup : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  const loadList = async (page = 1, overrideFilters = null) => {
    setLoading(true);
    setErr("");
    try {
      const activeFilters = overrideFilters || appliedFilters;
      const res = await ownerGetPurchaseRequests({
        page,
        limit: pagination.limit,
        q: activeFilters.q || undefined,
        status: activeFilters.status || undefined,
      });
      const data = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      const meta = res?.data?.meta || {};

      const detailResults = await Promise.allSettled(
        list.map((item) => ownerGetPurchaseRequestDetail(item.id))
      );

      const detailById = new Map();
      detailResults.forEach((result) => {
        const detail = result.status === "fulfilled" ? (result.value?.data?.data ?? result.value?.data) : null;
        if (detail?.id) detailById.set(detail.id, detail);
      });

      const extractReasonCode = (noteText) =>
        /reason:([a-z_]+)/i.exec(String(noteText || ""))?.[1]?.toLowerCase() || null;

      const normalized = list.map((row) => {
        const detail = detailById.get(row.id);
        const firstItem = detail?.items?.[0];
        const reasonFromNote = extractReasonCode(detail?.notes) || extractReasonCode(row?.notes);

        return {
          ...row,
          equipment: firstItem?.equipment || null,
          quantity: firstItem?.quantity ?? null,
          reasonCode: reasonFromNote || null,
        };
      });

      setRows(normalized);
      setPagination((prev) => ({
        ...prev,
        page: Number(meta.page) || page,
        limit: Number(meta.limit) || prev.limit,
        total: Number(meta.totalItems) || normalized.length,
        totalPages: Number(meta.totalPages) || 1,
      }));
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefs();
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    if (!appliedFilters.gymId) return rows;
    return rows.filter((r) => Number(r?.gym?.id) === Number(appliedFilters.gymId));
  }, [rows, appliedFilters.gymId]);

  const handleSearchList = () => {
    const nextFilters = {
      q: (filters.q || "").trim(),
      status: filters.status || "",
      gymId: filters.gymId || "",
    };
    setAppliedFilters(nextFilters);
    loadList(1, nextFilters);
  };

  const runPreview = async () => {
    if (!gymId || !equipmentId) return;
    setErr("");
    try {
      const res = await ownerPreviewPurchaseStock({ gymId, equipmentId });
      const stocks = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(stocks) ? stocks : [];
      const selectedStock = list.find((s) => Number(s.equipmentId) === Number(equipmentId));

      if (!selectedStock) {
        setPreview({
          quantityOnHand: 0,
          availableQuantity: 0,
          minStockLevel: 0,
          pendingPurchaseQty: 0,
          shouldReorder: true,
        });
        return;
      }

      const minStockLevel = Number(selectedStock?.equipment?.minStockLevel ?? selectedStock?.reorderPoint ?? 0);
      const availableQuantity = Number(selectedStock?.availableQuantity ?? 0);

      setPreview({
        quantityOnHand: Number(selectedStock?.quantity ?? 0),
        availableQuantity,
        minStockLevel,
        pendingPurchaseQty: 0,
        shouldReorder: availableQuantity <= minStockLevel,
      });
    } catch (e) {
      setPreview(null);
      setErr(e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => {
    if (gymId && equipmentId) runPreview();
    else setPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, equipmentId]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!expectedSupplierId) {
      setErr("Vui lòng chọn NCC dự kiến trước khi gửi yêu cầu.");
      return;
    }

    const structuredNote = [
      `reason:${reason}`,
      `priority:${priority}`,
      note ? `note:${note}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    try {
      await ownerCreatePurchaseRequest({
        gymId: Number(gymId),
        equipmentId: Number(equipmentId),
        quantity: Number(quantity),
        expectedUnitPrice: Number(String(expectedUnitPrice).replace(/,/g, "") || 0),
        expectedSupplierId: expectedSupplierId ? Number(expectedSupplierId) : null,
        reason,
        priority,
        note: structuredNote,
      });
      setNote("");
      await loadList(1);
      alert("Đã gửi yêu cầu mua sắm.");
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex.message);
    }
  };

  const statusLabel = useMemo(
    () => ({
      pending: "Chờ admin",
      quoted: "Đã báo giá",
      approved: "Đã duyệt",
      rejected: "Từ chối",
      converted: "Đã tạo báo giá",
    }),
    []
  );

  return (
    <div className="od2-content owner-purchase-page">
      <div className="owner-purchase-header">
        <div>
          <div className="od2-h1 owner-purchase-title">Yêu cầu mua sắm thiết bị</div>
        </div>
        <button
          type="button"
          className="owner-purchase-add-btn"
          onClick={() => setShowRequestForm((prev) => !prev)}
        >
          {showRequestForm ? "Ẩn form" : "+ Thêm yêu cầu"}
        </button>
      </div>
      <p className="owner-purchase-subtitle">
        Bắt đầu từ nhu cầu vận hành: chọn gym, thiết bị, số lượng, giá dự kiến, NCC và lý do. Hệ thống kiểm tra tồn kho / min stock
        (với lý do &quot;thiếu tồn&quot;). Admin tiếp nhận và tạo báo giá.
      </p>

      {err ? (
        <div className="owner-purchase-error">{err}</div>
      ) : null}

      {showRequestForm && (
        <div className="owner-purchase-modal-overlay" onClick={() => setShowRequestForm(false)}>
          <div className="owner-purchase-modal" onClick={(e) => e.stopPropagation()}>
            <div className="owner-purchase-modal-header">
              <h2 className="owner-purchase-modal-title">Thêm yêu cầu mua thiết bị</h2>
              <button
                type="button"
                className="owner-purchase-modal-close"
                onClick={() => setShowRequestForm(false)}
              >
                ×
              </button>
            </div>
            <div className="owner-purchase-modal-body">
              <form onSubmit={submit} className="owner-purchase-form">
                <div className="owner-purchase-grid owner-purchase-grid-2">
                  <label>
                    <div className="owner-purchase-label">Gym</div>
                    <select className="od2-input" value={gymId} onChange={(e) => setGymId(e.target.value)} required>
                      <option value="">— Chọn —</option>
                      {gyms.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <div className="owner-purchase-label">Thiết bị</div>
                    <select
                      className="od2-input"
                      value={equipmentId}
                      onChange={(e) => setEquipmentId(e.target.value)}
                      required
                    >
                      <option value="">— Chọn —</option>
                      {equipments.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} {eq.code ? `(${eq.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {preview ? (
                  <div className={`owner-purchase-preview ${preview.shouldReorder ? "is-warning" : ""}`}>
                    <b>Tồn tại thời điểm xem:</b> SL kho {preview.quantityOnHand}, khả dụng {preview.availableQuantity}, min {preview.minStockLevel}, đang chờ mua (PO) {preview.pendingPurchaseQty}
                    <div className={`owner-purchase-preview-note ${preview.shouldReorder ? "is-warning" : ""}`}>
                      {preview.shouldReorder
                        ? "Hệ thống đang đánh dấu dưới ngưỡng an toàn / cần mua thêm."
                        : "Mức tồn hiện chưa chạm ngưỡng tối thiểu. Hãy chọn lý do mua phù hợp với nghiệp vụ thực tế."}
                    </div>
                  </div>
                ) : null}

                <div className="owner-purchase-grid owner-purchase-grid-3">
                  <label>
                    <div className="owner-purchase-label">Số lượng</div>
                    <input
                      className="od2-input"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <div className="owner-purchase-label">Đơn giá dự kiến (VNĐ)</div>
                    <input
                      className="od2-input"
                      type="number"
                      min={0}
                      value={expectedUnitPrice}
                      onChange={(e) => setExpectedUnitPrice(e.target.value)}
                    />
                  </label>
                  <label>
                    <div className="owner-purchase-label">NCC dự kiến</div>
                    <select
                      className="od2-input"
                      value={expectedSupplierId}
                      onChange={(e) => setExpectedSupplierId(e.target.value)}
                    >
                      <option value="">— Không chọn —</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="owner-purchase-grid owner-purchase-grid-2">
                  <label>
                    <div className="owner-purchase-label">Lý do mua</div>
                    <select className="od2-input" value={reason} onChange={(e) => setReason(e.target.value)}>
                      {REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <div className="owner-purchase-label">Ưu tiên</div>
                    <select className="od2-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                      <option value="normal">Bình thường</option>
                      <option value="high">Cao</option>
                      <option value="low">Thấp</option>
                    </select>
                  </label>
                </div>

                <label>
                  <div className="owner-purchase-label">Ghi chú</div>
                  <textarea className="od2-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                </label>

                <div className="owner-purchase-form-actions">
                  <button
                    type="button"
                    className="owner-purchase-cancel"
                    onClick={() => setShowRequestForm(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="owner-purchase-submit">
                    Gửi yêu cầu
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="od2-h2 owner-purchase-list-title">
        Danh sách yêu cầu
      </div>

      <div className="owner-purchase-filters">
        <input
          type="text"
          placeholder="Tìm theo mã, gym, thiết bị..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleSearchList()}
          className="owner-purchase-search-input"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="owner-purchase-filter-select"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ admin</option>
          <option value="quoted">Đã báo giá</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
          <option value="converted">Đã tạo báo giá</option>
        </select>
        <select
          value={filters.gymId}
          onChange={(e) => setFilters({ ...filters, gymId: e.target.value })}
          className="owner-purchase-filter-select"
        >
          <option value="">Tất cả phòng gym</option>
          {gyms.map((gym) => (
            <option key={gym.id} value={gym.id}>
              {gym.name}
            </option>
          ))}
        </select>
        <button onClick={handleSearchList} className="owner-purchase-search-button">
          Tìm
        </button>
      </div>

      <div className="owner-purchase-table-wrap">
        <table className="owner-purchase-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Gym</th>
              <th>Thiết bị</th>
              <th>SL</th>
              <th>Lý do</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="owner-purchase-empty">
                  Đang tải…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="owner-purchase-empty">
                  Chưa có yêu cầu.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.code}</td>
                  <td>{r.gym?.name}</td>
                  <td>{r.equipment?.name}</td>
                  <td>{r.quantity}</td>
                  <td>{reasonLabelMap[r.reasonCode] || "—"}</td>
                  <td>
                    <span className={`owner-purchase-status status-${r.status || "pending"}`}>
                      {statusLabel[r.status] || r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="owner-purchase-pagination">
        <button
          className="owner-purchase-pagination-btn"
          disabled={pagination.page <= 1 || loading}
          onClick={() => loadList(pagination.page - 1, appliedFilters)}
        >
          Trước
        </button>
        <span className="owner-purchase-pagination-info">
          Trang {pagination.page} / {pagination.totalPages || 1}
        </span>
        <button
          className="owner-purchase-pagination-btn"
          disabled={pagination.page >= pagination.totalPages || loading}
          onClick={() => loadList(pagination.page + 1, appliedFilters)}
        >
          Sau
        </button>
      </div>
    </div>
  );
}
