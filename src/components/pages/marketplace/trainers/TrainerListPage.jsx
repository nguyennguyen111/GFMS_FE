import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mpGetTrainers } from "../../../../services/marketplaceService";
import ImageWithFallback from "../../../common/ImageWithFallback";
import "../Marketplace.css";

/* ===== helper: avatar an toàn ===== */
const getTrainerAvatar = (t) => {
  return t?.User?.avatar || null;
};

export default function TrainerListPage() {
  const navigate = useNavigate();

  const [trainers, setTrainers] = useState([]);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  useEffect(() => {
    mpGetTrainers().then((res) => {
      const data = res.data?.DT || [];

      // enrich demo data
      const enriched = data.map((t) => ({
        ...t,
        rating: t.rating ?? (Math.random() * 1.2 + 3.8),
        clientsCount: t.clientsCount ?? Math.floor(Math.random() * 40),
        packageCount: t.packageCount ?? Math.floor(Math.random() * 10),
      }));

      setTrainers(enriched);
    });
  }, []);

  /* ===== FILTER ===== */
  const filtered = useMemo(() => {
    return trainers.filter((t) => {
      const matchText = `${t.User?.username} ${t.specialization}`
        .toLowerCase()
        .includes(q.toLowerCase());

      const matchStatus = onlyActive ? t.isActive !== false : true;

      return matchText && matchStatus;
    });
  }, [trainers, q, onlyActive]);

  return (
    <div className="mp-page">
      {/* ===== HEADER ===== */}
      <div className="mp-header">
        <h1 className="mp-heading">Personal Trainers</h1>
        <p className="mp-sub">
          Tìm huấn luyện viên phù hợp với mục tiêu tập luyện của bạn
        </p>
      </div>

      {/* ===== SEARCH + FILTER ===== */}
      <div className="mp-toolbar">
        <input
          className="mp-search"
          placeholder="🔍 Tìm PT theo tên hoặc chuyên môn..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <label className="mp-check">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
          />
          Đang hoạt động
        </label>
      </div>

      {/* ===== GRID ===== */}
      <div className="mp-grid">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="trainer-card"
            onClick={() => navigate(`/marketplace/trainers/${t.id}`)}
          >
            {/* AVATAR */}
            <div className="trainer-card__img">
              <ImageWithFallback
                src={getTrainerAvatar(t)}
                alt={t.User?.username}
                fallback="/placeholder-pt.jpg"
              />

              <span
                className={`trainer-badge ${
                  t.isActive === false ? "inactive" : "active"
                }`}
              >
                {t.isActive === false ? "OFFLINE" : "ACTIVE"}
              </span>
            </div>

            {/* BODY */}
            <div className="trainer-card__body">
              <h3 className="trainer-card__name">
                {t.User?.username}
              </h3>

              <p className="trainer-card__spec">
                {t.specialization || "Personal Trainer"}
              </p>

              <div className="trainer-card__stats">
                <span>⭐ {t.rating.toFixed(1)}</span>
                <span>👥 {t.clientsCount} học viên</span>
                <span>📦 {t.packageCount} gói</span>
              </div>

              {t.Gym && (
                <div className="trainer-card__gym">
                  🏋️ {t.Gym.name}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mp-empty">
          Không tìm thấy huấn luyện viên phù hợp
        </div>
      )}
    </div>
  );
}
