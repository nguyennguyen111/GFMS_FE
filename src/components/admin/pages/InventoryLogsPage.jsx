import React, { useEffect, useMemo, useState } from "react";
import "./InventoryLogsPage.css";

import { getInventoryLogs } from "../../../services/equipmentSupplierInventoryService";

export default function InventoryLogsPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [transactionType, setTransactionType] = useState("all");

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 50, totalItems: 0, totalPages: 1 });

  const load = async (page = 1) => {
    try {
      setLoading(true);
      setErr("");

      const res = await getInventoryLogs({
        page,
        limit: meta.limit,
        q,
        transactionType: transactionType === "all" ? undefined : transactionType,
      });

      setRows(res?.data || []);
      setMeta(res?.meta || { page: 1, limit: 50, totalItems: 0, totalPages: 1 });
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Load logs failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.totalPages;

  const showRows = useMemo(() => rows || [], [rows]);

  const formatDateTime = (v) => {
  if (!v) return "—";

  const pad = (n) => String(n).padStart(2, "0");

  const format = (d) =>
    `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  // Date object
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return String(v);
    return format(v);
  }

  if (typeof v === "string") {
    // Date-only: YYYY-MM-DD → DD-MM-YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split("-");
      return `${d}-${m}-${y}`;
    }

    // ISO string: YYYY-MM-DDTHH:mm:ss → DD-MM-YYYY HH:mm:ss
    const isoMatch = v.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})/
    );
    if (isoMatch) {
      const [, y, m, d, time] = isoMatch;
      return `${d}-${m}-${y} ${time}`;
    }

    // Fallback parse
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return format(d);
    }

    return String(v);
  }

  return String(v);
};

  return (
    <div className="il-wrap">
      <div className="il-head">
        <div>
          <h2 className="il-title">Nhật ký kho</h2>
          <div className="il-sub">Lịch sử nhập/xuất/điều chỉnh tồn kho (inventory)</div>
        </div>
      </div>

      {err ? <div className="il-alert">{err}</div> : null}

      <div className="il-card">
        <div className="il-filters">
          <input
            className="il-input"
            placeholder="Tìm theo thiết bị / gym / action / ref / notes / user..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select className="il-select" value={transactionType} onChange={(e) => setTransactionType(e.target.value)}>
            <option value="all">Tất cả action</option>
            <option value="purchase">purchase</option>
            <option value="adjustment">adjustment</option>
            <option value="transfer_out">transfer_out</option>
            <option value="transfer_in">transfer_in</option>
          </select>

          <button className="il-btn il-btn--primary" onClick={() => load(1)} disabled={loading}>
            {loading ? "..." : "Tìm"}
          </button>
        </div>

        <div className="il-table">
          <div className="il-row il-row--head">
            <div>ID</div>
            <div>Thời gian</div>
            <div>Gym</div>
            <div>Thiết bị</div>
            <div>Action</div>
            <div>Qty</div>
            <div>Before</div>
            <div>After</div>
            <div>Người thao tác</div>
            <div>Notes</div>
            <div>Ref</div>
          </div>

          {showRows.length === 0 ? (
            <div className="il-empty">Không có dữ liệu</div>
          ) : (
            showRows.map((r) => (
              <div className="il-row" key={r.id}>
                <div>{r.id}</div>
                <div>{formatDateTime(r.recordeat || r.updatedAt)}</div>
                <div>{r.gymName || `Gym ${r.gymId}`}</div>
                <div>
                  {r.equipmentName || `EQ ${r.equipmentId}`}{" "}
                  <span className="il-dim">({r.equipmentCode || "—"})</span>
                </div>
                <div>
                  <span className="il-pill">{r.transactionType}</span>
                </div>
                <div>{r.quantity}</div>
                <div>{r.stockBefore}</div>
                <div>{r.stockAfter}</div>
                <div className="il-dim">{r.recordedByName || r.recordedByEmail || (r.recordedBy ? `User ${r.recordedBy}` : "—")}</div>
                <div className="il-notes">{r.notes || "—"}</div>
                <div className="il-dim">{r.transactionCode || "—"}</div>
              </div>
            ))
          )}
        </div>

        <div className="il-paging">
          <button className="il-btn" disabled={!canPrev || loading} onClick={() => load(meta.page - 1)}>
            ← Trước
          </button>
          <div className="il-page">
            Trang {meta.page} / {meta.totalPages}
          </div>
          <button className="il-btn" disabled={!canNext || loading} onClick={() => load(meta.page + 1)}>
            Sau →
          </button>
        </div>
      </div>
    </div>
  );
}
