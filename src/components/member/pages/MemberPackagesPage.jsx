import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPayosPayment } from "../../../services/paymentService";
import {
  memberGetPackages,
  memberPurchasePackage,
  memberGetMyPackages,
} from "../../../services/memberPackageService";
import { getSelectedGym } from "../../../utils/selectedGym";
import "../member-pages.css";

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

  // ✅ selected gym
  const [selectedGym, setSelectedGym] = useState(() => getSelectedGym());

  useEffect(() => {
    const sync = () => setSelectedGym(getSelectedGym());
    window.addEventListener("selectedGymChanged", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("selectedGymChanged", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const gymId = selectedGym?.id;

  const active = useMemo(() => {
    return myPackages.find((x) => x.status === "active" && (x.sessionsRemaining ?? 0) > 0) || null;
  }, [myPackages]);

  const loadPackagesOnly = useCallback(async () => {
    setErrPackages("");
    try {
      const res = await memberGetPackages(gymId ? { gymId } : {});
      setPackages(res.data?.data || res.data?.DT || []);
    } catch (e) {
      setErrPackages(e.response?.data?.message || "Không tải được danh sách gói.");
    }
  }, [gymId]);

  const loadMyPackagesSafe = useCallback(async () => {
    setErrMyPackages("");
    try {
      const res = await memberGetMyPackages(gymId ? { gymId } : {});
      setMyPackages(res.data?.data || res.data?.DT || []);
    } catch (e) {
      setMyPackages([]);
      setErrMyPackages(e.response?.data?.message || "Chưa tải được 'Gói của tôi'.");
    }
  }, [gymId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPackagesOnly(), loadMyPackagesSafe()]);
    setLoading(false);
  }, [loadPackagesOnly, loadMyPackagesSafe]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openPay = (pkg) => {
    if (!gymId) {
      alert("Bạn cần chọn gym trước khi mua gói.");
      navigate("/marketplace/gyms");
      return;
    }
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

    if (!gymId) {
      alert("Bạn cần chọn gym trước khi mua gói.");
      navigate("/marketplace/gyms");
      return;
    }

    setBuyingId(selectedPkg.id);

    try {
      if (payMethod === "payos") {
        const res = await createPayosPayment(selectedPkg.id);
        window.location.href = res.data.checkoutUrl;
        return;
      }

      await memberPurchasePackage(selectedPkg.id, { paymentMethod: payMethod, gymId });
      alert("🎉 Mua gói thành công!");
      closePay();
      await loadAll();
      navigate("/member/my");
    } catch (e) {
      alert(e.response?.data?.message || "Mua gói thất bại");
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="mh-wrap">
      <div className="mh-head">
        <div>
          <h2 className="mh-title">📦 Gói tập</h2>
          <div className="mh-sub">Danh sách gói tập theo gym bạn đã chọn.</div>
        </div>

        <div className="mh-toolbar">
          <button className="m-btn m-btn--small" onClick={() => navigate("/member/my")}>
            🎫 Gói của tôi
          </button>
          <button className="m-btn m-btn--small" onClick={loadAll} disabled={loading}>
            ↻ Tải lại
          </button>
        </div>
      </div>

      {/* ✅ Banner Gym */}
      <div className="m-card padded" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 1100 }}>
              🏟️ Gym đang chọn:{" "}
              {gymId ? <span style={{ color: "var(--m-gold)" }}>{selectedGym?.name}</span> : <span style={{ opacity: 0.75 }}>Chưa chọn</span>}
            </div>
            <div className="mh-sub" style={{ marginTop: 6 }}>
              {gymId
                ? "Gói tập/đặt lịch sẽ dựa theo gym này."
                : "Bạn chưa chọn gym. Hãy chọn gym để xem đúng gói và PT theo nghiệp vụ."}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="m-btn m-btn--primary" onClick={() => navigate("/marketplace/gyms")}>
              Chọn/Đổi Gym
            </button>
            <button className="m-btn" onClick={() => navigate("/marketplace/trainers")}>
              Xem PT Marketplace
            </button>
          </div>
        </div>
      </div>

      {errPackages && <div className="m-error">{errPackages}</div>}
      {!errPackages && errMyPackages && <div className="m-warn">{errMyPackages}</div>}

      {active && (
        <div className="m-card padded" style={{ marginBottom: 12 }}>
          <div className="active-banner">
            <div>
              <div style={{ fontWeight: 1100 }}>
                ✅ Bạn đang có gói <span style={{ color: "var(--m-gold)" }}>{active.Package?.name || "Active"}</span>
              </div>
              <div className="mh-sub" style={{ marginTop: 6 }}>
                Còn <b>{active.sessionsRemaining ?? 0}</b> buổi • Bạn có thể mua thêm gói bất kỳ lúc nào.
              </div>
            </div>

            <div className="active-actions">
              <button className="m-btn m-btn--small" onClick={() => navigate("/member/bookings/new")} disabled={!gymId}>
                Đặt lịch PT
              </button>
              <button className="m-btn m-btn--small" onClick={() => navigate("/member/my")}>
                Xem chi tiết
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="m-card padded">
        {loading ? (
          <div className="m-empty">Đang tải gói tập...</div>
        ) : packages.length === 0 ? (
          <div className="m-empty">Hiện chưa có gói tập cho gym này.</div>
        ) : (
          <div className="pkg-grid">
            {packages.map((p) => {
              const disabled = !p.isActive || !gymId;
              return (
                <div key={p.id} className={`pkg-card ${disabled ? "is-disabled" : ""}`}>
                  <div className="pkg-top">
                    <div>
                      <div className="pkg-name">{p.name}</div>
                      <div className="pkg-desc">{p.description || "—"}</div>
                    </div>

                    <span className={`m-badge ${p.isActive ? "is-on" : "is-off"}`}>
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
                    <button className="m-btn m-btn--primary" onClick={() => openPay(p)} disabled={disabled || buyingId === p.id}>
                      {buyingId === p.id ? "Đang xử lý..." : "Mua gói"}
                    </button>

                    <button className="m-btn" onClick={() => navigate("/member/bookings/new")} disabled={!active || !gymId}>
                      Đặt lịch
                    </button>
                  </div>

                  {!gymId && (
                    <div className="mh-sub" style={{ marginTop: 10, opacity: 0.75 }}>
                      * Cần chọn gym trước khi mua/đặt lịch.
                    </div>
                  )}
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
                <div style={{ fontWeight: 1100, fontSize: 16 }}>Thanh toán gói</div>
                <div className="mh-sub" style={{ marginTop: 4 }}>
                  {selectedPkg.name} • {fmtMoney(selectedPkg.price)}
                </div>
              </div>
              <button className="m-btn m-btn--small" onClick={closePay}>
                ✕
              </button>
            </div>

            <div className="pay-body">
              <div className="pay-box">
                <div style={{ fontWeight: 1000, marginBottom: 8 }}>Chọn phương thức</div>

                <div className="pay-methods">
                  <button className={`pay-method ${payMethod === "cash" ? "is-active" : ""}`} onClick={() => setPayMethod("cash")}>
                    💵 Tiền mặt
                  </button>
                  <button className={`pay-method ${payMethod === "payos" ? "is-active" : ""}`} onClick={() => setPayMethod("payos")}>
                    💳 PayOS
                  </button>
                  <button className={`pay-method ${payMethod === "momo" ? "is-active" : ""}`} onClick={() => setPayMethod("momo")}>
                    🟣 MoMo
                  </button>
                  <button className={`pay-method ${payMethod === "vnpay" ? "is-active" : ""}`} onClick={() => setPayMethod("vnpay")}>
                    🏦 VNPay
                  </button>
                </div>
              </div>
            </div>

            <div className="pay-foot">
              <button className="m-btn" onClick={closePay}>
                Huỷ
              </button>
              <button className="m-btn m-btn--primary" onClick={confirmPurchase} disabled={buyingId === selectedPkg.id}>
                {buyingId === selectedPkg.id ? "Đang thanh toán..." : "Xác nhận mua"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .active-banner{
          display:flex;
          justify-content:space-between;
          gap: 12px;
          flex-wrap:wrap;
          align-items:flex-start;
        }
        .active-actions{ display:flex; gap: 8px; flex-wrap:wrap; }

        .pkg-grid{
          display:grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 12px;
        }
        @media (max-width: 980px){ .pkg-grid{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 560px){ .pkg-grid{ grid-template-columns: 1fr; } }

        .pkg-card{
          background: rgba(0,0,0,.18);
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 20px;
          padding: 14px;
          display:flex;
          flex-direction:column;
          gap: 12px;
          transition: 150ms ease;
        }
        .pkg-card:hover{
          transform: translateY(-1px);
          border-color: rgba(255,177,0,.32);
          background: rgba(255,255,255,.06);
        }
        .pkg-card.is-disabled{
          opacity: .55;
          transform:none;
        }
        .pkg-top{
          display:flex;
          justify-content:space-between;
          gap: 12px;
          align-items:flex-start;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .pkg-name{ font-weight:1100; font-size: 16px; }
        .pkg-desc{ margin-top:6px; font-size:12px; color: rgba(255,255,255,.68); line-height:1.45; }

        .pkg-mid{
          display:grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 10px;
        }
        .pkg-metric{
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          padding: 10px;
        }
        .pkg-k{
          font-size: 11px;
          letter-spacing: .10em;
          text-transform: uppercase;
          color: rgba(255,255,255,.60);
          font-weight: 1000;
        }
        .pkg-v{
          margin-top: 6px;
          font-weight:1100;
        }
        .pkg-foot{
          display:flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content:space-between;
          margin-top: 2px;
        }

        /* Modal */
        .pay-overlay{
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.65);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index: 9999;
          padding: 16px;
        }
        .pay-modal{
          width: min(560px, 94vw);
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(10,12,18,.96);
          box-shadow: 0 30px 120px rgba(0,0,0,.60);
          overflow:hidden;
        }
        .pay-head{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .pay-body{ padding: 14px 16px; }
        .pay-box{
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 18px;
          padding: 12px;
        }
        .pay-methods{
          display:grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 10px;
        }
        @media (max-width: 520px){ .pay-methods{ grid-template-columns: 1fr; } }

        .pay-method{
          border-radius: 16px;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.18);
          color: rgba(255,255,255,.92);
          cursor:pointer;
          font-weight: 1000;
          transition: 150ms ease;
          text-align:left;
        }
        .pay-method:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.06);
          border-color: rgba(255,177,0,.32);
        }
        .pay-method.is-active{
          border-color: rgba(255,177,0,.75);
          box-shadow: 0 0 0 3px rgba(255,177,0,.12) inset;
        }

        .pay-foot{
          display:flex;
          justify-content:flex-end;
          gap: 10px;
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,.08);
        }
      `}</style>
    </div>
  );
}
