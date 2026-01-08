import React, { useCallback, useEffect, useMemo, useState } from "react";
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

  // tách lỗi: lỗi packages vs lỗi my-packages
  const [errPackages, setErrPackages] = useState("");
  const [errMyPackages, setErrMyPackages] = useState("");

  const [showPay, setShowPay] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [buyingId, setBuyingId] = useState(null);

  const active = useMemo(() => {
    return (
      myPackages.find((x) => x.status === "active" && (x.sessionsRemaining ?? 0) > 0) || null
    );
  }, [myPackages]);

  const loadPackagesOnly = useCallback(async () => {
    setErrPackages("");
    try {
      const res = await memberGetPackages();
      setPackages(res.data?.data || []);
    } catch (e) {
      setErrPackages(e.response?.data?.message || "Không tải được danh sách gói.");
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
        "Chưa tải được 'Gói của tôi' (BE chưa mount /api/member/my-packages)."
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

  const confirmPurchase = async () => {
    if (!selectedPkg) return;

    if (active) {
      alert("Bạn đang có gói active. Vui lòng dùng hết trước khi mua mới.");
      closePay();
      return;
    }

    setBuyingId(selectedPkg.id);
    try {
      await memberPurchasePackage(selectedPkg.id, { paymentMethod: payMethod });
      alert("🎉 Mua gói thành công! Bạn có thể đặt lịch ngay.");
      closePay();
      await loadAll();
      navigate("/member/my-packages");
    } catch (e) {
      alert(e.response?.data?.message || "Mua gói thất bại");
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">📦 Gói tập</h2>
          <div className="op-sub">Danh sách gói tập đang được công bố tại gym của bạn.</div>
        </div>

        <div className="op-toolbar">
          <button className="op-btn op-btn--small" onClick={() => navigate("/member/my-packages")}>
            🎫 Gói của tôi
          </button>
          <button className="op-btn op-btn--small" onClick={loadAll} disabled={loading}>
            ↻ Tải lại
          </button>
        </div>
      </div>

      {errPackages && <div className="op-error">{errPackages}</div>}

      {/* ✅ lỗi my-packages chỉ cảnh báo nhỏ */}
      {!errPackages && errMyPackages && (
        <div className="op-warn">
          {errMyPackages}
        </div>
      )}

      {active && (
        <div className="op-card padded" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 1000 }}>
                ✅ Bạn đang có gói{" "}
                <span style={{ color: "var(--orange)" }}>
                  {active.Package?.name || "Active"}
                </span>
              </div>
              <div className="op-sub" style={{ marginTop: 6 }}>
                Còn <b>{active.sessionsRemaining ?? 0}</b> buổi • Bạn chỉ có thể mua gói mới sau khi dùng hết.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="op-btn op-btn--small" onClick={() => navigate("/member/bookings/new")}>
                Đặt lịch PT
              </button>
              <button className="op-btn op-btn--small" onClick={() => navigate("/member/my-packages")}>
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
              const disabled = !p.isActive || !!active;
              return (
                <div key={p.id} className={`pkg-card ${disabled ? "is-disabled" : ""}`}>
                  <div className="pkg-top">
                    <div>
                      <div className="pkg-name">{p.name}</div>
                      <div className="pkg-desc">{p.description || "—"}</div>
                    </div>

                    <span className={`op-badge ${p.isActive ? "is-on" : "is-off"}`}>
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
                      <div className="pkg-v">{p.durationDays ? `${p.durationDays} ngày` : "Không giới hạn"}</div>
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
                      title={active ? "Bạn đang có gói active" : !p.isActive ? "Gói đang tạm ngưng" : ""}
                    >
                      {buyingId === p.id ? "Đang xử lý..." : "Mua gói"}
                    </button>

                    <button className="op-btn" onClick={() => navigate("/member/bookings/new")} disabled={!active}>
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
          <div className="pay-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pay-head">
              <div>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>Thanh toán gói</div>
                <div className="op-sub" style={{ marginTop: 4 }}>
                  {selectedPkg.name} • {fmtMoney(selectedPkg.price)}
                </div>
              </div>
              <button className="op-btn op-btn--small" onClick={closePay}>✕</button>
            </div>

            <div className="pay-body">
              <div className="pay-box">
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Chọn phương thức</div>

                <div className="pay-methods">
                  <button
                    type="button"
                    className={`pay-method ${payMethod === "cash" ? "is-active" : ""}`}
                    onClick={() => setPayMethod("cash")}
                  >
                    💵 Tiền mặt
                  </button>

                  <button
                    type="button"
                    className={`pay-method ${payMethod === "momo" ? "is-active" : ""}`}
                    onClick={() => setPayMethod("momo")}
                  >
                    🟣 MoMo (MVP)
                  </button>

                  <button
                    type="button"
                    className={`pay-method ${payMethod === "vnpay" ? "is-active" : ""}`}
                    onClick={() => setPayMethod("vnpay")}
                  >
                    🏦 VNPay (MVP)
                  </button>
                </div>
              </div>
            </div>

            <div className="pay-foot">
              <button className="op-btn" onClick={closePay}>Huỷ</button>
              <button
                className="op-btn op-btn--primary"
                onClick={confirmPurchase}
                disabled={buyingId === selectedPkg.id}
              >
                {buyingId === selectedPkg.id ? "Đang thanh toán..." : "Xác nhận mua"}
              </button>
            </div>
          </div>

          <style>{`
            .op-warn{
              background: rgba(255,165,0,0.12);
              border: 1px solid rgba(255,165,0,0.25);
              border-radius: 14px;
              padding: 10px 12px;
              margin-bottom: 12px;
              color: rgba(255,255,255,0.9);
              font-size: 13px;
            }
            .pkg-grid{
              display:grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }
            @media (max-width: 1000px){ .pkg-grid{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
            @media (max-width: 600px){ .pkg-grid{ grid-template-columns: 1fr; } }
            .pkg-card{
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.10);
              border-radius: 18px;
              padding: 14px;
              display:flex;
              flex-direction:column;
              gap: 12px;
              transition: 150ms ease;
            }
            .pkg-card:hover{ transform: translateY(-2px); border-color: rgba(255,165,0,0.25); }
            .pkg-card.is-disabled{ opacity: 0.65; }
            .pkg-top{ display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
            .pkg-name{ font-size: 16px; font-weight: 1000; }
            .pkg-desc{ margin-top: 6px; opacity: 0.75; font-size: 13px; }
            .pkg-mid{
              display:grid;
              grid-template-columns: repeat(3, minmax(0,1fr));
              gap: 10px;
            }
            .pkg-metric{
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              padding: 10px;
            }
            .pkg-k{ opacity:0.7; font-size:12px; }
            .pkg-v{ margin-top: 4px; font-weight: 1000; }
            .pkg-foot{ display:flex; gap: 10px; justify-content:flex-end; flex-wrap:wrap; }
            .pay-overlay{
              position: fixed; inset: 0; background: rgba(0,0,0,0.55);
              display:flex; align-items:center; justify-content:center;
              z-index: 9999; padding: 12px;
            }
            .pay-modal{
              width: min(560px, 96vw);
              background: rgba(22,22,22,0.98);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 18px;
              box-shadow: 0 18px 40px rgba(0,0,0,0.45);
              overflow: hidden;
            }
            .pay-head{
              display:flex; justify-content:space-between; align-items:flex-start; gap:12px;
              padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.10);
            }
            .pay-body{ padding: 14px; }
            .pay-box{
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.10);
              border-radius: 16px;
              padding: 12px;
            }
            .pay-methods{
              display:grid;
              grid-template-columns: repeat(3, minmax(0,1fr));
              gap: 10px;
            }
            @media (max-width: 560px){ .pay-methods{ grid-template-columns: 1fr; } }
            .pay-method{
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 14px;
              padding: 10px;
              cursor: pointer;
              color: rgba(255,255,255,0.92);
              font-weight: 900;
              text-align:left;
              transition: 150ms ease;
            }
            .pay-method:hover{ transform: translateY(-1px); border-color: rgba(255,165,0,0.35); }
            .pay-method.is-active{
              border-color: rgba(255,165,0,0.75);
              box-shadow: 0 0 0 3px rgba(255,165,0,0.15) inset;
            }
            .pay-foot{
              padding: 14px; display:flex; justify-content:flex-end; gap: 10px;
              border-top: 1px solid rgba(255,255,255,0.10);
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
