import React, { useEffect, useMemo, useState } from "react";
import "./ExportPage.css";

import { createExport, getStocks, getGyms } from "../../../services/equipmentSupplierInventoryService";

export default function ExportPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [gyms, setGyms] = useState([]);
  const [gymId, setGymId] = useState("");

  const [stocks, setStocks] = useState([]);
  const [q, setQ] = useState("");

  const [stockId, setStockId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("adjustment");
  const [notes, setNotes] = useState("");

  const loadGyms = async () => {
    const res = await getGyms();
    setGyms(res?.data || []);
    const first = String((res?.data || [])?.[0]?.id || "");
    setGymId(first);
  };

  const loadStocks = async (nextGymId) => {
    try {
      setErr("");
      const res = await getStocks({ page: 1, limit: 200, q, gymId: nextGymId || gymId || undefined });
      setStocks(res?.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Tải tồn kho thất bại");
    }
  };

  useEffect(() => {
    (async () => {
      await loadGyms();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gymId) loadStocks(gymId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  const options = useMemo(() => stocks || [], [stocks]);
  const selected = useMemo(() => options.find((s) => String(s.id) === String(stockId)), [options, stockId]);

  const onSubmit = async () => {
    try {
      setLoading(true);
      setErr("");

      if (!gymId) throw new Error("Bạn phải chọn phòng gym");
      if (!stockId) throw new Error("Chọn một dòng tồn kho trước");
      if (!selected) throw new Error("Không tìm thấy dòng tồn kho");

      const payload = {
        gymId: Number(gymId),
        equipmentId: Number(selected.equipmentId),
        quantity: Number(quantity),
        reason,
        notes: notes || null,
      };

      await createExport(payload);
      alert("Xuất kho thành công!");
      setQuantity(1);
      setNotes("");
      await loadStocks(gymId);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Xuất kho thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ex-wrap">
      <div className="ex-head">
        <div>
          <h2 className="ex-title">Xuất kho</h2>
          <div className="ex-sub">Giảm tồn kho thiết bị và ghi nhật ký kho</div>
        </div>
      </div>

      {err ? <div className="ex-alert">{err}</div> : null}

      <div className="ex-card">
        <div className="ex-row">
          <select className="ex-select" value={gymId} onChange={(e) => setGymId(e.target.value)}>
            <option value="">-- Chọn phòng gym --</option>
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <input className="ex-input" placeholder="Tìm theo thiết bị / mã..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="ex-btn ex-btn--ghost" onClick={() => loadStocks(gymId)}>
            Tải lại
          </button>
        </div>

        <div className="ex-grid">
          <div className="ex-field">
            <label>Dòng tồn kho</label>
            <select value={stockId} onChange={(e) => setStockId(e.target.value)}>
              <option value="">-- Chọn --</option>
              {options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.equipmentName || `Thiết bị ${s.equipmentId}`} ({s.equipmentCode || "—"}) • Khả dụng:{" "}
                  {s.availableQuantity}
                </option>
              ))}
            </select>
          </div>

          <div className="ex-field">
            <label>Số lượng xuất</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <div className="ex-hint">Khả dụng: {selected ? selected.availableQuantity : "—"}</div>
          </div>

          <div className="ex-field">
            <label>Lý do</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="adjustment">Điều chỉnh</option>
              <option value="other">Khác</option>
              <option value="transfer_out">Chuyển đi</option>
            </select>
          </div>

          <div className="ex-field ex-field--full">
            <label>Ghi chú</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="VD: hỏng, mất, thanh lý..." />
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
