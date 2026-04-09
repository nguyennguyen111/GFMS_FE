import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import "../../admin/pages/FranchiseRequestsPage.css";
import "./OwnerFranchiseRequestsPage.css";
import {
  ownerGetMyFranchiseRequests,
  ownerGetFranchiseRequestDetail,
  ownerCreateFranchiseRequest,
  ownerUpdateFranchiseRequest,
  ownerDownloadFranchiseContractPdf,
} from "../../../services/ownerFranchiseService";
import { franchiseSigningHref } from "../../../utils/franchiseSigning";

/** Giống admin FranchiseRequestsPage — trạng thái luồng hợp đồng */
const CONTRACT_LABEL = {
  not_sent: "Bản nháp",
  sent: "Đã gửi",
  viewed: "Đã xem",
  signed: "Đã ký",
  completed: "Hoàn tất",
  void: "Vô hiệu",
};

function contractStepIndex(status) {
  const s = String(status || "not_sent");
  const map = { not_sent: 0, sent: 1, viewed: 2, signed: 3, completed: 4 };
  if (s === "void") return -1;
  return map[s] ?? 0;
}

/** Cùng UI stepper compact như bảng admin */
function OwnerContractStepper({ status }) {
  const idx = contractStepIndex(status);
  const steps = ["Nháp", "Đã gửi", "Đã xem", "Đã ký", "Hoàn tất"];

  if (String(status) === "void") {
    return <div className="fr-stepperVoid">Đã vô hiệu</div>;
  }

  return (
    <div
      className="fr-stepper fr-stepper--compact"
      title={`Trạng thái hợp đồng: ${String(status || "-")}`}
    >
      {steps.map((label, i) => (
        <div key={label} className={`fr-step ${i <= idx ? "active" : ""}`}>
          <span className="fr-dot" />
          <span className="fr-stepLabel">{label}</span>
          {i < steps.length - 1 ? <span className={`fr-line ${i < idx ? "active" : ""}`} /> : null}
        </div>
      ))}
    </div>
  );
}

const STATUS_LABELS = {
  pending: { label: "Chờ duyệt", color: "warning" },
  approved: { label: "Đã duyệt", color: "success" },
  rejected: { label: "Từ chối", color: "danger" },
};

function StatusBadge({ status }) {
  const info = STATUS_LABELS[status] || { label: status, color: "secondary" };
  return <span className={`ofr-badge ofr-badge--${info.color}`}>{info.label}</span>;
}

function Field({ label, required, hint, children }) {
  return (
    <div className="ofr-field">
      <label className="ofr-field__label">
        {label}
        {required && <span className="ofr-required">*</span>}
      </label>
      {hint && <div className="ofr-field__hint">{hint}</div>}
      <div className="ofr-field__control">{children}</div>
    </div>
  );
}

const INITIAL_FORM = {
  businessName: "",
  location: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  investmentAmount: "",
  businessPlan: "",
};

export default function OwnerFranchiseRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  const [filters, setFilters] = useState({ q: "", status: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [menuRect, setMenuRect] = useState(null);

  const activeMenuReq = actionMenuId != null ? requests.find((r) => r.id === actionMenuId) : null;

  // Load danh sách
  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { ...filters, page: currentPage, limit: 10 };

      const res = await ownerGetMyFranchiseRequests(params);
      setRequests(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line
  }, [currentPage]);

  const closeActionMenu = () => {
    setActionMenuId(null);
    setMenuRect(null);
  };

  useLayoutEffect(() => {
    if (actionMenuId == null) {
      setMenuRect(null);
      return undefined;
    }
    const update = () => {
      const el = document.querySelector(`[data-ofr-menu-anchor="${actionMenuId}"]`);
      if (!el) {
        setMenuRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const width = Math.min(340, Math.max(280, 300));
      const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
      const top = r.bottom + 8;
      setMenuRect({ top, left, width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [actionMenuId]);

  useEffect(() => {
    if (actionMenuId === null) return undefined;
    const onDoc = (e) => {
      if (e.target.closest?.("[data-ofr-menu-anchor]")) return;
      if (e.target.closest?.(".ofr-dropdown--portal")) return;
      closeActionMenu();
    };
    const onKey = (e) => {
      if (e.key === "Escape") closeActionMenu();
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [actionMenuId]);

  function openFranchiseSigningLink(url) {
    const href = franchiseSigningHref(url);
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
    closeActionMenu();
  }

  async function downloadContractPdf(id, type) {
    setError("");
    setSuccess("");
    try {
      const res = await ownerDownloadFranchiseContractPdf(id, type);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FranchiseContract_${id}_${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      closeActionMenu();
      setSuccess("Đã tải xuống PDF.");
    } catch (e) {
      let msg = e?.response?.data?.message || e?.message || "Tải xuống thất bại";
      const data = e?.response?.data;
      if (data instanceof Blob) {
        try {
          const t = await data.text();
          const j = JSON.parse(t);
          if (j.message) msg = j.message;
        } catch (_) {
          /* ignore */
        }
      }
      setError(msg);
      closeActionMenu();
    }
  }

  async function copySigningLink(url) {
    if (!url) return;
    const href = franchiseSigningHref(url);
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setError("");
    setSuccess("Đã sao chép liên kết ký vào clipboard.");
    closeActionMenu();
  }

  async function refreshContractStatus(requestId) {
    if (!requestId) return;
    setError("");
    setSuccess("");
    try {
      const res = await ownerGetFranchiseRequestDetail(requestId);
      const fresh = res?.data?.data || res?.data;
      if (fresh?.id) {
        setRequests((prev) => prev.map((item) => (item.id === fresh.id ? { ...item, ...fresh } : item)));
        setSuccess(`Đã làm mới trạng thái hợp đồng #${requestId}.`);
      } else {
        await loadRequests();
        setSuccess(`Đã làm mới trạng thái hợp đồng #${requestId}.`);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Không thể làm mới trạng thái hợp đồng");
    } finally {
      closeActionMenu();
    }
  }

  // Mở modal tạo mới
  const handleCreate = () => {
    setEditing(null);
    setForm({ ...INITIAL_FORM });
    setShowModal(true);
  };

  // Mở modal sửa
  const handleEdit = (req) => {
    closeActionMenu();
    setEditing(req);
    setForm({
      businessName: req.businessName || "",
      location: req.location || "",
      contactPerson: req.contactPerson || "",
      contactPhone: req.contactPhone || "",
      contactEmail: req.contactEmail || "",
      investmentAmount: req.investmentAmount || "",
      businessPlan: req.businessPlan || "",
    });
    setShowModal(true);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (editing) {
        await ownerUpdateFranchiseRequest(editing.id, form);
        setSuccess("Cập nhật yêu cầu thành công!");
      } else {
        await ownerCreateFranchiseRequest(form);
        setSuccess("Tạo yêu cầu nhượng quyền thành công!");
      }

      setShowModal(false);
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="ofr-page">
      <div className="ofr-header">
        <h1 className="ofr-title">Yêu cầu nhượng quyền</h1>
        <button className="ofr-btn ofr-btn--primary" onClick={handleCreate}>
          + Tạo yêu cầu mới
        </button>
      </div>

      {error && <div className="ofr-alert ofr-alert--danger">{error}</div>}
      {success && <div className="ofr-alert ofr-alert--success">{success}</div>}

      {/* Filter */}
      <div className="ofr-filters">
        <input
          placeholder="Tìm theo tên doanh nghiệp, địa điểm, người liên hệ..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Tất cả</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>
        <button className="btn-primary" onClick={() => { setCurrentPage(1); loadRequests(); }}>
          Tìm
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="ofr-loading">Đang tải...</div>
      ) : requests.length === 0 ? (
        <div className="ofr-empty">Chưa có yêu cầu nào</div>
      ) : (
        <>
          <div className="ofr-tableWrap">
          <table className="ofr-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên doanh nghiệp</th>
                <th>Địa điểm</th>
                <th>Người liên hệ</th>
                <th>Số vốn dự kiến</th>
                <th>Trạng thái</th>
                <th>Hợp đồng</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td>{req.businessName}</td>
                  <td>{req.location}</td>
                  <td>
                    {req.contactPerson}
                    <br />
                    <small>{req.contactPhone}</small>
                  </td>
                  <td>{formatCurrency(req.investmentAmount)}</td>
                  <td>
                    <StatusBadge status={req.status} />
                  </td>
                  <td>
                    <div className="fr-contractCol">
                      <div className="fr-contractTop">
                        <span
                          className={`fr-pill fr-pill-contract ${
                            req.contractStatus === "signed" || req.contractStatus === "completed"
                              ? "fr-pill-signed"
                              : ""
                          }`}
                        >
                          {CONTRACT_LABEL[req.contractStatus] || req.contractStatus || "—"}
                        </span>
                        <span className={`fr-linkBadge ${req.contractUrl ? "" : "fr-linkBadge-off"}`}>
                          {req.contractUrl ? "Đã có liên kết" : "Chưa có liên kết"}
                        </span>
                      </div>
                      <OwnerContractStepper status={req.contractStatus} />
                      {req.status === "approved" && (req.contractStatus === "sent" || req.contractStatus === "viewed") ? (
                        <div className="fr-muted">Đang chờ chủ phòng ký…</div>
                      ) : null}
                    </div>
                  </td>
                  <td>{formatDate(req.createdAt)}</td>
                  <td>
                    <div className="ofr-actions ofr-actions--enterprise">
                      {req.status === "approved" && (
                        <span className="ofr-rowTag ofr-rowTag--ok" title="Yêu cầu đã được admin duyệt">
                          Đã duyệt
                        </span>
                      )}
                      {req.status === "rejected" && (
                        <span className="ofr-rowTag ofr-rowTag--no" title="Yêu cầu không được chấp nhận">
                          Từ chối
                        </span>
                      )}

                      <div
                        className={`ofr-menuWrap${actionMenuId === req.id ? " ofr-menuWrap--open" : ""}`}
                        data-ofr-menu-anchor={req.id}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="ofr-btn ofr-btn--sm ofr-btn--secondary ofr-menuTrigger"
                          aria-expanded={actionMenuId === req.id}
                          aria-haspopup="menu"
                          onClick={() => setActionMenuId((cur) => (cur === req.id ? null : req.id))}
                        >
                          Thao tác ▾
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {activeMenuReq != null &&
            menuRect != null &&
            createPortal(
              <div
                className="ofr-dropdown ofr-dropdown--portal"
                style={{
                  position: "fixed",
                  top: menuRect.top,
                  left: menuRect.left,
                  width: menuRect.width,
                }}
                role="menu"
              >
                {activeMenuReq.status === "pending" ? (
                  <>
                    <div className="ofr-dropHeading">Yêu cầu</div>
                    <button
                      type="button"
                      className="ofr-dropItem"
                      role="menuitem"
                      onClick={() => handleEdit(activeMenuReq)}
                    >
                      Sửa yêu cầu
                    </button>
                  </>
                ) : null}

                {activeMenuReq.status === "approved" ? (
                  <>
                    <div className="ofr-dropHeading">Tệp PDF</div>
                    <button
                      type="button"
                      className="ofr-dropItem"
                      role="menuitem"
                      onClick={() => downloadContractPdf(activeMenuReq.id, "original")}
                    >
                      Tải PDF gốc
                    </button>
                    <button
                      type="button"
                      className="ofr-dropItem"
                      role="menuitem"
                      disabled={!(activeMenuReq.contractStatus === "signed" || activeMenuReq.contractStatus === "completed")}
                      onClick={() => downloadContractPdf(activeMenuReq.id, "owner_signed")}
                    >
                      Tải PDF đã ký (chủ phòng)
                    </button>
                    <button
                      type="button"
                      className="ofr-dropItem"
                      role="menuitem"
                      disabled={activeMenuReq.contractStatus !== "completed"}
                      onClick={() => downloadContractPdf(activeMenuReq.id, "final")}
                    >
                      Tải PDF bản chính thức
                    </button>
                    <button
                      type="button"
                      className="ofr-dropItem"
                      role="menuitem"
                      disabled={activeMenuReq.contractStatus !== "completed"}
                      onClick={() => downloadContractPdf(activeMenuReq.id, "certificate")}
                    >
                      Tải chứng nhận
                    </button>
                  </>
                ) : null}

                <div className="ofr-dropHeading">Liên kết &amp; ký</div>
                {activeMenuReq.contractUrl ? (
                  <>
                    <button
                      type="button"
                      className="ofr-dropItem"
                      role="menuitem"
                      onClick={() => openFranchiseSigningLink(activeMenuReq.contractUrl)}
                    >
                      Mở liên kết ký
                    </button>
                    <button
                      type="button"
                      className="ofr-dropItem"
                      role="menuitem"
                      onClick={() => copySigningLink(activeMenuReq.contractUrl)}
                    >
                      Sao chép liên kết ký
                    </button>
                  </>
                ) : (
                  <div className="ofr-dropMuted">
                    Chưa có liên kết ký. Sau khi admin duyệt và gửi lời mời, liên kết sẽ xuất hiện tại đây.
                  </div>
                )}
                <button
                  type="button"
                  className="ofr-dropItem"
                  role="menuitem"
                  onClick={() => refreshContractStatus(activeMenuReq.id)}
                >
                  Làm mới trạng thái
                </button>
              </div>,
              document.body
            )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="ofr-pagination">
              <button
                className="ofr-btn ofr-btn--sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Trước
              </button>
              <span>
                Trang {currentPage} / {pagination.totalPages}
              </span>
              <button
                className="ofr-btn ofr-btn--sm"
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="ofr-modal">
          <div className="ofr-modal__backdrop" onClick={() => setShowModal(false)} />
          <div className="ofr-modal__content">
            <div className="ofr-modal__header">
              <h2>{editing ? "Sửa yêu cầu" : "Tạo yêu cầu nhượng quyền"}</h2>
              <button className="ofr-modal__close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ofr-form">
              <Field label="Tên doanh nghiệp" required>
                <input
                  type="text"
                  className="ofr-input"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  required
                />
              </Field>

              <Field label="Địa điểm" required>
                <input
                  type="text"
                  className="ofr-input"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                />
              </Field>

              <Field label="Người liên hệ" required>
                <input
                  type="text"
                  className="ofr-input"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  required
                />
              </Field>

              <Field label="Số điện thoại" hint="10-11 chữ số">
                <input
                  type="tel"
                  className="ofr-input"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  pattern="[0-9]{10,11}"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  className="ofr-input"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
              </Field>

              <Field label="Số vốn dự kiến" hint="VNĐ">
                <input
                  type="number"
                  className="ofr-input"
                  value={form.investmentAmount}
                  onChange={(e) => setForm({ ...form, investmentAmount: e.target.value })}
                  min="0"
                  step="1000000"
                />
              </Field>

              <Field label="Kế hoạch kinh doanh">
                <textarea
                  className="ofr-textarea"
                  rows="6"
                  value={form.businessPlan}
                  onChange={(e) => setForm({ ...form, businessPlan: e.target.value })}
                  placeholder="Mô tả kế hoạch kinh doanh, mục tiêu, thị trường..."
                />
              </Field>

              <div className="ofr-form__actions">
                <button
                  type="button"
                  className="ofr-btn ofr-btn--secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="ofr-btn ofr-btn--primary">
                  {editing ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
