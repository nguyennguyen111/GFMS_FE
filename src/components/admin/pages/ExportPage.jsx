import React, { useEffect, useMemo, useState } from "react";
import "./ExportPage.css";

import { createExport, getStocks } from "../../../services/equipmentSupplierInventoryService";

export default function ExportPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [stocks, setStocks] = useState([]);
  const [q, setQ] = useState("");

  const [gymId, setGymId] = useState("1");
  const [stockId, setStockId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("other");
  const [notes, setNotes] = useState("");

  const loadStocks = async () => {
    try {
      setErr("");
      const res = await getStocks({ page: 1, limit: 200, q });
      setStocks(res?.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Load stocks failed");
    }
  };

  useEffect(() => {
    loadStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => stocks || [], [stocks]);
  const selected = useMemo(() => options.find((s) => String(s.id) === String(stockId)), [options, stockId]);

  const onSubmit = async () => {
    try {
      setLoading(true);
      setErr("");

      if (!stockId) throw new Error("Chọn 1 dòng tồn kho trước");
      const s = selected;
      if (!s) throw new Error("Stock not found");

      const payload = {
        gymId: Number(gymId) || Number(s.gymId) || 1,
        equipmentId: Number(s.equipmentId),
        quantity: Number(quantity),
        reason,
        notes: notes || null,
      };

      await createExport(payload);
      alert("Xuất kho thành công!");
      setQuantity(1);
      setNotes("");
      await loadStocks();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ex-wrap">
      <div className="ex-head">
        <div>
          <h2 className="ex-title">Xuất kho</h2>
          <div className="ex-sub">Giảm tồn kho (EquipmentStock) + ghi nhật ký (Inventory)</div>
        </div>
      </div>

      {err ? <div className="ex-alert">{err}</div> : null}

      <div className="ex-card">
        <div className="ex-row">
          <input
            className="ex-input"
            placeholder="Tìm theo thiết bị / mã / gym..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="ex-btn ex-btn--ghost" onClick={loadStocks}>Tải lại</button>
        </div>

        <div className="ex-grid">
          <div className="ex-field">
            <label>Dòng tồn kho</label>
            <select value={stockId} onChange={(e) => setStockId(e.target.value)}>
              <option value="">-- Chọn --</option>
              {options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.gymName || `Gym ${s.gymId}`} • {s.equipmentName || `EQ ${s.equipmentId}`} ({s.equipmentCode || "—"}) • Avail: {s.availableQuantity}
                </option>
              ))}
            </select>
          </div>

          <div className="ex-field">
            <label>GymId</label>
            <input value={gymId} onChange={(e) => setGymId(e.target.value)} placeholder="1" />
          </div>

          <div className="ex-field">
            <label>Số lượng xuất</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <div className="ex-hint">Available: {selected ? selected.availableQuantity : "—"}</div>
          </div>

          <div className="ex-field">
            <label>Lý do</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="other">other</option>
              <option value="adjustment">adjustment</option>
              <option value="transfer_out">transfer_out</option>
              <option value="transfer">transfer</option>
            </select>
          </div>

          <div className="ex-field ex-field--full">
            <label>Ghi chú</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="VD: xuất cấp cho chi nhánh..." />
          </div>
        </div>

        <div className="ex-footer">
          <button className="ex-btn ex-btn--primary" onClick={onSubmit} disabled={loading}>
            {loading ? "Đang xử lý..." : "Xuất kho"}
          </button>
        </div>
      </div>
    </div>
  );
}
