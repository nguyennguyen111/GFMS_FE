import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { mpGetPackageDetail } from "../../../../services/marketplaceService";
import { memberPurchasePackage } from "../../../../services/memberPackageService";
import { createPayosPayment } from "../../../../services/paymentService";
import { getCurrentUser } from "../../../../utils/auth";
import "../Marketplace.css";

const fmtMoney = (v) =>
  Number(v || 0).toLocaleString("vi-VN") + " ₫";

export default function PackageDetailsPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [pkg, setPkg] = useState(null);
  const [buying, setBuying] = useState(false);

  // payment modal
  const [showPay, setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState("cash");

  const user = getCurrentUser();

  /* ===============================
     LOAD PACKAGE
  =============================== */
  useEffect(() => {
    mpGetPackageDetail(packageId).then((res) => {
      setPkg(res.data?.DT || null);
    });
  }, [packageId]);

  if (!pkg) return <div className="pkg-page">Đang tải gói tập...</div>;

  /* ===============================
     BUY FLOW
  =============================== */

  const openPay = () => {
    if (!user) {
      sessionStorage.setItem("redirectAfterLogin", location.pathname);
      navigate("/login");
      return;
    }
    setPayMethod("cash");
    setShowPay(true);
  };

  const closePay = () => {
    setShowPay(false);
    setPayMethod("cash");
  };

  const confirmPurchase = async () => {
    if (!pkg) return;

    try {
      setBuying(true);

      // ===== PAYOS FLOW (FIX CHUẨN) =====
      if (payMethod === "payos") {
        const res = await createPayosPayment(pkg.id, {
          gymId: pkg.gymId,
          source: "marketplace",
          returnUrl: `${window.location.origin}/member/my`,
        });

        window.location.href = res.data.checkoutUrl;
        return;
      }

      // ===== NON-PAYOS (CASH / ETC) =====
      await memberPurchasePackage(pkg.id, {
        paymentMethod: payMethod,
        gymId: pkg.gymId,
      });

      alert("🎉 Mua gói thành công!");
      closePay();
      navigate("/member/my");
    } catch (e) {
      alert(e.response?.data?.message || "Thanh toán thất bại");
    } finally {
      setBuying(false);
    }
  };

  /* ===============================
     UI
  =============================== */
  return (
    <div className="pkg-page">
      {/* HEADER */}
      <div className="pkg-header">
        <span className={`pkg-status ${pkg.isActive ? "on" : "off"}`}>
          {pkg.isActive ? "Đang bán" : "Tạm ngưng"}
        </span>
        <h1 className="pkg-title">{pkg.name}</h1>
      </div>

      {/* CONTENT */}
      <div className="pkg-content">
        {/* LEFT */}
        <div className="pkg-main">
          <section className="pkg-section">
            <h3>Mô tả</h3>
            <p>{pkg.description || "Chưa có mô tả."}</p>
          </section>

          <section className="pkg-section">
            <h3>Chi tiết gói</h3>
            <div className="pkg-specs">
              <div><span>Số buổi</span><b>{pkg.sessions}</b></div>
              <div><span>Thời hạn</span><b>{pkg.durationDays} ngày</b></div>
              <div><span>Tối đa / tuần</span><b>{pkg.maxSessionsPerWeek || "—"}</b></div>
              <div><span>Loại gói</span><b>{pkg.type || "—"}</b></div>
            </div>
          </section>

          {pkg.Gym && (
            <section className="pkg-section">
              <h3>Phòng gym</h3>
              <div
                className="pkg-link-card"
                onClick={() => navigate(`/marketplace/gyms/${pkg.Gym.id}`)}
              >
                <b>{pkg.Gym.name}</b>
                <span>{pkg.Gym.address}</span>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT */}
        <aside className="pkg-buy">
          <div className="pkg-buy-box">
            <div className="pkg-buy-price">{fmtMoney(pkg.price)}</div>
            <div className="pkg-buy-sub">
              {pkg.sessions} buổi • {pkg.durationDays} ngày
            </div>

            <button
              className="pkg-buy-btn"
              disabled={!pkg.isActive}
              onClick={openPay}
            >
              Mua gói
            </button>
          </div>
        </aside>
      </div>

      {/* PAYMENT MODAL */}
      {showPay && (
        <div className="pay-overlay" onClick={closePay}>
          <div className="pay-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pay-header">
              <div>
                <h3>Thanh toán gói</h3>
                <p>
                  {pkg.name} • <b>{fmtMoney(pkg.price)}</b>
                </p>
              </div>
              <button className="pay-close" onClick={closePay}>✕</button>
            </div>

            <div className="pay-body">
              <div className="pay-method-grid">
                {[
                  { key: "cash", label: "Tiền mặt", icon: "💵" },
                  { key: "payos", label: "PayOS", icon: "💳" },
                  { key: "momo", label: "MoMo", icon: "🟣" },
                  { key: "vnpay", label: "VNPay", icon: "🏦" },
                ].map((m) => (
                  <button
                    key={m.key}
                    className={`pay-method-card ${payMethod === m.key ? "active" : ""}`}
                    onClick={() => setPayMethod(m.key)}
                  >
                    <div className="pay-icon">{m.icon}</div>
                    <div className="pay-label">{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pay-footer">
              <button className="btn-secondary" onClick={closePay}>
                Huỷ
              </button>
              <button
                className="btn-primary"
                disabled={buying}
                onClick={confirmPurchase}
              >
                {buying ? "Đang xử lý..." : "Xác nhận thanh toán"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
