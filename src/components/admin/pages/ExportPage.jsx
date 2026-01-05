import React, { useEffect, useState } from "react";
import "./ExportPage.css";

import {
  createExport,
  getEquipments,
} from "../../../services/equipmentSupplierInventoryService";


export default function ExportPage() {
  const [equipments, setEquipments] = useState([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    equipmentId: "",
    quantity: 1,
    reason: "other",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const e = await getEquipments({ status: "active", limit: 200 });
        setEquipments(e?.data?.data ?? e?.data ?? []);
      } catch (e) {}
    })();
  }, []);

  const submit = async () => {
    setErr("");
    if (!form.equipmentId) return setErr("Chọn thiết bị");
    if (Number(form.quantity || 0) <= 0) return setErr("Số lượng phải > 0");

    setSaving(true);
    try {
      await createExport({
        equipmentId: Number(form.equipmentId),
        quantity: Number(form.quantity),
        reason: form.reason,
        notes: form.notes || null,
      });
      alert("Xuất kho thành công");
      setForm({ equipmentId: "", quantity: 1, reason: "other", notes: "" });
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Xuất kho thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="exp-page">
      <h2>Xuất kho (đợt 1)</h2>
      {err ? <div className="alert">{err}</div> : null}

      <div className="card">
        <label>
          Thiết bị *
          <select className="select" value={form.equipmentId}
            onChange={(e) => setForm((s) => ({ ...s, equipmentId: e.target.value }))}>
            <option value="">-- chọn --</option>
            {equipments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} {e.code ? `(${e.code})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          Số lượng *
          <input className="input" type="number" min={1} value={form.quantity}
            onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))}/>
        </label>

        <label>
          Lý do
          <select className="select" value={form.reason}
            onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}>
            <option value="other">other</option>
            <option value="damaged">damaged</option>
            <option value="lost">lost</option>
            <option value="maintenance">maintenance</option>
            <option value="transfer_out">transfer_out</option>
            <option value="adjustment">adjustment</option>
          </select>
        </label>

        <label>
          Ghi chú
          <textarea className="textarea" rows={3} value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}/>
        </label>

        <div className="actions">
          <button className="btn primary" onClick={submit} disabled={saving}>
            {saving ? "Đang lưu..." : "Xuất kho"}
          </button>
        </div>
      </div>
    </div>
  );
}
