// src/components/pages/marketplace/packages/PackageDetailsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { mpGetPackageDetail } from "../../../../services/marketplaceService";
import { getCurrentUser } from "../../../../utils/auth";
import "./PackageDetailsPage.css";

const fmtMoney = (v) => Number(v || 0).toLocaleString("vi-VN") + " ₫";

export default function PackageDetailsPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [pkg, setPkg] = useState(null);
  const user = getCurrentUser();

  useEffect(() => {
    mpGetPackageDetail(packageId).then((res) => setPkg(res.data?.DT || null));
  }, [packageId]);

  const statusLabel = useMemo(() => (pkg?.isActive ? "Đang bán" : "Tạm ngưng"), [pkg]);

  if (!pkg)
    return (
      <div className="pkd-page">
        <div className="pkd-container">Đang tải gói tập...</div>
      </div>
    );

  const goBookingWizard = () => {
    if (!user) {
      sessionStorage.setItem(
        "redirectAfterLogin",
        `${location.pathname}${location.search}`
      );
      navigate("/login");
      return;
    }

    navigate(`/member/booking/wizard?gymId=${pkg.gymId}&packageId=${pkg.id}`);
  };

  return (
    <div className="pkd-page">
      <div className="pkd-container">
        <div className="pkd-head">
          <button
            className="pkd-back"
            onClick={() =>
              window.history.length > 1 ? navigate(-1) : navigate("/marketplace/gyms")
            }
          >
            ← Quay lại
          </button>

          <span className={`pkd-status ${pkg.isActive ? "on" : "off"}`}>{statusLabel}</span>
          <h1 className="pkd-title">{pkg.name}</h1>
          <div className="pkd-sub">
            {pkg.sessions} buổi • {pkg.durationDays} ngày • {pkg.type || "basic"}
          </div>
        </div>

        <div className="pkd-content">
          <div className="pkd-main">
            <section className="pkd-card">
              <h3>Mô tả</h3>
              <p>{pkg.description || "Chưa có mô tả."}</p>
            </section>

            <section className="pkd-card">
              <h3>Chi tiết gói</h3>
              <div className="pkd-specs">
                <div><span>Số buổi</span><b>{pkg.sessions}</b></div>
                <div><span>Thời hạn</span><b>{pkg.durationDays} ngày</b></div>
                <div><span>Tối đa/tuần</span><b>{pkg.maxSessionsPerWeek || "—"}</b></div>
                <div><span>Loại gói</span><b>{pkg.type || "—"}</b></div>
              </div>
            </section>

            {pkg.Gym && (
              <section className="pkd-card">
                <h3>Phòng gym</h3>
                <div
                  className="pkd-link"
                  onClick={() => navigate(`/marketplace/gyms/${pkg.Gym.id}`)}
                >
                  <b>{pkg.Gym.name}</b>
                  <span>{pkg.Gym.address}</span>
                </div>
              </section>
            )}
          </div>

          <aside className="pkd-buy">
            <div className="pkd-buyBox">
              <div className="pkd-price">{fmtMoney(pkg.price)}</div>
              <div className="pkd-buySub">
                {pkg.sessions} buổi • {pkg.durationDays} ngày
              </div>

              <button
                className="pkd-buyBtn"
                disabled={!pkg.isActive}
                onClick={goBookingWizard}
              >
                Đặt lịch với gói này
              </button>

              <div className="pkd-hint">
                Bỏ qua bước chọn gói và vào thẳng quy trình đặt lịch
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}