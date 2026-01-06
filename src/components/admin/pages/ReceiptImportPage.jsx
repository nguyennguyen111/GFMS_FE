import React, { useEffect, useState } from "react";
import "./ReceiptImportPage.css";

import {
  createReceipt,
  getEquipments,
} from "../../../services/equipmentSupplierInventoryService";

export default function ReceiptImportPage() {
  const [equipments, setEquipments] = useState([]);
  const [err, setErr] = useState("");
  const [gymId, setGymId] = useState(1);

  const [header, setHeader] = useState({
    receiptNumber: "",
    receiptDate: "",
    notes: "",
  });

  const [items, setItems] = useState([
    { equipmentId: "", receivedQuantity: 1, unitPrice: 0, condition: "good", notes: "" },
  ]);

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

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { equipmentId: "", receivedQuantity: 1, unitPrice: 0, condition: "good", notes: "" },
    ]);
  };

  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  };

  const submit = async () => {
    setErr("");
    try {
      if (!gymId) throw new Error("gymId is required");
      if (!items.length) throw new Error("items is required");
      if (items.some((it) => !it.equipmentId)) throw new Error("Chọn thiết bị cho tất cả dòng");

      const receiptDateISO =
        header.receiptDate && header.receiptDate.trim()
          ? new Date(header.receiptDate).toISOString()
          : new Date().toISOString();

      const payload = {
        gymId: Number(gymId),
        receiptNumber: header.receiptNumber || undefined,
        receiptDate: receiptDateISO,
        notes: header.notes || undefined,
        status: "received",
        items: items.map((it) => ({
          equipmentId: Number(it.equipmentId),
          receivedQuantity: Number(it.receivedQuantity),
          unitPrice: Number(it.unitPrice || 0),
          condition: it.condition || "good",
          notes: it.notes || undefined,
        })),
      };

      await createReceipt(payload);
      alert("Nhập kho thành công!");
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Import failed");
    }
  };

  return (
    <div className="rc-page">
      <h2>Nhập kho</h2>

      {err ? <div className="alert">{err}</div> : null}

      <div className="rc-grid">
        <label>
          Gym ID *
          <input value={gymId} onChange={(e) => setGymId(e.target.value)} />
        </label>

        <label>
          Số phiếu
          <input
            value={header.receiptNumber}
            onChange={(e) => setHeader((s) => ({ ...s, receiptNumber: e.target.value }))}
          />
        </label>

        <label>
          Ngày nhập
          <input
            type="datetime-local"
            value={header.receiptDate}
            onChange={(e) => setHeader((s) => ({ ...s, receiptDate: e.target.value }))}
          />
        </label>

        <label className="full">
          Ghi chú
          <input
            value={header.notes}
            onChange={(e) => setHeader((s) => ({ ...s, notes: e.target.value }))}
          />
        </label>
      </div>

      <hr />

      {items.map((it, idx) => (
        <div key={idx} className="rc-row">
          <select value={it.equipmentId} onChange={(e) => updateItem(idx, "equipmentId", e.target.value)}>
            <option value="">Chọn thiết bị</option>
            {equipments.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            value={it.receivedQuantity}
            onChange={(e) => updateItem(idx, "receivedQuantity", e.target.value)}
            placeholder="Số lượng"
          />

          <input
            type="number"
            min={0}
            value={it.unitPrice}
            onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
            placeholder="Đơn giá"
          />

          <select value={it.condition} onChange={(e) => updateItem(idx, "condition", e.target.value)}>
            <option value="good">good</option>
            <option value="damaged">damaged</option>
            <option value="defective">defective</option>
            <option value="missing_parts">missing_parts</option>
          </select>

          <input value={it.notes} onChange={(e) => updateItem(idx, "notes", e.target.value)} placeholder="Ghi chú" />
        </div>
      ))}

      <div style={{ marginTop: 12 }}>
        <button className="btn" onClick={addRow}>+ Thêm dòng</button>
        <button className="btn primary" onClick={submit} style={{ marginLeft: 10 }}>Nhập kho</button>
      </div>
    </div>
  );
}
