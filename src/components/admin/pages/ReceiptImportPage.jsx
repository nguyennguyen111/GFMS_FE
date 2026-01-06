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
    receiptDate: "",
    notes: "",
    purchaseOrderId: "",
  });

  const [rows, setRows] = useState([
    { equipmentId: "", receivedQuantity: 1, unitPrice: "", notes: "" },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSuppliers({ isActive: true, limit: 200 });
        setSuppliers(s?.data?.data ?? s?.data ?? []);

        const e = await getEquipments({ status: "active", limit: 200 });
        setEquipments(e?.data?.data ?? e?.data ?? []);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || "Không load được dữ liệu");
      }
    })();
  }, []);

  const equipmentMap = useMemo(() => {
    const m = new Map();
    for (const it of equipments) m.set(String(it.id), it);
    return m;
  }, [equipments]);

  const addRow = () =>
    setRows((r) => [...r, { equipmentId: "", receivedQuantity: 1, unitPrice: "", notes: "" }]);

  const removeRow = (idx) =>
    setRows((r) => r.filter((_, i) => i !== idx));

  const updateRow = (idx, patch) => {
    setRows((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const submit = async () => {
    setErr("");

    if (!header.supplierId) return setErr("Chọn nhà cung cấp");
    if (rows.some((r) => !r.equipmentId)) return setErr("Chọn thiết bị cho tất cả dòng");
    if (rows.some((r) => Number(r.receivedQuantity || 0) <= 0)) return setErr("Số lượng phải > 0");

    const payload = {
      supplierId: Number(header.supplierId), // BE có thể ignore (đợt 1)
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
      <div className="imp-head">
        <h2 className="imp-title">Nhập kho</h2>
        <div className="imp-sub">Tạo phiếu nhập (Receipt) + cập nhật tồn kho + ghi nhật ký</div>
      </div>

      {err ? <div className="imp-alert">{err}</div> : null}

      <div className="imp-card">
        <div className="imp-grid">
          <div>
            <div className="imp-label">Nhà cung cấp</div>
            <select
              className="imp-select"
              value={header.supplierId}
              onChange={(e) => setHeader((s) => ({ ...s, supplierId: e.target.value }))}
            >
              <option value="">-- Chọn --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="imp-label">Ngày nhập</div>
            <input
              className="imp-input"
              type="date"
              value={header.receiptDate}
              onChange={(e) => setHeader((s) => ({ ...s, receiptDate: e.target.value }))}
            />
          </div>

          <div>
            <div className="imp-label">PurchaseOrderId (optional)</div>
            <input
              className="imp-input"
              placeholder="VD: 12"
              value={header.purchaseOrderId}
              onChange={(e) => setHeader((s) => ({ ...s, purchaseOrderId: e.target.value }))}
            />
          </div>

          <div className="imp-grid__full">
            <div className="imp-label">Ghi chú</div>
            <textarea
              className="imp-textarea"
              rows={2}
              value={header.notes}
              onChange={(e) => setHeader((s) => ({ ...s, notes: e.target.value }))}
              placeholder="VD: nhập bổ sung tháng 1..."
            />
          </div>
        </div>
      </div>

      <div className="imp-card">
        <div className="imp-row imp-row--between">
          <div className="imp-label">Danh sách thiết bị nhập</div>
          <button className="imp-btn imp-btn--ghost" onClick={addRow} type="button">
            + Thêm dòng
          </button>
        </div>

        <div className="imp-tableWrap">
          <table className="imp-table">
            <thead>
              <tr>
                <th>Thiết bị</th>
                <th style={{ width: 120 }}>SL</th>
                <th style={{ width: 160 }}>Đơn giá</th>
                <th>Ghi chú</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const eq = equipmentMap.get(String(r.equipmentId));
                return (
                  <tr key={idx}>
                    <td>
                      <select
                        className="imp-select"
                        value={r.equipmentId}
                        onChange={(e) => updateRow(idx, { equipmentId: e.target.value })}
                      >
                        <option value="">-- Chọn --</option>
                        {equipments.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} {e.code ? `(${e.code})` : ""}
                          </option>
                        ))}
                      </select>
                      {eq?.unit ? <div className="imp-hint">Đơn vị: {eq.unit}</div> : null}
                    </td>

                    <td>
                      <input
                        className="imp-input"
                        type="number"
                        min={1}
                        value={r.receivedQuantity}
                        onChange={(e) => updateRow(idx, { receivedQuantity: e.target.value })}
                      />
                    </td>

                    <td>
                      <input
                        className="imp-input"
                        type="number"
                        min={0}
                        value={r.unitPrice}
                        onChange={(e) => updateRow(idx, { unitPrice: e.target.value })}
                        placeholder="(optional)"
                      />
                    </td>

                    <td>
                      <input
                        className="imp-input"
                        value={r.notes}
                        onChange={(e) => updateRow(idx, { notes: e.target.value })}
                        placeholder="(optional)"
                      />
                    </td>

                    <td>
                      {rows.length > 1 ? (
                        <button
                          className="imp-btn imp-btn--danger"
                          type="button"
                          onClick={() => removeRow(idx)}
                        >
                          Xoá
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="imp-actions">
          <button className="imp-btn" onClick={submit} disabled={saving}>
            {saving ? "Đang lưu..." : "Tạo phiếu nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
