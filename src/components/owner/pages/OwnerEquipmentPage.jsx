import React, { useCallback, useEffect, useState } from "react";
import "./OwnerEquipmentPage.css";
import { ownerGetEquipments, ownerGetEquipmentDetail, ownerMarkEquipmentUnitInStock, ownerMarkEquipmentUnitsInStock } from "../../../services/ownerEquipmentService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";
import { translateEquipmentCategoryName } from "../../../utils/equipmentCategoryI18n";

const API_HOST = process.env.REACT_APP_API_URL || "http://localhost:8080";
const absUrl = (value) => (value ? (String(value).startsWith("http") || String(value).startsWith("data:") ? String(value) : `${API_HOST}${value}`) : "");
const getEquipmentImage = (item) => absUrl(item?.primaryImageUrl || item?.thumbnail || item?.images?.[0]?.url || "");

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN");
};

const normalizeSearchText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d")
  .replace(/Đ/g, "D")
  .toLowerCase()
  .trim();

const formatUnitEventType = (eventType) => {
  switch (String(eventType || "").toLowerCase()) {
    case "created":
      return "Nhập kho";
    case "maintenance_requested":
      return "Yêu cầu bảo trì";
    case "maintenance_approved":
      return "Duyệt bảo trì";
    case "maintenance_assigned":
      return "Phân công kỹ thuật";
    case "maintenance_started":
      return "Bắt đầu bảo trì";
    case "maintenance_completed":
      return "Hoàn tất bảo trì";
    case "maintenance_cancelled":
      return "Huỷ bảo trì";
    case "maintenance_rejected":
      return "Từ chối bảo trì";
    case "transfer_reserved":
      return "Giữ chỗ chuyển";
    case "transfer_released":
      return "Huỷ giữ chỗ";
    case "transfer_completed":
      return "Đã chuyển kho";
    case "deployed_to_use":
      return "Đưa ra sử dụng";
    case "stored_in_stock":
      return "Cất về kho";
    case "disposed":
      return "Xuất bỏ";
    default:
      return eventType || "Sự kiện";
  }
};

const describeUnitEvent = (event, unit) => {
  const currentGym = event?.gym?.name || unit?.gymName || (unit?.gymId ? `Gym #${unit.gymId}` : "gym không xác định");
  const fromGym = event?.fromGym?.name || (event?.fromGymId ? `Gym #${event.fromGymId}` : null);
  const toGym = event?.toGym?.name || (event?.toGymId ? `Gym #${event.toGymId}` : null);

  switch (String(event?.eventType || "").toLowerCase()) {
    case "created":
      return `Thiết bị được nhập vào ${currentGym}`;
    case "maintenance_requested":
      return `Đã tạo yêu cầu bảo trì tại ${currentGym}`;
    case "maintenance_approved":
      return `Yêu cầu bảo trì đã được duyệt cho ${currentGym}`;
    case "maintenance_assigned":
      return `Đã phân công kỹ thuật xử lý bảo trì tại ${currentGym}`;
    case "maintenance_started":
      return `Kỹ thuật đã bắt đầu xử lý bảo trì tại ${currentGym}`;
    case "maintenance_completed":
      return `Bảo trì đã hoàn tất và unit quay lại trạng thái hoạt động tại ${currentGym}`;
    case "maintenance_cancelled":
      return `Yêu cầu bảo trì đã bị huỷ tại ${currentGym}`;
    case "maintenance_rejected":
      return `Yêu cầu bảo trì đã bị từ chối tại ${currentGym}`;
    case "transfer_reserved":
      return `Thiết bị được giữ chỗ để chuyển từ ${fromGym || currentGym} sang ${toGym || "gym đích"}`;
    case "transfer_released":
      return `Yêu cầu chuyển từ ${fromGym || currentGym} sang ${toGym || "gym đích"} đã bị huỷ hoặc giải phóng`;
    case "transfer_completed":
      return `Thiết bị đã chuyển thành công từ ${fromGym || "gym nguồn"} sang ${toGym || currentGym}`;
    case "deployed_to_use":
      return `Thiết bị đã được lấy ra khỏi kho và đưa vào sử dụng tại ${currentGym}`;
    case "stored_in_stock":
      return `Thiết bị đã được cất lại vào kho tại ${currentGym}`;
    case "disposed":
      return `Thiết bị đã được xuất bỏ khỏi ${currentGym}`;
    default:
      return event?.notes || "Có cập nhật mới cho thiết bị";
  }
};

const buildUnitEventMeta = (event) => {
  const meta = [];
  const referenceCode = event?.metadata?.transferCode || event?.metadata?.receiptCode || event?.metadata?.transactionCode || null;
  if (referenceCode) meta.push(`Ref: ${referenceCode}`);
  if (event?.actor?.username) meta.push(`Thực hiện: ${event.actor.username}`);
  if (event?.metadata?.requester?.username) meta.push(`Yêu cầu: ${event.metadata.requester.username}`);
  if (event?.metadata?.technician?.username) meta.push(`Kỹ thuật: ${event.metadata.technician.username}`);
  if (event?.metadata?.technicianName) meta.push(`Kỹ thuật: ${event.metadata.technicianName}`);
  if (event?.metadata?.estimatedCost !== undefined && event?.metadata?.estimatedCost !== null) meta.push(`Dự kiến: ${event.metadata.estimatedCost}`);
  if (event?.metadata?.actualCost !== undefined && event?.metadata?.actualCost !== null) meta.push(`Thực tế: ${event.metadata.actualCost}`);
  if (event?.notes) meta.push(`Ghi chú: ${event.notes}`);
  return meta;
};

const getUnitEventGroup = (eventType) => {
  const normalized = String(eventType || "").toLowerCase();
  if (normalized.startsWith("maintenance_")) return "maintenance";
  if (normalized.startsWith("transfer_")) return "transfer";
  if (["created", "deployed_to_use", "stored_in_stock"].includes(normalized)) return "inventory";
  if (normalized === "disposed") return "disposal";
  return "other";
};

const formatEquipmentStatus = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "Đang hoạt động";
    case "maintenance":
    case "in_maintenance":
      return "Bảo trì";
    case "transfer":
    case "transfer_pending":
      return "Chờ chuyển";
    case "discontinued":
      return "Ngừng sử dụng";
    case "disposed":
      return "Đã thanh lý";
    default:
      return status || "-";
  }
};

const formatUsageStatus = (usageStatus) => {
  return String(usageStatus || "").toLowerCase() === "in_use" ? "Đang sử dụng" : "Đang ở kho";
};

const formatVisibleUnitStatus = (unit) => {
  if (String(unit?.status || "").toLowerCase() !== "active") {
    return formatEquipmentStatus(unit?.status);
  }
  return formatUsageStatus(unit?.usageStatus);
};

export default function OwnerEquipmentPage() {
  const fixedUnitStatusFilter = "active";
  const fixedEquipmentStatusFilter = "active";
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ q: "", status: fixedEquipmentStatusFilter, categoryId: "all" });
  const [page, setPage] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [unitSearch, setUnitSearch] = useState("");
  const [changingUsageUnitId, setChangingUsageUnitId] = useState(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [changingUsageBulk, setChangingUsageBulk] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerGetEquipments({
        ...filters,
        status: fixedEquipmentStatusFilter,
        gymId: selectedGymId || undefined,
        page,
        limit: 10,
        onlyInUse: false,
      });
      const data = res?.data?.data ?? [];
      const metaFrom = res?.data?.meta;
      setItems(data);
      setMeta(metaFrom || { page, limit: 10, totalItems: data.length, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, selectedGymId]);

  useEffect(() => {
    fetchList();
  }, [fetchList, page]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchList();
      if (detailOpen && detail?.id) {
        await handleOpenDetail({ id: detail.id, Gym: detail.selectedGym || null });
      }
    },
    events: ["notification:new", "transfer:changed", "maintenance:changed", "equipment:changed"],
    notificationTypes: ["maintenance", "receipt"],
  });

  const handleOpenDetail = useCallback(async (item) => {
    const equipmentId = typeof item === "object" ? item?.id : item;
    const gymId = typeof item === "object" ? item?.Gym?.id || item?.selectedGym?.id : undefined;
    setDetailLoading(true);
    setUnitSearch("");
    setSelectedUnitIds([]);
    try {
      const res = await ownerGetEquipmentDetail(equipmentId, gymId ? { gymId } : {});
      setDetail(res?.data?.data || null);
      setDetailOpen(true);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetail(null);
    setUnitSearch("");
    setSelectedUnitIds([]);
  }, []);

  const visibleUnits = (detail?.units || []).filter((unit) => {
    const keyword = normalizeSearchText(unitSearch);
    const searchTokens = keyword ? keyword.split(/\s+/).filter(Boolean) : [];
    const searchTarget = normalizeSearchText([
      unit.assetCode,
      unit.gymName,
      unit.gymId ? `gym ${unit.gymId}` : "",
      formatVisibleUnitStatus(unit),
      detail?.name,
      detail?.code,
    ].join(" "));
    const matchesKeyword = searchTokens.length === 0 || searchTokens.every((token) => searchTarget.includes(token));
    const matchesStatus = String(unit.status || "").toLowerCase() === fixedUnitStatusFilter;
    const matchesUsage = String(unit.usageStatus || "").toLowerCase() === "in_use";
    return matchesKeyword && matchesStatus && matchesUsage;
  });

  const unitQuickOptions = (detail?.units || [])
    .filter((unit) => String(unit.status || "").toLowerCase() === fixedUnitStatusFilter && String(unit.usageStatus || "").toLowerCase() === "in_use")
    .map((unit) => ({
      id: unit.id,
      value: unit.assetCode || "",
      label: [
        unit.assetCode || "Không có mã",
        unit.gymName || (unit.gymId ? `Gym #${unit.gymId}` : null),
      ].filter(Boolean).join(" - "),
    }))
    .filter((option, index, list) => option.value && list.findIndex((item) => item.value === option.value) === index)
    .sort((left, right) => left.label.localeCompare(right.label, "vi"));

  const detailUnitSummary = (detail?.units || []).reduce((summary, unit) => {
    summary.total += 1;
    if (unit.status === "active" && unit.usageStatus === "in_use") summary.inUse += 1;
    if (unit.status === "active" && unit.usageStatus === "in_stock") summary.inStock += 1;
    if (unit.status === "in_maintenance") summary.maintenance += 1;
    if (unit.status === "transfer_pending") summary.transferPending += 1;
    return summary;
  }, { total: 0, inUse: 0, inStock: 0, maintenance: 0, transferPending: 0 });

  const toggleUnitSelection = useCallback((unitId) => {
    setSelectedUnitIds((current) => (
      current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId]
    ));
  }, []);

  const clearSelectedUnits = useCallback(() => {
    setSelectedUnitIds([]);
  }, []);

  const getVisibleUnitEvents = (unit) => {
    const events = unit?.eventTimeline || [];
    return events;
  };

  const handleUsageStatusChange = useCallback(async (unit) => {
    if (!detail?.id || !unit?.id) return;
    setChangingUsageUnitId(unit.id);
    try {
      await ownerMarkEquipmentUnitInStock(detail.id, unit.id);
      await handleOpenDetail(detail.id);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setChangingUsageUnitId(null);
    }
  }, [detail?.id, fetchList, handleOpenDetail]);

  const handleBulkUsageStatusChange = useCallback(async () => {
    if (!detail?.id) return;
    const selectedUnits = visibleUnits.filter((unit) => selectedUnitIds.includes(unit.id));
    if (!selectedUnits.length) {
      alert("Chưa chọn thiết bị nào");
      return;
    }

    setChangingUsageBulk(true);
    try {
      await ownerMarkEquipmentUnitsInStock(detail.id, selectedUnits.map((unit) => unit.id));
      setSelectedUnitIds([]);
      await handleOpenDetail(detail.id);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setChangingUsageBulk(false);
    }
  }, [detail?.id, fetchList, handleOpenDetail, selectedUnitIds, visibleUnits]);

  const detailImageUrl = getEquipmentImage(detail);
  const detailCategoryLabel = translateEquipmentCategoryName(
    detail?.category?.name || detail?.EquipmentCategory?.name,
    detail?.category?.code || detail?.EquipmentCategory?.code
  ) || "-";

  return (
    <div className="oeq-page">
      <div className="oeq-head">
        <h2>Thiết bị</h2>
        <p>
          {selectedGymName
            ? `Đang theo dõi danh mục thiết bị tại ${selectedGymName}. Dữ liệu đồng bộ ảnh, trạng thái vận hành và số lượng thực tế theo từng dòng thiết bị.`
            : "Danh mục thiết bị owner được đồng bộ từ kho thiết bị admin. Bấm vào từng dòng để xem ảnh, thông tin chuẩn và lịch sử vận hành của từng máy."}
        </p>
      </div>

      <div className="oeq-filters">
        <input
          placeholder="Tìm theo tên/mã thiết bị..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <button className="btn-primary" onClick={() => { setPage(1); fetchList(); }}>
          Tìm
        </button>
      </div>

      {loading && <div className="oeq-loading">Đang tải...</div>}

      <div className="oeq-table-wrap">
        <table className="oeq-table">
          <thead>
            <tr>
              <th>Thiết bị</th>
              <th>Phòng tập</th>
              <th>Danh mục</th>
              <th>Tổng</th>
              <th>Đang sử dụng</th>
              <th>Bảo trì</th>
              <th>Trong kho</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const inUseQuantity = Number(r.unitSummary?.inUseQuantity ?? 0);
              const maintenanceQuantity = Number(r.unitSummary?.maintenanceQuantity ?? 0);
              const totalQuantity = Number(r.stock?.quantity ?? 0);
              const availableQuantity = Number(r.unitSummary?.inStockQuantity ?? r.stock?.availableQuantity ?? 0);
              const imageUrl = getEquipmentImage(r);
              const categoryLabel = translateEquipmentCategoryName(r.EquipmentCategory?.name, r.EquipmentCategory?.code) || "-";
              return (
                <tr key={r.stockId || `${r.Gym?.id}-${r.id}`} onClick={() => handleOpenDetail(r)} className="oeq-row">
                  <td>
                    <div className="oeq-product">
                      <div className="oeq-product__media">
                        {imageUrl ? <img src={imageUrl} alt={r.name} /> : <span>{(r.name || "T").slice(0, 1).toUpperCase()}</span>}
                      </div>
                      <div className="oeq-product__content">
                        <strong>{r.name}</strong>
                        <span>{r.code || "Chưa có mã"}</span>
                        <small>{r.description || categoryLabel}</small>
                      </div>
                    </div>
                  </td>
                  <td>{r.Gym?.name || "-"}</td>
                  <td>{categoryLabel}</td>
                  <td>{totalQuantity}</td>
                  <td>{inUseQuantity}</td>
                  <td>{maintenanceQuantity}</td>
                  <td>{availableQuantity}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="oeq-empty">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="oeq-paging">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          ←
        </button>
        <span>
          Trang <b>{meta.page}</b> / {meta.totalPages}
        </span>
        <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
          →
        </button>
      </div>

      {detailOpen && (
        <div className="oeq-modal-overlay" onClick={closeDetail}>
          <div className="oeq-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oeq-modal-header">
              <h2 className="oeq-modal-title">Chi tiết thiết bị {detail?.name ? `- ${detail.name}` : ""}{detail?.selectedGym?.name ? ` (${detail.selectedGym.name})` : ""}</h2>
              <button className="oeq-modal-close" onClick={closeDetail} type="button" aria-label="Đóng">✕</button>
            </div>

            <div className="oeq-modal-body">
              {detailLoading || !detail ? (
                <div className="oeq-loading">Đang tải chi tiết...</div>
              ) : (
                <>
                  <div className="oeq-detail-hero">
                    <div className="oeq-detail-hero__media">
                      {detailImageUrl ? <img src={detailImageUrl} alt={detail?.name || "Thiết bị"} /> : <span>{(detail?.name || "T").slice(0, 1).toUpperCase()}</span>}
                    </div>
                    <div className="oeq-detail-hero__content">
                      <div className="oeq-detail-hero__eyebrow">Chi tiết thiết bị owner</div>
                      <h3>{detail?.name || "Thiết bị"}</h3>
                      <p>{detail?.description || "Thiết bị này được đồng bộ trực tiếp từ danh mục thiết bị admin để owner theo dõi đúng ảnh, mã, loại thiết bị và tình trạng vận hành."}</p>
                      <div className="oeq-detail-hero__chips">
                        <span className="oeq-soft-chip">Mã: {detail?.code || "-"}</span>
                        <span className="oeq-soft-chip">Danh mục: {detailCategoryLabel}</span>
                        <span className="oeq-soft-chip">Gym: {detail?.selectedGym?.name || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="oeq-detail-grid">
                    <div className="oeq-detail-card">
                      <div className="oeq-detail-label">Tổng thiết bị cùng loại</div>
                      <div className="oeq-detail-value">{detailUnitSummary.total}</div>
                    </div>
                    <div className="oeq-detail-card">
                      <div className="oeq-detail-label">Đang sử dụng</div>
                      <div className="oeq-detail-value">{detailUnitSummary.inUse}</div>
                    </div>
                    <div className="oeq-detail-card">
                      <div className="oeq-detail-label">Trong kho</div>
                      <div className="oeq-detail-value">{detailUnitSummary.inStock}</div>
                    </div>
                    <div className="oeq-detail-card">
                      <div className="oeq-detail-label">Đang bảo trì</div>
                      <div className="oeq-detail-value">{detailUnitSummary.maintenance}</div>
                    </div>
                    <div className="oeq-detail-card">
                      <div className="oeq-detail-label">Thương hiệu</div>
                      <div className="oeq-detail-value">{detail?.brand || "-"}</div>
                    </div>
                    <div className="oeq-detail-card">
                      <div className="oeq-detail-label">Model</div>
                      <div className="oeq-detail-value">{detail?.model || "-"}</div>
                    </div>
                    <div className="oeq-detail-card">
                      <div className="oeq-detail-label">Đơn giá tham chiếu</div>
                      <div className="oeq-detail-value">{Number(detail?.price || 0).toLocaleString("vi-VN")}đ</div>
                    </div>
                    <div className="oeq-detail-card">
                      <div className="oeq-detail-label">Trạng thái danh mục</div>
                      <div className="oeq-detail-value">{formatEquipmentStatus(detail?.status)}</div>
                    </div>
                  </div>

                  <div className="oeq-unit-filters">
                    <div className="oeq-unit-searchbox">
                      <input
                        value={unitSearch}
                        onChange={(e) => setUnitSearch(e.target.value)}
                        placeholder="Tìm thiết bị đang sử dụng..."
                      />
                    </div>
                    <select
                      className="oeq-unit-quick-select"
                      value={unitQuickOptions.some((option) => option.value === unitSearch) ? unitSearch : ""}
                      onChange={(e) => setUnitSearch(e.target.value)}
                    >
                      <option value="">Chọn nhanh thiết bị...</option>
                      {unitQuickOptions.map((option) => (
                        <option key={option.id} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="oeq-bulk-toolbar">
                    <div className="oeq-bulk-toolbar__actions">
                      <button type="button" className="oeq-unit-export" onClick={clearSelectedUnits} disabled={!selectedUnitIds.length}>Bỏ chọn</button>
                      <button type="button" className="oeq-unit-export" onClick={handleBulkUsageStatusChange} disabled={changingUsageBulk || !selectedUnitIds.length}>Cất vào kho đã chọn</button>
                    </div>
                  </div>

                  <div className="oeq-unit-list">
                    {visibleUnits.map((unit) => (
                      <div key={unit.id} className={`oeq-unit-card ${selectedUnitIds.includes(unit.id) ? "is-selected" : ""}`}>
                        <div className="oeq-unit-head">
                          <div>
                            <label className="oeq-unit-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedUnitIds.includes(unit.id)}
                                onChange={() => toggleUnitSelection(unit.id)}
                              />
                              <span>Chọn thiết bị</span>
                            </label>
                            <div className="oeq-unit-code">{unit.assetCode}</div>
                            <div className="oeq-unit-sub">{unit.gymName || `Gym #${unit.gymId}`} • Tạo lúc {formatDateTime(unit.createdAt)} • {formatVisibleUnitStatus(unit)}</div>
                          </div>
                          <div className="oeq-unit-actions">
                            <span className={`oeq-badge oeq-badge--${String(unit.status || "").toLowerCase() === "active" ? unit.usageStatus : unit.status}`}>{formatVisibleUnitStatus(unit)}</span>
                            {unit.status === "active" && unit.usageStatus === "in_use" && (
                              <button
                                type="button"
                                className="oeq-unit-export"
                                onClick={() => handleUsageStatusChange(unit)}
                                disabled={changingUsageUnitId === unit.id}
                              >
                                {changingUsageUnitId === unit.id ? "Đang xử lý..." : "Cất vào kho"}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="oeq-unit-history">
                          <div className="oeq-unit-history__title">Lịch sử vận hành thiết bị</div>
                          {getVisibleUnitEvents(unit).length === 0 ? (
                            <div className="oeq-unit-history__empty">Chưa có lịch sử vận hành thiết bị</div>
                          ) : (
                            getVisibleUnitEvents(unit).map((event) => (
                              <div key={`event-${event.id}`} className="oeq-history-item oeq-history-item--event">
                                <div className="oeq-history-item__head">
                                  <span className={`oeq-badge oeq-badge--${event.eventType}`}>{formatUnitEventType(event.eventType)}</span>
                                  <span className="oeq-history-item__time">{formatDateTime(event.eventAt)}</span>
                                </div>
                                <div className="oeq-history-item__body">{describeUnitEvent(event, unit)}</div>
                                {buildUnitEventMeta(event).length > 0 && (
                                  <div className="oeq-history-item__meta">
                                    {buildUnitEventMeta(event).map((value) => (
                                      <span key={value}>{value}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                      </div>
                    ))}
                    {visibleUnits.length === 0 && <div className="oeq-empty">Không có thiết bị phù hợp</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
