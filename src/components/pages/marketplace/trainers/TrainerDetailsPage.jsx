import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  mpGetTrainerDetail,
  mpGetPackages,
} from "../../../../services/marketplaceService";
import ImageWithFallback from "../../../common/ImageWithFallback";
import "../Marketplace.css";

export default function TrainerDetailsPage() {
  const { trainerId } = useParams();
  const navigate = useNavigate();

  const [trainer, setTrainer] = useState(null);
  const [packages, setPackages] = useState([]);
  const [tab, setTab] = useState("packages");

  useEffect(() => {
    mpGetTrainerDetail(trainerId).then((res) => {
      const t = res.data?.DT;
      setTrainer(t);

      mpGetPackages({ trainerId: t.id }).then((r) =>
        setPackages(r.data?.DT || [])
      );
    });
  }, [trainerId]);

  if (!trainer) return null;

  return (
    <div className="ig-profile">
      {/* ===== HEADER ===== */}
      <div className="ig-header">
        <div className="ig-avatar">
          <ImageWithFallback
            src={trainer.User?.avatar}
            alt={trainer.User?.username}
            fallback="/placeholder-pt.jpg"
          />
        </div>

        <div className="ig-info">
          <h1>{trainer.User?.username}</h1>
          <p className="ig-spec">
            {trainer.specialization || "Personal Trainer"}
          </p>

          <div className="ig-stats">
            <span>
              <strong>{trainer.rating || 4.8}</strong> ⭐ Rating
            </span>
            <span>
              <strong>{trainer.experienceYears || 3}</strong> năm kinh nghiệm
            </span>
            <span>
              <strong>{packages.length}</strong> gói tập
            </span>
          </div>

          <div className="ig-actions">
            {trainer.Gym && (
              <button
                className="ig-btn ig-btn--outline"
                onClick={() =>
                  navigate(`/marketplace/gyms/${trainer.Gym.id}`)
                }
              >
                🏋️ Xem Gym
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== BIO ===== */}
      <div className="ig-bio">
        <p>💪 Phong cách huấn luyện: Cá nhân hoá – an toàn – hiệu quả</p>
        <p>🎓 Chứng chỉ: {trainer.certification || "—"}</p>
        <p>📍 Khu vực: {trainer.location || "Việt Nam"}</p>
      </div>

      {/* ===== TABS ===== */}
      <div className="ig-tabs">
        <button
          className={tab === "packages" ? "active" : ""}
          onClick={() => setTab("packages")}
        >
          📦 Gói tập
        </button>

        <button
          className={tab === "gym" ? "active" : ""}
          onClick={() => setTab("gym")}
        >
          🏋️ Gym
        </button>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="ig-content">
        {tab === "packages" && (
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

        {tab === "gym" && trainer.Gym && (
          <div
            className="mp-card mp-card--inline"
            onClick={() =>
              navigate(`/marketplace/gyms/${trainer.Gym.id}`)
            }
          >
            <div className="mp-card__title">{trainer.Gym.name}</div>
            <div className="mp-card__meta">{trainer.Gym.address}</div>
          </div>
        )}
      </div>
    </div>
  );
}
