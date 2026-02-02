import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPayosPayment } from "../../../services/paymentService";
import { useNavigate } from "react-router-dom";
import {
  memberGetPackages,
  memberPurchasePackage,
  memberGetMyPackages,
} from "../../../services/memberPackageService";

const fmtMoney = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("vi-VN") + " ₫";
};

export default function MemberPackagesPage() {
  const navigate = useNavigate();

  const [packages, setPackages] = useState([]);
  const [myPackages, setMyPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [errPackages, setErrPackages] = useState("");
  const [errMyPackages, setErrMyPackages] = useState("");

  const [showPay, setShowPay] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [buyingId, setBuyingId] = useState(null);

  // 👉 vẫn giữ active để dùng cho ĐẶT LỊCH (không dùng để chặn mua)
  const active = useMemo(() => {
    return (
      myPackages.find(
        (x) => x.status === "active" && (x.sessionsRemaining ?? 0) > 0
      ) || null
    );
  }, [myPackages]);

  const loadPackagesOnly = useCallback(async () => {
    setErrPackages("");
    try {
      const res = await memberGetPackages();
      setPackages(res.data?.data || []);
    } catch (e) {
      setErrPackages(
        e.response?.data?.message || "Không tải được danh sách gói."
      );
    }
  }, []);

  const loadMyPackagesSafe = useCallback(async () => {
    setErrMyPackages("");
    try {
      const res = await memberGetMyPackages();
      setMyPackages(res.data?.data || []);
    } catch (e) {
      setMyPackages([]);
      setErrMyPackages(
        e.response?.data?.message ||
          "Chưa tải được 'Gói của tôi'."
      );
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPackagesOnly(), loadMyPackagesSafe()]);
    setLoading(false);
  }, [loadPackagesOnly, loadMyPackagesSafe]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openPay = (pkg) => {
    setSelectedPkg(pkg);
    setPayMethod("cash");
    setShowPay(true);
  };

  const closePay = () => {
    setShowPay(false);
    setSelectedPkg(null);
    setPayMethod("cash");
  };

  // ================== OPTION A: KHÔNG CHẶN ACTIVE ==================
  const confirmPurchase = async () => {
    if (!selectedPkg) return;

    setBuyingId(selectedPkg.id);

    try {
      if (payMethod === "payos") {
        const res = await createPayosPayment(selectedPkg.id);
        window.location.href = res.data.checkoutUrl;
        return;
      }

      await memberPurchasePackage(selectedPkg.id, {
        paymentMethod: payMethod,
      });

      alert("🎉 Mua gói thành công!");
      closePay();
      await loadAll();
      navigate("/member/my-packages");
    } catch (e) {
      alert(e.response?.data?.message || "Mua gói thất bại");
    } finally {
      setBuyingId(null);
    }
  };
  // ================================================================

  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">📦 Gói tập</h2>
          <div className="op-sub">
            Danh sách gói tập đang được công bố tại gym của bạn.
          </div>
        </div>

        <div className="op-toolbar">
          <button
            className="op-btn op-btn--small"
            onClick={() => navigate("/member/my-packages")}
          >
            🎫 Gói của tôi
          </button>
          <button
            className="op-btn op-btn--small"
            onClick={loadAll}
            disabled={loading}
          >
            ↻ Tải lại
          </button>
        </div>
      </div>

      {errPackages && <div className="op-error">{errPackages}</div>}

      {!errPackages && errMyPackages && (
        <div className="op-warn">{errMyPackages}</div>
      )}

      {active && (
        <div className="op-card padded" style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 1000 }}>
                ✅ Bạn đang có gói{" "}
                <span style={{ color: "var(--orange)" }}>
                  {active.Package?.name || "Active"}
                </span>
              </div>
              <div className="op-sub" style={{ marginTop: 6 }}>
                Còn <b>{active.sessionsRemaining ?? 0}</b> buổi • Bạn có thể mua
                thêm gói bất kỳ lúc nào.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="op-btn op-btn--small"
                onClick={() => navigate("/member/bookings/new")}
              >
                Đặt lịch PT
              </button>
              <button
                className="op-btn op-btn--small"
                onClick={() => navigate("/member/my-packages")}
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="op-card padded">
        {loading ? (
          <div className="op-empty">Đang tải gói tập...</div>
        ) : packages.length === 0 ? (
          <div className="op-empty">Hiện chưa có gói tập.</div>
        ) : (
          <div className="pkg-grid">
            {packages.map((p) => {
              const disabled = !p.isActive; // ✅ OPTION A
              return (
                <div
                  key={p.id}
                  className={`pkg-card ${disabled ? "is-disabled" : ""}`}
                >
                  <div className="pkg-top">
                    <div>
                      <div className="pkg-name">{p.name}</div>
                      <div className="pkg-desc">
                        {p.description || "—"}
                      </div>
                    </div>

                    <span
                      className={`op-badge ${
                        p.isActive ? "is-on" : "is-off"
                      }`}
                    >
                      {p.isActive ? "Đang bán" : "Tạm ngưng"}
                    </span>
                  </div>

                  <div className="pkg-mid">
                    <div className="pkg-metric">
                      <div className="pkg-k">Số buổi</div>
                      <div className="pkg-v">{p.sessions ?? "—"}</div>
                    </div>
                    <div className="pkg-metric">
                      <div className="pkg-k">Thời hạn</div>
                      <div className="pkg-v">
                        {p.durationDays
                          ? `${p.durationDays} ngày`
                          : "Không giới hạn"}
                      </div>
                    </div>
                    <div className="pkg-metric">
                      <div className="pkg-k">Giá</div>
                      <div className="pkg-v">{fmtMoney(p.price)}</div>
                    </div>
                  </div>

                  <div className="pkg-foot">
                    <button
                      className="op-btn op-btn--primary"
                      onClick={() => openPay(p)}
                      disabled={disabled || buyingId === p.id}
                    >
                      {buyingId === p.id
                        ? "Đang xử lý..."
                        : "Mua gói"}
                    </button>

                    <button
                      className="op-btn"
                      onClick={() => navigate("/member/bookings/new")}
                      disabled={!active}
                    >
                      Đặt lịch
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPay && selectedPkg && (
        <div className="pay-overlay" onMouseDown={closePay}>
          <div
            className="pay-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="pay-head">
              <div>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>
                  Thanh toán gói
                </div>
                <div className="op-sub" style={{ marginTop: 4 }}>
                  {selectedPkg.name} • {fmtMoney(selectedPkg.price)}
                </div>
              </div>
              <button
                className="op-btn op-btn--small"
                onClick={closePay}
              >
                ✕
              </button>
            </div>

            <div className="pay-body">
              <div className="pay-box">
                <div style={{ fontWeight: 900, marginBottom: 8 }}>
                  Chọn phương thức
                </div>

                <div className="pay-methods">
                  <button
                    className={`pay-method ${
                      payMethod === "cash" ? "is-active" : ""
                    }`}
                    onClick={() => setPayMethod("cash")}
                  >
                    💵 Tiền mặt
                  </button>

                  <button
                    className={`pay-method ${
                      payMethod === "payos" ? "is-active" : ""
                    }`}
                    onClick={() => setPayMethod("payos")}
                  >
                    💳 PayOS
                  </button>

                  <button
                    className={`pay-method ${
                      payMethod === "momo" ? "is-active" : ""
                    }`}
                    onClick={() => setPayMethod("momo")}
                  >
                    🟣 MoMo
                  </button>

                  <button
                    className={`pay-method ${
                      payMethod === "vnpay" ? "is-active" : ""
                    }`}
                    onClick={() => setPayMethod("vnpay")}
                  >
                    🏦 VNPay
                  </button>
                </div>
              </div>
            </div>

            <div className="pay-foot">
              <button className="op-btn" onClick={closePay}>
                Huỷ
              </button>
              <button
                className="op-btn op-btn--primary"
                onClick={confirmPurchase}
                disabled={buyingId === selectedPkg.id}
              >
                {buyingId === selectedPkg.id
                  ? "Đang thanh toán..."
                  : "Xác nhận mua"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
