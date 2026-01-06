import React, { useEffect, useMemo, useState } from "react";
import "./ExportPage.css";

import {
  createExport,
  getEquipments,
  getStocks,
} from "../../../services/equipmentSupplierInventoryService";

export default function ExportPage() {
  const [equipments, setEquipments] = useState([]);
  const [stocks, setStocks] = useState([]);

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    equipmentId: "",
    quantity: 1,
    reason: "other",
    notes: "",
    gymId: "", // optional (đợt 1 có thể bỏ, BE sẽ default)
  });

  useEffect(() => {
    (async () => {
      try {
        const e = await getEquipments({ status: "active", limit: 200 });
        setEquipments(e?.data?.data ?? e?.data ?? []);

        const s = await getStocks({ limit: 500 });
        setStocks(s?.data?.data ?? s?.data ?? []);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || "Không load được dữ liệu");
      }
    })();
  }, []);

  const stockByEq = useMemo(() => {
    const m = new Map();
    for (const st of stocks) {
      const key = String(st.equipmentId);
      // nếu có nhiều gym, bạn có thể nâng cấp sau: key = `${gymId}-${equipmentId}`
      m.set(key, st);
    }
    return m;
  }, [stocks]);

  const submit = async () => {
    setErr("");

    if (!form.equipmentId) return setErr("Chọn thiết bị");
    if (Number(form.quantity || 0) <= 0) return setErr("Số lượng phải > 0");

    const payload = {
      equipmentId: Number(form.equipmentId),
      quantity: Number(form.quantity),
      reason: form.reason || "other",
      notes: form.notes || null,
      gymId: form.gymId ? Number(form.gymId) : undefined, // optional
    };

    setSaving(true);
    try {
      await createExport(payload);
      alert("Xuất kho thành công");

      const s = await getStocks({ limit: 500 });
      setStocks(s?.data?.data ?? s?.data ?? []);

      setForm((x) => ({ ...x, quantity: 1, notes: "" }));
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Xuất kho thất bại");
    } finally {
      setSaving(false);
    }
  };

  const currentStock = stockByEq.get(String(form.equipmentId));
  const available =
    currentStock?.availableQuantity ??
    currentStock?.available ??
    0;

  return (
    <div className="exp-page">
      <div className="exp-head">
        <h2 className="exp-title">Xuất kho</h2>
        <div className="exp-sub">Giảm tồn kho (EquipmentStock) + ghi nhật ký (Inventory export)</div>
      </div>

      {err ? <div className="alert">{err}</div> : null}

      <div className="card">
        <div className="grid">
          <div>
            <div className="label">Thiết bị</div>
            <select
              className="select"
              value={form.equipmentId}
              onChange={(e) => setForm((s) => ({ ...s, equipmentId: e.target.value }))}
            >
              <option value="">-- Chọn --</option>
              {equipments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.code ? `(${e.code})` : ""}
                </option>
              ))}
            </select>
            <div className="hint">Available: {available}</div>
          </div>

          <div>
            <div className="label">Số lượng xuất</div>
            <input
              className="input"
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))}
            />
          </div>

          <div>
            <div className="label">Lý do</div>
            <select
              className="select"
              value={form.reason}
              onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
            >
              <option value="other">other</option>
              <option value="transfer_out">transfer_out</option>
              <option value="maintenance">maintenance</option>
              <option value="damaged">damaged</option>
              <option value="lost">lost</option>
              <option value="adjustment">adjustment</option>
            </select>
          </div>

          <div className="gridFull">
            <div className="label">Ghi chú</div>
            <textarea
              className="textarea"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              placeholder="VD: xuất cho chi nhánh / cho bảo trì..."
            />
          </div>
        </div>

        <div className="actions">
          <button className="btn" disabled={saving} onClick={submit}>
            {saving ? "Đang lưu..." : "Xuất kho"}
          </button>
        </div>
      </div>
    </div>
  );
}
