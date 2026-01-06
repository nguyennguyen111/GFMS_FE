import React, { useEffect, useState } from "react";
import "./ExportPage.css";

import {
  getEquipments,
  createExport,
} from "../../../services/equipmentSupplierInventoryService";

export default function ExportPage() {
  const [equipments, setEquipments] = useState([]);
  const [err, setErr] = useState("");
  const [gymId, setGymId] = useState(1);

  const [form, setForm] = useState({
    equipmentId: "",
    quantity: 1,
    reason: "other",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await getEquipments({ limit: 200 });
        const data = res?.data?.data ?? res?.data ?? [];
        setEquipments(Array.isArray(data) ? data : data.items ?? []);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || "Load failed");
      }
    })();
  }, []);

  const submit = async () => {
    setErr("");
    try {
      if (!gymId) throw new Error("gymId is required");
      if (!form.equipmentId) throw new Error("Chọn thiết bị");
      if (Number(form.quantity) <= 0) throw new Error("quantity must be > 0");

      const payload = {
        gymId: Number(gymId),
        equipmentId: Number(form.equipmentId),
        quantity: Number(form.quantity),
        reason: form.reason || "other",
        notes: form.notes || undefined,
      };

      await createExport(payload);
      alert("Xuất kho thành công!");
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Export failed");
    }
  };

  return (
    <div className="ex-page">
      <h2>Xuất kho</h2>
      {err ? <div className="alert">{err}</div> : null}

      <div className="ex-grid">
        <label>
          Gym ID *
          <input value={gymId} onChange={(e) => setGymId(e.target.value)} />
        </label>

        <label>
          Thiết bị *
          <select
            value={form.equipmentId}
            onChange={(e) => setForm((s) => ({ ...s, equipmentId: e.target.value }))}
          >
            <option value="">Chọn thiết bị</option>
            {equipments.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Số lượng *
          <input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))}
          />
        </label>

        <label>
          Lý do
          <input
            value={form.reason}
            onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
          />
        </label>

        <label className="full">
          Ghi chú
          <input
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
          />
        </label>
      </div>

      <button className="btn primary" onClick={submit} style={{ marginTop: 12 }}>
        Xuất kho
      </button>
    </div>
  );
}
