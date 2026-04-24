import React, { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import equipmentAssetService from "../../../services/equipmentAssetService";
import axios from "../../../setup/axios";
import "./EquipmentAssetsPage.css";

const statusLabel = (s) =>
  ({
    active: "Đang hoạt động",
    maintenance: "Đang bảo trì",
    broken: "Bị hỏng",
    retired: "Ngừng sử dụng",
  }[String(s || "").toLowerCase()] || s || "-");

const statusClass = (s) => `ea-badge ea-badge--${String(s || "active").toLowerCase()}`;
const money = (v) => Number(v || 0).toLocaleString("vi-VN");

export default function EquipmentAssetsPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, maintenance: 0, broken: 0, retired: 0, noQr: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [missingQr, setMissingQr] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });

  const [selected, setSelected] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const API_HOST = String(axios?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "http://localhost:8080").replace(/\/+$/, "");
  const absUrl = (value) => (value ? (String(value).startsWith("http") || String(value).startsWith("data:") ? String(value) : `${API_HOST}${value}`) : "");

  const totalPages = useMemo(() => {
    const t = Number(meta.total || 0);
    const l = Math.max(1, Number(meta.limit || limit || 20));
    return Math.max(1, Math.ceil(t / l) || 1);
  }, [meta.total, meta.limit, limit]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextMissing = ["1", "true", "yes", "y", "on"].includes(String(params.get("missingQr") || "").toLowerCase());
    if (nextMissing) setMissingQr(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listRes, sumRes] = await Promise.all([
        equipmentAssetService.adminList({ q, status, page, limit, missingQr: missingQr ? 1 : undefined }),
        equipmentAssetService.adminSummary({}),
      ]);
      setRows(listRes?.data?.data || []);
      setMeta({
        page: Number(listRes?.data?.meta?.page || page || 1),
        limit: Number(listRes?.data?.meta?.limit || limit || 20),
        total: Number(listRes?.data?.meta?.total || 0),
      });
      setSummary(sumRes?.data?.data || summary);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [q, status, page, limit, missingQr]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, status, missingQr]);

  const openDetail = async (id) => {
    setQrLoading(true);
    setError("");
    try {
      const [detailRes, qrRes] = await Promise.all([
        equipmentAssetService.adminDetail(id),
        equipmentAssetService.adminGetQr(id),
      ]);
      const detail = detailRes?.data?.data || null;
      const qr = qrRes?.data?.data || {};
      setSelected({ ...detail, ...qr });
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setQrLoading(false);
    }
  };

  const regenerateQr = async () => {
    if (!selected?.id) return;
    setQrLoading(true);
    setError("");
    try {
      const res = await equipmentAssetService.adminRegenerateQr(selected.id);
      const next = res?.data?.data || null;
      setSelected((prev) => (prev ? { ...prev, ...next } : prev));
      load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setQrLoading(false);
    }
  };

  const downloadQrPng = () => {
    const canvas = document.getElementById("ea-qr-canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected?.assetCode || "QR"}.png`;
    a.click();
  };

  return (
    <div className="ea-page">
      <section className="ea-hero">
        <div>
          <div className="ea-kicker">Thiết bị & QR</div>
          <h2>Tài sản thiết bị</h2>
          <p>Quản lý vòng đời thiết bị thực tế (mỗi thiết bị có mã riêng + QR public để quét).</p>
        </div>
        <div className="ea-stats">
          <div className="ea-stat"><span>Tổng thiết bị</span><strong>{summary.total || 0}</strong></div>
          <div className="ea-stat"><span>Đang hoạt động</span><strong>{summary.active || 0}</strong></div>
          <div className="ea-stat"><span>Đang bảo trì</span><strong>{summary.maintenance || 0}</strong></div>
          <div className="ea-stat"><span>Bị hỏng</span><strong>{summary.broken || 0}</strong></div>
          <div className="ea-stat"><span>Ngừng sử dụng</span><strong>{summary.retired || 0}</strong></div>
        </div>
      </section>

      <section className="ea-toolbar">
        <input className="ea-input" placeholder="Tìm theo mã asset / tên thiết bị / gym / owner..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="ea-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">active</option>
          <option value="maintenance">maintenance</option>
          <option value="broken">broken</option>
          <option value="retired">retired</option>
        </select>
        <label className="ea-toggle">
          <input type="checkbox" checked={missingQr} onChange={(e) => setMissingQr(e.target.checked)} />
          <span>Thiếu QR</span>
        </label>
        <select className="ea-input" value={limit} onChange={(e) => setLimit(Number(e.target.value || 20))}>
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>{n} / trang</option>
          ))}
        </select>
        <button className="ea-btn" onClick={() => load()} disabled={loading}>Tìm</button>
      </section>

      {error ? <div className="ea-alert">{error}</div> : null}
      {loading ? <div className="ea-empty">Đang tải dữ liệu...</div> : null}

      <section className="ea-list">
        {rows.map((row) => {
          const img = absUrl(row.imageUrl);
          return (
            <article key={row.id} className="ea-card">
              <div className="ea-card__media">
                {img ? <img src={img} alt={row.equipmentName || row.assetCode} /> : <span>{String(row.equipmentName || "E").slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="ea-card__body">
                <div className="ea-card__top">
                  <div>
                    <div className="ea-code">{row.assetCode}</div>
                    <div className="ea-meta">{row.equipmentName || "-"} · {row.gymName || "-"}</div>
                    <div className="ea-subMeta">Owner: {row.owner?.username || row.owner?.email || "-"}</div>
                  </div>
                  <div className="ea-card__right">
                    <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                    <span className={`ea-chip ${row.publicToken ? "" : "is-warn"}`}>{row.publicToken ? "Có QR" : `Chưa có QR (${summary.noQr || 0})`}</span>
                  </div>
                </div>

                <div className="ea-actions">
                  <button className="ea-btn ea-btn--ghost" onClick={() => openDetail(row.id)}>Xem chi tiết</button>
                  <button className="ea-btn ea-btn--accent" onClick={() => openDetail(row.id)}>QR</button>
                </div>
              </div>
            </article>
          );
        })}
        {!rows.length && !loading ? <div className="ea-empty">Chưa có asset nào.</div> : null}
      </section>

      <section className="ea-pagination">
        <button className="ea-btn ea-btn--ghost" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trang trước</button>
        <div className="ea-pageText">Trang <b>{page}</b> / {totalPages}</div>
        <button className="ea-btn ea-btn--ghost" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Trang sau</button>
      </section>

      {selected ? (
        <div className="ea-modalOverlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="ea-modal">
            <div className="ea-modal__header">
              <div>
                <div className="ea-modal__title">{selected.equipmentName || "Thiết bị"}</div>
                <div className="ea-modal__sub">{selected.assetCode} · {selected.gymName || "-"}</div>
              </div>
              <button className="ea-btn ea-btn--ghost" onClick={() => setSelected(null)}>Đóng</button>
            </div>

            <div className="ea-modal__grid">
              <div className="ea-modal__info">
                <div className="ea-kv"><span>Owner</span><b>{selected.owner?.username || selected.owner?.email || "-"}</b></div>
                <div className="ea-kv"><span>Trạng thái</span><b>{statusLabel(selected.status)}</b></div>
                <div className="ea-kv"><span>Ngày bàn giao</span><b>{selected.deliveredAt ? new Date(selected.deliveredAt).toLocaleString("vi-VN") : "-"}</b></div>
              </div>

              <div className="ea-modal__qr">
                <div className="ea-qrBox">
                  {qrLoading ? <div className="ea-empty">Đang tải QR...</div> : null}
                  {!qrLoading && selected.qrUrl ? (
                    <>
                      <QRCodeCanvas id="ea-qr-canvas" value={selected.qrUrl} size={220} includeMargin />
                      <div className="ea-qrUrl">{selected.qrUrl}</div>
                    </>
                  ) : null}
                  {!qrLoading && !selected.qrUrl ? <div className="ea-empty">Asset chưa có QR. Bạn có thể tạo lại.</div> : null}
                </div>
                <div className="ea-modal__qrActions">
                  <button className="ea-btn ea-btn--accent" onClick={downloadQrPng} disabled={!selected.qrUrl}>Tải QR (PNG)</button>
                  <button className="ea-btn" onClick={() => window.print()} disabled={!selected.qrUrl}>In QR</button>
                  <button className="ea-btn ea-btn--ghost" onClick={regenerateQr} disabled={qrLoading}>Tạo lại QR</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

