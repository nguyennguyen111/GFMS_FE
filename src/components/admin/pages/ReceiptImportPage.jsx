import React, { useEffect, useMemo, useState } from "react";
import "./ReceiptImportPage.css";

import {
  createReceipt,
  getEquipments,
  getSuppliers,
  getGyms,
} from "../../../services/equipmentSupplierInventoryService";

export default function ReceiptImportPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [gyms, setGyms] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [equipments, setEquipments] = useState([]);

  // form header
  const [gymId, setGymId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [notes, setNotes] = useState("");

  // items
  const [items, setItems] = useState([{ equipmentId: "", quantity: 1, unitPrice: "", notes: "" }]);

  const equipmentOptions = useMemo(() => equipments || [], [equipments]);

  const loadInit = async () => {
    try {
      setErr("");
      const [gymRes, supRes, eqRes] = await Promise.all([
        getGyms(),
        getSuppliers({ page: 1, limit: 200 }),
        getEquipments({ page: 1, limit: 200 }),
      ]);

      setGyms(gymRes?.data || []);
      setSuppliers(supRes?.data || []);
      setEquipments(eqRes?.data || []);

      // default gym: first
      const firstGymId = String((gymRes?.data || [])?.[0]?.id || "");
      setGymId(firstGymId);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Tải dữ liệu ban đầu thất bại");
    }
  };

  useEffect(() => {
    loadInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addRow = () => {
    setItems((prev) => [...prev, { equipmentId: "", quantity: 1, unitPrice: "", notes: "" }]);
  };

  const updateRow = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeRow = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async () => {
    try {
      setLoading(true);
      setErr("");

      if (!gymId) throw new Error("Bạn phải chọn phòng gym");

      const cleanItems = items
        .map((it) => ({
          equipmentId: Number(it.equipmentId),
          quantity: Number(it.quantity),
          unitPrice: it.unitPrice === "" ? null : Number(it.unitPrice),
          notes: it.notes || null,
        }))
        .filter((it) => it.equipmentId && it.quantity > 0);

      if (!cleanItems.length) throw new Error("Danh sách thiết bị nhận không hợp lệ");

      const payload = {
        code: `REC-${Date.now()}`,
        gymId: Number(gymId),
        supplierId: supplierId ? Number(supplierId) : null, // ✅ chuẩn nghiệp vụ
        purchaseOrderId: purchaseOrderId ? Number(purchaseOrderId) : null,
        receiptDate: receiptDate ? new Date(receiptDate).toISOString() : new Date().toISOString(),
        notes: notes || null,
        items: cleanItems,
      };

      await createReceipt(payload);
      alert("Tạo phiếu nhận hàng thành công!");
      setNotes("");
      setPurchaseOrderId("");
      setItems([{ equipmentId: "", quantity: 1, unitPrice: "", notes: "" }]);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Tạo phiếu nhận thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rip-wrap">
      <div className="rip-head">
        <div>
          <h2 className="rip-title">Nhận hàng</h2>
          <div className="rip-sub">Tạo phiếu nhận hàng gắn với đơn mua và cập nhật tồn kho sau xác nhận</div>
        </div>
      </div>

      {err ? <div className="rip-alert">{err}</div> : null}

      <div className="rip-card">
        <div className="rip-grid">
          <div className="rip-field">
            <label>Phòng gym / Chi nhánh</label>
            <select value={gymId} onChange={(e) => setGymId(e.target.value)}>
              <option value="">-- Chọn phòng gym --</option>
              {gyms.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.address ? `- ${g.address}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="rip-field">
            <label>Nhà cung cấp</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">-- Chọn --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="rip-field">
            <label>Ngày nhận</label>
            <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
          </div>

          <div className="rip-field">
            <label>Mã đơn mua PO (tuỳ chọn)</label>
            <input value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} placeholder="VD: 123" />
          </div>

          <div className="rip-field rip-field--full">
            <label>Ghi chú</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="VD: nhập bổ sung..." />
          </div>
        </div>
      </div>

      <div className="rip-card">
        <div className="rip-card__head">
          <div className="rip-card__title">Danh sách thiết bị nhận</div>
          <button className="rip-btn rip-btn--ghost" onClick={addRow}>
            + Thêm dòng
          </button>
        </div>

        <div className="rip-table">
          <div className="rip-row rip-row--head">
            <div>Thiết bị</div>
            <div>SL</div>
            <div>Đơn giá</div>
            <div>Ghi chú</div>
            <div></div>
          </div>

          {items.map((it, idx) => {
            const eq = equipmentOptions.find((e) => String(e.id) === String(it.equipmentId));
            return (
              <div className="rip-row" key={idx}>
                <div>
                  <select value={it.equipmentId} onChange={(e) => updateRow(idx, { equipmentId: e.target.value })}>
                    <option value="">-- Chọn thiết bị --</option>
                    {equipmentOptions.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.code})
                      </option>
                    ))}
                  </select>
                  <div className="rip-hint">Đơn vị: {eq?.unit || "—"}</div>
                </div>

                <div>
                  <input type="number" min="1" value={it.quantity} onChange={(e) => updateRow(idx, { quantity: e.target.value })} />
                </div>

                <div>
                  <input
                    type="number"
                    min="0"
                    value={it.unitPrice}
                    onChange={(e) => updateRow(idx, { unitPrice: e.target.value })}
                    placeholder="(tuỳ chọn)"
                  />
                </div>

                <div>
                  <input
                    value={it.notes}
                    onChange={(e) => updateRow(idx, { notes: e.target.value })}
                    placeholder="(tuỳ chọn)"
                  />
                </div>

                <div className="rip-actions">
                  <button className="rip-btn rip-btn--danger" onClick={() => removeRow(idx)} disabled={items.length <= 1}>
                    Xoá
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rip-footer">
          <button className="rip-btn rip-btn--primary" onClick={onSubmit} disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo phiếu nhận hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}
