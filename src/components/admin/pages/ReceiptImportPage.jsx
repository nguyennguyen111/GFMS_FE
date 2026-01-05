import React, { useEffect, useState } from "react";
import "./ReceiptImportPage.css";

import {
  createReceipt,
  getEquipments,
  getSuppliers,
} from "../../../services/equipmentSupplierInventoryService";

export default function ReceiptImportPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [equipments, setEquipments] = useState([]);

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [header, setHeader] = useState({
    supplierId: "",
    receiptDate: "",
    notes: "",
    purchaseOrderId: "", // optional
  });

  const [rows, setRows] = useState([
    { equipmentId: "", receivedQuantity: 1, unitPrice: "", notes: "" },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSuppliers({ isActive: true });
        setSuppliers(s?.data?.data ?? s?.data ?? []);
        const e = await getEquipments({ status: "active", limit: 200 });
        setEquipments(e?.data?.data ?? e?.data ?? []);
      } catch (e) {}
    })();
  }, []);

  const addRow = () => setRows((r) => [...r, { equipmentId: "", receivedQuantity: 1, unitPrice: "", notes: "" }]);
  const removeRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));

  const updateRow = (idx, patch) => {
    setRows((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const submit = async () => {
    setErr("");
    if (!header.supplierId) return setErr("Chọn nhà cung cấp");
    if (rows.some((r) => !r.equipmentId)) return setErr("Chọn thiết bị cho tất cả dòng");
    if (rows.some((r) => Number(r.receivedQuantity || 0) <= 0)) return setErr("Số lượng phải > 0");

    const payload = {
      supplierId: Number(header.supplierId),
      receiptDate: header.receiptDate || new Date().toISOString(),
      purchaseOrderId: header.purchaseOrderId ? Number(header.purchaseOrderId) : null,
      notes: header.notes || null,
      items: rows.map((r) => ({
        equipmentId: Number(r.equipmentId),
        receivedQuantity: Number(r.receivedQuantity),
        unitPrice: r.unitPrice === "" ? null : Number(r.unitPrice),
        notes: r.notes || null,
      })),
    };

    setSaving(true);
    try {
      await createReceipt(payload);
      alert("Nhập kho thành công");
      setHeader({ supplierId: "", receiptDate: "", notes: "", purchaseOrderId: "" });
      setRows([{ equipmentId: "", receivedQuantity: 1, unitPrice: "", notes: "" }]);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Nhập kho thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="imp-page">
      <h2>Nhập kho</h2>

      {err ? <div className="alert">{err}</div> : null}

      <div className="card">
        <div className="grid">
          <label>
            Nhà cung cấp *
            <select className="select" value={header.supplierId}
              onChange={(e) => setHeader((s) => ({ ...s, supplierId: e.target.value }))}>
              <option value="">-- chọn --</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <label>
            Ngày nhập
            <input className="input" type="datetime-local" value={header.receiptDate}
              onChange={(e) => setHeader((s) => ({ ...s, receiptDate: e.target.value }))}/>
          </label>

          <label>
            PurchaseOrderId (nếu có)
            <input className="input" value={header.purchaseOrderId}
              onChange={(e) => setHeader((s) => ({ ...s, purchaseOrderId: e.target.value }))}/>
          </label>

          <label className="full">
            Ghi chú
            <textarea className="textarea" rows={3} value={header.notes}
              onChange={(e) => setHeader((s) => ({ ...s, notes: e.target.value }))}/>
          </label>
        </div>
      </div>

      <div className="card">
        <div className="row-head">
          <h3>Danh sách nhập</h3>
          <button className="btn" onClick={addRow}>+ Thêm dòng</button>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 360 }}>Thiết bị</th>
                <th style={{ width: 120 }}>Số lượng</th>
                <th style={{ width: 160 }}>Đơn giá</th>
                <th>Ghi chú</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td>
                    <select className="select" value={r.equipmentId}
                      onChange={(e) => updateRow(idx, { equipmentId: e.target.value })}>
                      <option value="">-- chọn --</option>
                      {equipments.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} {e.code ? `(${e.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input className="input" type="number" min={1} value={r.receivedQuantity}
                      onChange={(e) => updateRow(idx, { receivedQuantity: e.target.value })}/>
                  </td>
                  <td>
                    <input className="input" type="number" min={0} value={r.unitPrice}
                      onChange={(e) => updateRow(idx, { unitPrice: e.target.value })}/>
                  </td>
                  <td>
                    <input className="input" value={r.notes}
                      onChange={(e) => updateRow(idx, { notes: e.target.value })}/>
                  </td>
                  <td>
                    <button className="btn small danger" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="actions">
          <button className="btn primary" onClick={submit} disabled={saving}>
            {saving ? "Đang lưu..." : "Nhập kho"}
          </button>
        </div>
      </div>
    </div>
  );
}
