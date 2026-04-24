import React, { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import equipmentAssetService from "../../../services/equipmentAssetService";
import axios from "../../../setup/axios";
import "./OwnerEquipmentAssetsPage.css";
import { useLocation } from "react-router-dom";
import { showAppToast } from "../../../utils/appToast";
import useSelectedGym from "../../../hooks/useSelectedGym";

const statusLabel = (s) =>
  ({
    active: "Đang hoạt động",
    maintenance: "Đang bảo trì",
    broken: "Bị hỏng",
    retired: "Ngừng sử dụng",
  }[String(s || "").toLowerCase()] || s || "-");

const statusClass = (s) => `oea-badge oea-badge--${String(s || "active").toLowerCase()}`;

export default function OwnerEquipmentAssetsPage() {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [selected, setSelected] = useState(null);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { selectedGymId, selectedGymName, setSelectedGym } = useSelectedGym();

  const API_HOST = String(axios?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "http://localhost:8080").replace(/\/+$/, "");
  const absUrl = (value) => (value ? (String(value).startsWith("http") || String(value).startsWith("data:") ? String(value) : `${API_HOST}${value}`) : "");

  const totalPages = useMemo(() => {
    const t = Number(meta.total || 0);
    const l = Math.max(1, Number(meta.limit || limit || 20));
    return Math.max(1, Math.ceil(t / l) || 1);
  }, [meta.total, meta.limit, limit]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await equipmentAssetService.ownerList({ q, status, page, limit, gymId: selectedGymId || undefined });
      setRows(res?.data?.data || []);
      setMeta({
        page: Number(res?.data?.meta?.page || page || 1),
        limit: Number(res?.data?.meta?.limit || limit || 20),
        total: Number(res?.data?.meta?.total || 0),
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [q, status, page, limit, selectedGymId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, status, selectedGymId]);

  const openDetail = async (id) => {
    setError("");
    try {
      const [detailRes, qrRes] = await Promise.all([
        equipmentAssetService.ownerDetail(id),
        equipmentAssetService.ownerGetQr(id),
      ]);
      setSelected({ ...(detailRes?.data?.data || {}), ...(qrRes?.data?.data || {}) });
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const scanToken = String(params.get("scanToken") || "").trim();
    if (!scanToken) return;

    equipmentAssetService
      .ownerResolveByToken(scanToken)
      .then(async (res) => {
        const resolved = res?.data?.data || null;
        if (!resolved?.id) return;
        if (resolved?.gymId) {
          setSelectedGym({ id: resolved.gymId, name: resolved.gymName || `Gym #${resolved.gymId}` });
        }
        await openDetail(resolved.id);
        setMaintenanceOpen(true);
        params.delete("scanToken");
        const nextQuery = params.toString();
        const nextUrl = `${location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
        window.history.replaceState({}, "", nextUrl);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const submitMaintenance = async () => {
    if (!selected?.id) return;
    setSubmitting(true);
    setError("");
    try {
      await equipmentAssetService.ownerCreateMaintenance(selected.id, { issueDescription });
      showAppToast({ type: "success", title: "Đã gửi yêu cầu bảo trì", message: "Hệ thống đã ghi nhận yêu cầu." });
      setMaintenanceOpen(false);
      setIssueDescription("");
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="oea-page">
      <section className="oea-hero">
        <div>
          <div className="oea-kicker">Thiết bị thực tế</div>
          <h2>Thiết bị của tôi (QR)</h2>
          <p>{selectedGymId ? `Chỉ hiển thị tài sản thuộc chi nhánh ${selectedGymName || `#${selectedGymId}`}.` : "Đang hiển thị toàn bộ chi nhánh. Chọn một chi nhánh trên header để lọc đúng gym."}</p>
        </div>
      </section>

      <section className="oea-toolbar">
        <input className="oea-input" placeholder="Tìm theo mã asset / tên thiết bị..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="oea-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">active</option>
          <option value="maintenance">maintenance</option>
          <option value="broken">broken</option>
          <option value="retired">retired</option>
        </select>
        <select className="oea-input" value={limit} onChange={(e) => setLimit(Number(e.target.value || 20))}>
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>{n} / trang</option>
          ))}
        </select>
        <button className="oea-btn" onClick={() => load()} disabled={loading}>Tìm</button>
      </section>

      {error ? <div className="oea-alert">{error}</div> : null}
      {loading ? <div className="oea-empty">Đang tải dữ liệu...</div> : null}

      <section className="oea-list">
        {rows.map((row) => {
          const img = absUrl(row.imageUrl);
          return (
            <article key={row.id} className="oea-card">
              <div className="oea-card__media">
                {img ? <img src={img} alt={row.equipmentName || row.assetCode} /> : <span>{String(row.equipmentName || "E").slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="oea-card__body">
                <div className="oea-top">
                  <div>
                    <div className="oea-code">{row.assetCode}</div>
                    <div className="oea-meta">{row.equipmentName || "-"}</div>
                    <div className="oea-subMeta">{row.gymName || "-"}</div>
                  </div>
                  <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                </div>
                <div className="oea-actions">
                  <button className="oea-btn oea-btn--accent" onClick={() => openDetail(row.id)}>Xem QR</button>
                </div>
              </div>
            </article>
          );
        })}
        {!rows.length && !loading ? <div className="oea-empty">Chưa có thiết bị nào.</div> : null}
      </section>

      <section className="oea-pagination">
        <button className="oea-btn oea-btn--ghost" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trang trước</button>
        <div className="oea-pageText">Trang <b>{page}</b> / {totalPages}</div>
        <button className="oea-btn oea-btn--ghost" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Trang sau</button>
      </section>

      {selected ? (
        <div className="oea-modalOverlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="oea-modal">
            <div className="oea-modal__header">
              <div>
                <div className="oea-modal__title">{selected.equipmentName || "Thiết bị"}</div>
                <div className="oea-modal__sub">{selected.assetCode} · {selected.gymName || "-"}</div>
              </div>
              <button className="oea-btn oea-btn--ghost" onClick={() => setSelected(null)}>Đóng</button>
            </div>

            <div className="oea-qrBox">
              {selected.qrUrl ? (
                <>
                  <QRCodeCanvas value={selected.qrUrl} size={220} includeMargin />
                  <div className="oea-qrUrl">{selected.qrUrl}</div>
                </>
              ) : (
                <div className="oea-empty">Thiết bị chưa có QR. Liên hệ admin để tạo lại.</div>
              )}
            </div>

            <div className="oea-actions">
              <button className="oea-btn oea-btn--accent" onClick={() => setMaintenanceOpen(true)}>
                Gửi yêu cầu bảo trì
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {maintenanceOpen && selected ? (
        <div className="oea-modalOverlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setMaintenanceOpen(false); }}>
          <div className="oea-modal">
            <div className="oea-modal__header">
              <div>
                <div className="oea-modal__title">Yêu cầu bảo trì</div>
                <div className="oea-modal__sub">{selected.assetCode} · {selected.equipmentName || "-"}</div>
              </div>
              <button className="oea-btn oea-btn--ghost" onClick={() => setMaintenanceOpen(false)}>Đóng</button>
            </div>
            <textarea
              className="oea-input oea-input--textarea"
              placeholder="Mô tả sự cố"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
            />
            <div className="oea-actions">
              <button className="oea-btn oea-btn--accent" onClick={submitMaintenance} disabled={submitting || !String(issueDescription || "").trim()}>
                {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
              <button className="oea-btn oea-btn--ghost" onClick={() => setMaintenanceOpen(false)} disabled={submitting}>Huỷ</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

