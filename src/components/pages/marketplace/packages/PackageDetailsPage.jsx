import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Package as PackageIcon,
  Dumbbell,
  MapPin,
} from "lucide-react";
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

  const statusLabel = useMemo(() => (pkg?.isActive ? "ĐANG BÁN" : "TẠM NGƯNG"), [pkg]);

  if (!pkg)
    return (
      <div className="pkd-page">
        <div className="pkd-container">
          <div className="pkd-loading">Đang tải gói tập...</div>
        </div>
      </div>
    );

  const goBookingWizard = () => {
    if (!user) {
      sessionStorage.setItem("redirectAfterLogin", `${location.pathname}${location.search}`);
      navigate("/login");
      return;
    }

    navigate(`/member/booking/wizard?gymId=${pkg.gymId}&packageId=${pkg.id}`);
  };

  return (
    <div className="pkd-page">
      <div className="pkd-container">
        <section className="pkd-hero">
          <button
            className="pkd-back"
            onClick={() =>
              window.history.length > 1 ? navigate(-1) : navigate("/marketplace/gyms")
            }
          >
            <ArrowLeft size={18} />
            <span>Quay lại</span>
          </button>

          <div className="pkd-heroContent">
            <span className={`pkd-status ${pkg.isActive ? "on" : "off"}`}>{statusLabel}</span>

            <h1 className="pkd-title">
              {pkg.name}
            </h1>

            <div className="pkd-sub">
              {pkg.sessions} buổi • {pkg.durationDays} ngày • {pkg.type || "basic"}
            </div>

            <div className="pkd-sub" style={{ marginTop: 6 }}>
              Gói PT dùng chung cho tất cả huấn luyện viên trong gym
            </div>

            <div className="pkd-heroStats">
              <span className="pkd-pill">
                Giá <b>{fmtMoney(pkg.price)}</b>
              </span>
              <span className="pkd-pill">
                Buổi tập <b>{pkg.sessions}</b>
              </span>
              <span className="pkd-pill">
                Thời hạn <b>{pkg.durationDays} ngày</b>
              </span>
            </div>
          </div>

          <div className="pkd-bgText">PACK</div>
        </section>

        <div className="pkd-content">
          <div className="pkd-main">
            <section className="pkd-card">
              <div className="pkd-cardHead">
                <h3>Mô tả</h3>
              </div>
              <p>{pkg.description || "Chưa có mô tả."}</p>
            </section>

            <section className="pkd-card">
              <div className="pkd-cardHead">
                <h3>Chi tiết gói</h3>
              </div>

              <div className="pkd-specs">
                <div className="pkd-spec">
                  <span className="pkd-specIcon">
                    <Dumbbell size={16} />
                  </span>
                  <span className="pkd-specLabel">Số buổi</span>
                  <b>{pkg.sessions}</b>
                </div>

                <div className="pkd-spec">
                  <span className="pkd-specIcon">
                    <CalendarDays size={16} />
                  </span>
                  <span className="pkd-specLabel">Thời hạn</span>
                  <b>{pkg.durationDays} ngày</b>
                </div>

                <div className="pkd-spec">
                  <span className="pkd-specIcon">
                    <PackageIcon size={16} />
                  </span>
                  <span className="pkd-specLabel">Tối đa / tuần</span>
                  <b>{pkg.maxSessionsPerWeek || "—"}</b>
                </div>

                <div className="pkd-spec">
                  <span className="pkd-specIcon">
                    <PackageIcon size={16} />
                  </span>
                  <span className="pkd-specLabel">Loại gói</span>
                  <b>{pkg.type || "—"}</b>
                </div>
              </div>
            </section>

            {pkg.Gym && (
              <section className="pkd-card">
                <div className="pkd-cardHead">
                  <h3>Phòng gym</h3>
                </div>

                <div
                  className="pkd-link"
                  onClick={() => navigate(`/marketplace/gyms/${pkg.Gym.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && navigate(`/marketplace/gyms/${pkg.Gym.id}`)
                  }
                >
                  <div className="pkd-linkMain">
                    <div className="pkd-linkTitle">{pkg.Gym.name}</div>
                    <div className="pkd-linkSub">
                      <MapPin size={15} />
                      <span>{pkg.Gym.address}</span>
                    </div>
                  </div>

                  <span className="pkd-linkArrow">
                    <ArrowRight size={18} />
                  </span>
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