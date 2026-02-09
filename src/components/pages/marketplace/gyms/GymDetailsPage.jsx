import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  mpGetGymDetail,
  mpGetTrainers,
  mpGetPackages,
} from "../../../../services/marketplaceService";

import GymHero from "./GymHero";
import ImageWithFallback from "../../../common/ImageWithFallback";
import "../Marketplace.css";

export default function GymDetailsPage() {
  const { gymId } = useParams();
  const navigate = useNavigate();

  const [gym, setGym] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const [gymRes, trainerRes, packageRes] = await Promise.all([
          mpGetGymDetail(gymId),
          mpGetTrainers({ gymId }),
          mpGetPackages({ gymId }),
        ]);

        if (!mounted) return;

        setGym(gymRes.data?.DT);
        setTrainers(trainerRes.data?.DT || []);
        setPackages(packageRes.data?.DT || []);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, [gymId]);

  if (loading) return <div className="pd-page">Đang tải gym...</div>;
  if (!gym) return <div className="pd-page">Không tìm thấy gym</div>;

  return (
    <div className="pd-page">
      {/* ===== HERO ===== */}
      <GymHero gym={gym} />

      {/* ===== CONTENT ===== */}
      <div className="pd-content">
        {/* BASIC INFO */}
        <div className="pd-section">
          <h3>Thông tin cơ bản</h3>
          <ul className="pd-info">
            <li>📞 {gym.phone || "—"}</li>
            <li>✉️ {gym.email || "—"}</li>
            <li>
              🟢 Trạng thái:{" "}
              <strong>{gym.status?.toUpperCase()}</strong>
            </li>
            <li>🕒 Giờ mở cửa: {gym.operatingHours || "Chưa cập nhật"}</li>
          </ul>
        </div>

        {/* DESCRIPTION */}
        {gym.description && (
          <div className="pd-section">
            <h3>Giới thiệu</h3>
            <p>{gym.description}</p>
          </div>
        )}

        {/* TRAINERS */}
        <div className="pd-section">
          <h3>Huấn luyện viên</h3>

          {trainers.length === 0 ? (
            <div className="pd-empty">Chưa có huấn luyện viên</div>
          ) : (
            <div className="mp-grid">
              {trainers.map((t) => (
                <div
                  key={t.id}
                  className="mp-card"
                  onClick={() =>
                    navigate(`/marketplace/trainers/${t.id}`)
                  }
                >
                  <div className="mp-card__img">
                    <ImageWithFallback
                      src={t.User?.avatar}
                      alt={t.User?.username}
                      fallback="/placeholder-pt.jpg"
                    />
                  </div>
                  <div className="mp-card__body">
                    <div className="mp-card__title">
                      {t.User?.username}
                    </div>
                    <div className="mp-card__meta">
                      ⭐ {Number(t.rating || 0).toFixed(1)} •{" "}
                      {t.specialization || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PACKAGES */}
        <div className="pd-section">
          <h3>Gói tập</h3>

          {packages.length === 0 ? (
            <div className="pd-empty">Chưa có gói tập</div>
          ) : (
            <div className="mp-grid">
              {packages.map((p) => (
                <div
                  key={p.id}
                  className="mp-card mp-card--package"
                  onClick={() =>
                    navigate(`/marketplace/packages/${p.id}`)
                  }
                >
                  <div className="mp-card__body">
                    <div className="mp-card__title">{p.name}</div>
                    <div className="mp-card__meta">
                      💰 {Number(p.price).toLocaleString()}đ
                    </div>
                    <div className="mp-card__meta">
                      📦 {p.sessions} buổi • ⏱ {p.durationDays} ngày
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
