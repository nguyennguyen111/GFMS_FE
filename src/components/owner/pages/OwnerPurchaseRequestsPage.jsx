import React, { useEffect, useMemo, useState } from "react";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { ownerGetEquipments } from "../../../services/ownerEquipmentService";
import {
  ownerGetSuppliers,
  ownerPreviewPurchaseStock,
  ownerCreatePurchaseRequest,
  ownerGetPurchaseRequests,
} from "../../../services/ownerPurchaseService";
import "../OwnerDashboard.css";

const REASONS = [
  { value: "new_opening", label: "Mở mới / mở rộng" },
  { value: "low_stock", label: "Thiếu tồn (≤ min stock)" },
  { value: "replacement", label: "Thay mới" },
  { value: "maintenance_unfixable", label: "Bảo trì không sửa được" },
  { value: "upgrade", label: "Nâng cấp" },
];

export default function OwnerPurchaseRequestsPage() {
  const [gyms, setGyms] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [gymId, setGymId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [expectedUnitPrice, setExpectedUnitPrice] = useState("");
  const [expectedSupplierId, setExpectedSupplierId] = useState("");
  const [reason, setReason] = useState("new_opening");
  const [priority, setPriority] = useState("normal");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);

  const loadRefs = async () => {
    try {
      const [gRes, eRes, sRes] = await Promise.all([
        ownerGetMyGyms(),
        ownerGetEquipments({ page: 1, limit: 500 }),
        ownerGetSuppliers({ page: 1, limit: 200 }),
      ]);
      const gData = gRes?.data?.data ?? gRes?.data ?? [];
      setGyms(Array.isArray(gData) ? gData : []);
      const eq = eRes?.data?.data ?? eRes?.data ?? [];
      setEquipments(Array.isArray(eq) ? eq : []);
      const sup = sRes?.data?.data ?? sRes?.data ?? [];
      setSuppliers(Array.isArray(sup) ? sup : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  const loadList = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await ownerGetPurchaseRequests({ page: 1, limit: 50 });
      const data = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefs();
    loadList();
  }, []);

  const runPreview = async () => {
    if (!gymId || !equipmentId) return;
    setErr("");
    try {
      const res = await ownerPreviewPurchaseStock({ gymId, equipmentId });
      setPreview(res?.data?.data ?? res?.data ?? null);
    } catch (e) {
      setPreview(null);
      setErr(e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => {
    if (gymId && equipmentId) runPreview();
    else setPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, equipmentId]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await ownerCreatePurchaseRequest({
        gymId: Number(gymId),
        equipmentId: Number(equipmentId),
        quantity: Number(quantity),
        expectedUnitPrice: Number(String(expectedUnitPrice).replace(/,/g, "") || 0),
        expectedSupplierId: expectedSupplierId ? Number(expectedSupplierId) : null,
        reason,
        priority,
        note: note || null,
      });
      setNote("");
      await loadList();
      alert("Đã gửi yêu cầu mua sắm.");
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex.message);
    }
  };

  const statusLabel = useMemo(
    () => ({
      submitted: "Chờ admin",
      rejected: "Từ chối",
      converted: "Đã tạo báo giá",
    }),
    []
  );

  return (
    <div className="od2-content" style={{ maxWidth: 1100 }}>
      <div className="od2-h1" style={{ marginBottom: 8 }}>
        Yêu cầu mua sắm thiết bị
      </div>
      <p style={{ opacity: 0.85, marginBottom: 20 }}>
        Bắt đầu từ nhu cầu vận hành: chọn gym, thiết bị, số lượng, giá dự kiến, NCC và lý do. Hệ thống kiểm tra tồn kho / min stock
        (với lý do &quot;thiếu tồn&quot;). Admin tiếp nhận và tạo báo giá.
      </p>

      {err ? (
        <div style={{ color: "#fca5a5", marginBottom: 12 }}>{err}</div>
      ) : null}

      <form
        onSubmit={submit}
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 28,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Gym</div>
            <select className="od2-input" value={gymId} onChange={(e) => setGymId(e.target.value)} required>
              <option value="">— Chọn —</option>
              {gyms.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Thiết bị</div>
            <select
              className="od2-input"
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              required
            >
              <option value="">— Chọn —</option>
              {equipments.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} {eq.code ? `(${eq.code})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {preview ? (
          <div
            style={{
              fontSize: 13,
              background: "rgba(255,255,255,0.04)",
              padding: 10,
              borderRadius: 8,
              border: preview.shouldReorder ? "1px solid rgba(251,191,36,0.45)" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <b>Tồn tại thời điểm xem:</b> SL kho {preview.quantityOnHand}, khả dụng {preview.availableQuantity}, min {preview.minStockLevel}, đang chờ mua (PO) {preview.pendingPurchaseQty}
            <div style={{ marginTop: 6, color: preview.shouldReorder ? "#fbbf24" : "#cbd5e1" }}>
              {preview.shouldReorder
                ? "Hệ thống đang đánh dấu dưới ngưỡng an toàn / cần mua thêm."
                : "Mức tồn hiện chưa chạm ngưỡng tối thiểu. Hãy chọn lý do mua phù hợp với nghiệp vụ thực tế."}
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Số lượng</div>
            <input
              className="od2-input"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Đơn giá dự kiến (VNĐ)</div>
            <input
              className="od2-input"
              type="number"
              min={0}
              value={expectedUnitPrice}
              onChange={(e) => setExpectedUnitPrice(e.target.value)}
            />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.75 }}>NCC dự kiến</div>
            <select
              className="od2-input"
              value={expectedSupplierId}
              onChange={(e) => setExpectedSupplierId(e.target.value)}
            >
              <option value="">— Không chọn —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Lý do mua</div>
            <select className="od2-input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Ưu tiên</div>
            <select className="od2-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="normal">Bình thường</option>
              <option value="high">Cao</option>
              <option value="low">Thấp</option>
            </select>
          </label>
        </div>

        <label>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Ghi chú</div>
          <textarea className="od2-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <button type="submit" className="od2-ghostBtn" style={{ justifySelf: "start", border: "1px solid rgba(255,255,255,0.2)" }}>
          Gửi yêu cầu
        </button>
      </form>

      <div className="od2-h2" style={{ marginBottom: 10 }}>
        Danh sách yêu cầu
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <th style={{ padding: 8 }}>Mã</th>
              <th style={{ padding: 8 }}>Gym</th>
              <th style={{ padding: 8 }}>Thiết bị</th>
              <th style={{ padding: 8 }}>SL</th>
              <th style={{ padding: 8 }}>Lý do</th>
              <th style={{ padding: 8 }}>Trạng thái</th>
              <th style={{ padding: 8 }}>Báo giá</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 12 }}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, opacity: 0.7 }}>
                  Chưa có yêu cầu.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: 8 }}>{r.code}</td>
                  <td style={{ padding: 8 }}>{r.gym?.name}</td>
                  <td style={{ padding: 8 }}>{r.equipment?.name}</td>
                  <td style={{ padding: 8 }}>{r.quantity}</td>
                  <td style={{ padding: 8 }}>{r.reason}</td>
                  <td style={{ padding: 8 }}>{statusLabel[r.status] || r.status}</td>
                  <td style={{ padding: 8 }}>{r.quotation?.code || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
