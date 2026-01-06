import React, { useEffect, useMemo, useState } from "react";
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
    receiptDate: new Date().toISOString().slice(0, 16),
    purchaseOrderId: "",
    notes: "",
  });

  const [items, setItems] = useState([
    { equipmentId: "", receivedQuantity: 1, unitPrice: "", notes: "" },
  ]);

  const totalQty = useMemo(
    () => items.reduce((s, it) => s + Number(it.receivedQuantity || 0), 0),
    [items]
  );

  useEffect(() => {
    (async () => {
      try {
        const [s, e] = await Promise.all([
          getSuppliers({ limit: 200 }),
          getEquipments({ status: "active", limit: 200 }),
        ]);
        setSuppliers(s?.data?.data ?? s?.data ?? []);
        setEquipments(e?.data?.data ?? e?.data ?? []);
      } catch (e) {}
    })();
  }, []);

  const addRow = () => {
    setItems((prev) => [...prev, { equipmentId: "", receivedQuantity: 1, unitPrice: "", notes: "" }]);
  };

  const removeRow = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, patch) => {
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const submit = async () => {
    setErr("");

    if (!header.supplierId) return setErr("Chọn nhà cung cấp");
    const cleanItems = items
      .map((it) => ({
        equipmentId: Number(it.equipmentId),
        receivedQuantity: Number(it.receivedQuantity || 0),
        unitPrice: it.unitPrice === "" ? null : Number(it.unitPrice),
        notes: it.notes || null,
      }))
      .filter((it) => it.equipmentId && it.receivedQuantity > 0);

    if (!cleanItems.length) return setErr("Thêm ít nhất 1 dòng thiết bị hợp lệ");

    setSaving(true);
    try {
      await createReceipt({
        supplierId: Number(header.supplierId),
        receiptDate: header.receiptDate,
        purchaseOrderId: header.purchaseOrderId ? Number(header.purchaseOrderId) : null,
        notes: header.notes || null,
        items: cleanItems,
      });

      alert("Tạo phiếu nhập thành công");
      setHeader({
        supplierId: "",
        receiptDate: new Date().toISOString().slice(0, 16),
        purchaseOrderId: "",
        notes: "",
      });
      setItems([{ equipmentId: "", receivedQuantity: 1, unitPrice: "", notes: "" }]);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Nhập kho thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="imp-page">
      <div>
        <h2>Nhập kho</h2>
        <div style={{ color: "rgba(238,242,255,0.7)", fontSize: 13 }}>
          Tạo phiếu nhập (Receipt) + cập nhật tồn kho + ghi nhật ký kho
        </div>
      </div>

      {err ? <div className="imp-alert">{err}</div> : null}

      <div className="imp-card">
        <div className="imp-grid">
          <label>
            Nhà cung cấp <span className="imp-required" />
            <select
              className="imp-select"
              value={header.supplierId}
              onChange={(e) => setHeader((s) => ({ ...s, supplierId: e.target.value }))}
            >
              <option value="">-- chọn --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ngày nhập
            <input
              className="imp-input"
              type="datetime-local"
              value={header.receiptDate}
              onChange={(e) => setHeader((s) => ({ ...s, receiptDate: e.target.value }))}
            />
          </label>

          <label className="full">
            PurchaseOrderId (optional)
            <input
              className="imp-input"
              value={header.purchaseOrderId}
              placeholder="VD: 123"
              onChange={(e) => setHeader((s) => ({ ...s, purchaseOrderId: e.target.value }))}
            />
          </label>

          <label className="full">
            Ghi chú
            <textarea
              className="imp-textarea"
              rows={3}
              value={header.notes}
              placeholder="VD: nhập bổ sung tháng 1..."
              onChange={(e) => setHeader((s) => ({ ...s, notes: e.target.value }))}
            />
          </label>
        </div>

        <div className="imp-rowHead" style={{ marginTop: 14 }}>
          <h3>Danh sách thiết bị nhập</h3>
          <button className="imp-btn imp-btn--small" onClick={addRow}>
            + Thêm dòng
          </button>
        </div>

        <div className="imp-tableWrap">
          <table className="imp-table">
            <thead>
              <tr>
                <th>Thiết bị</th>
                <th>SL</th>
                <th>Đơn giá</th>
                <th>Ghi chú</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, idx) => (
                <tr key={idx}>
                  <td style={{ minWidth: 360 }}>
                    <select
                      className="imp-select"
                      value={r.equipmentId}
                      onChange={(e) => updateRow(idx, { equipmentId: e.target.value })}
                    >
                      <option value="">-- chọn --</option>
                      {equipments.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} {e.code ? `(${e.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={{ width: 110 }}>
                    <input
                      className="imp-input"
                      type="number"
                      min={1}
                      value={r.receivedQuantity}
                      onChange={(e) => updateRow(idx, { receivedQuantity: e.target.value })}
                    />
                  </td>

                  <td style={{ width: 150 }}>
                    <input
                      className="imp-input"
                      type="number"
                      min={0}
                      value={r.unitPrice}
                      placeholder="(optional)"
                      onChange={(e) => updateRow(idx, { unitPrice: e.target.value })}
                    />
                  </td>

                  <td>
                    <input
                      className="imp-input"
                      value={r.notes}
                      placeholder="(optional)"
                      onChange={(e) => updateRow(idx, { notes: e.target.value })}
                    />
                  </td>

                  <td style={{ width: 120 }}>
                    <div className="imp-tableActions">
                      <button
                        className="imp-btn imp-btn--danger imp-btn--small"
                        onClick={() => removeRow(idx)}
                        disabled={items.length <= 1}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="imp-actions">
          <div style={{ color: "rgba(238,242,255,0.75)", marginRight: "auto" }}>
            Tổng SL: <b>{totalQty}</b>
          </div>
          <button className="imp-btn imp-btn--primary" onClick={submit} disabled={saving}>
            {saving ? "Đang lưu..." : "Tạo phiếu nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
