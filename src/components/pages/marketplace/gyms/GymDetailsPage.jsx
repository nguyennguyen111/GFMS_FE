// src/components/pages/marketplace/gyms/GymDetailsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  mpGetGymDetail,
  mpGetTrainers,
  mpGetPackages,
} from "../../../../services/marketplaceService";
import ImageWithFallback from "../../../common/ImageWithFallback";
import { getCurrentUser } from "../../../../utils/auth";
import "./GymDetailsPage.css";

const Stat = ({ label, value }) => (
  <div className="gd-stat">
    <span>{label}</span>
    <b>{value}</b>
  </div>
);

const Card = ({ title, right, children }) => (
  <div className="gd-card">
    <div className="gd-cardHead">
      <h3>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

export default function GymDetailsPage() {
  const { gymId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [gym, setGym] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = getCurrentUser();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [gymRes, trainerRes, packageRes] = await Promise.all([
          mpGetGymDetail(gymId),
          mpGetTrainers({ gymId }),
          mpGetPackages({ gymId }),
        ]);
        if (!mounted) return;

        setGym(gymRes.data?.DT || null);
        setTrainers(trainerRes.data?.DT || []);
        setPackages(packageRes.data?.DT || []);
      } finally {
        setLoading(false);
      }
    })();

    return () => (mounted = false);
  }, [gymId]);

  const cover = useMemo(() => {
    const imgs = gym?.images;
    if (Array.isArray(imgs) && imgs.length) return imgs[0];
    return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1600&auto=format&fit=crop";
  }, [gym]);

  const status = String(gym?.status || "").toLowerCase();
  const statusLabel =
    status === "active"
      ? "ĐANG HOẠT ĐỘNG"
      : status === "inactive"
      ? "NGỪNG HOẠT ĐỘNG"
      : status === "suspended"
      ? "TẠM KHÓA"
      : "N/A";

  const requireLoginThenGoBooking = () => {
    if (!user) {
      sessionStorage.setItem(
        "redirectAfterLogin",
        `${location.pathname}${location.search}`
      );
      navigate("/login");
      return;
    }

    navigate(`/member/booking/wizard?gymId=${gym.id}`);
  };

  if (loading)
    return (
      <div className="gd-page">
        <div className="gd-container">Đang tải gym...</div>
      </div>
    );

  if (!gym)
    return (
      <div className="gd-page">
        <div className="gd-container">Không tìm thấy gym</div>
      </div>
    );

  return (
    <div className="gd-page">
      <div className="gd-container">
        <section className="gd-hero">
          <div className="gd-heroMedia">
            <img src={cover} alt={gym.name} />
            <div className="gd-heroOverlay" />
          </div>

          <button
            className="gd-back"
            onClick={() =>
              window.history.length > 1 ? navigate(-1) : navigate("/marketplace/gyms")
            }
          >
            ← Quay lại
          </button>

          <div className="gd-heroContent">
            <div className="gd-heroLeft">
              <div className="gd-breadcrumb">DANH SÁCH CƠ SỞ</div>
              <h1 className="gd-title">{gym.name}</h1>
              <div className="gd-sub">
                <span className="material-symbols-outlined">location_on</span>
                {gym.address || "—"}
              </div>

              <div className="gd-badges">
                <span className={`gd-status ${status || "unknown"}`}>{statusLabel}</span>
                {gym.operatingHours && <span className="gd-chip">🕒 {gym.operatingHours}</span>}
                {gym.phone && <span className="gd-chip">📞 {gym.phone}</span>}
              </div>
            </div>

            <div className="gd-heroRight">
              <button className="gd-cta" onClick={requireLoginThenGoBooking}>
                Đặt lịch ngay
              </button>

              <button
                className="gd-cta ghost"
                onClick={() => navigate(`/marketplace/trainers?gymId=${gym.id}`)}
              >
                Xem PT của gym →
              </button>
            </div>
          </div>
        </section>

        <section className="gd-stats">
          <Stat label="Huấn luyện viên" value={trainers.length} />
          <Stat label="Gói tập" value={packages.length} />
          <Stat label="Giờ mở cửa" value={gym.operatingHours || "—"} />
          <Stat label="Liên hệ" value={gym.phone || "—"} />
        </section>

        <section className="gd-grid">
          <div className="gd-left">
            <Card title="Giới thiệu">
              <div className="gd-text">{gym.description || "Gym chưa cập nhật mô tả."}</div>
            </Card>

            <Card
              title="Huấn luyện viên"
              right={trainers.length ? <span className="gd-muted">{trainers.length} PT</span> : null}
            >
              {trainers.length ? (
                <div className="gd-list">
                  {trainers.map((t) => (
                    <div
                      key={t.id}
                      className="gd-item"
                      onClick={() => navigate(`/marketplace/trainers/${t.id}`)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="gd-ava">
                        <ImageWithFallback
                          src={t.User?.avatar}
                          alt={t.User?.username}
                          fallback="/placeholder-pt.jpg"
                        />
                      </div>
                      <div className="gd-itemInfo">
                        <div className="gd-itemTitle">{t.User?.username || "PT"}</div>
                        <div className="gd-itemMeta">
                          ⭐ {Number(t.rating || 0).toFixed(1)} •{" "}
                          {t.specialization || "Personal Trainer"}
                        </div>
                      </div>
                      <span className="gd-itemGo">Xem →</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gd-muted">Chưa có huấn luyện viên.</div>
              )}
            </Card>

            <Card
              title="Gói tập"
              right={packages.length ? <span className="gd-muted">{packages.length} gói</span> : null}
            >
              {packages.length ? (
                <div className="gd-pkgs">
                  {packages.map((p) => (
                    <div
                      key={p.id}
                      className="gd-pkg"
                      onClick={() => navigate(`/marketplace/packages/${p.id}`)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="gd-pkgTop">
                        <div className="gd-pkgName">{p.name}</div>
                        <div className="gd-pkgPrice">
                          {Number(p.price || 0).toLocaleString("vi-VN")}đ
                        </div>
                      </div>
                      <div className="gd-pkgMeta">
                        📦 {p.sessions} buổi • ⏱ {p.durationDays} ngày • {p.type || "basic"}
                      </div>
                      <span className="gd-pill">Xem chi tiết →</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gd-muted">Chưa có gói tập.</div>
              )}
            </Card>
          </div>

          <div className="gd-right">
            <Card title="Thông tin liên hệ">
              <div className="gd-text" style={{ lineHeight: 1.7 }}>
                <div>📞 {gym.phone || "—"}</div>
                <div>✉️ {gym.email || "—"}</div>
                <div>📍 {gym.address || "—"}</div>
              </div>
            </Card>

            <Card
              title="Ảnh gym"
              right={
                Array.isArray(gym.images) && gym.images.length ? (
                  <span className="gd-muted">{gym.images.length} ảnh</span>
                ) : null
              }
            >
              {Array.isArray(gym.images) && gym.images.length ? (
                <div className="gd-gallery">
                  {gym.images.slice(0, 6).map((url, i) => (
                    <img key={i} src={url} alt={`Gym photo ${i + 1}`} />
                  ))}
                </div>
              ) : (
                <div className="gd-muted">Chưa có ảnh.</div>
              )}

              <button className="gd-cta2" onClick={requireLoginThenGoBooking}>
                Đặt lịch PT ngay
              </button>
              <div className="gd-muted" style={{ fontSize: 12, marginTop: 8 }}>
                Chọn PT và lịch tập trong bước tiếp theo.
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}