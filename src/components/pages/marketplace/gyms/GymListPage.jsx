import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mpGetGyms } from "../../../../services/marketplaceService";
import ImageWithFallback from "../../../common/ImageWithFallback";
import "../Marketplace.css";

/* ===== helper: parse images an toàn ===== */
const getGymImage = (gym) => {
  if (!gym?.images) return null;

  // DB lưu JSON string
  if (typeof gym.images === "string") {
    try {
      const arr = JSON.parse(gym.images);
      return arr?.[0] || null;
    } catch {
      return null;
    }
  }

  // DB đã là array
  if (Array.isArray(gym.images)) {
    return gym.images[0];
  }

  return null;
};

export default function GymListPage() {
  const navigate = useNavigate();
  const [gyms, setGyms] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    mpGetGyms().then((res) => setGyms(res.data?.DT || []));
  }, []);

  /* ===== FILTER + SEARCH ===== */
  const filtered = useMemo(() => {
    return gyms.filter((g) => {
      const matchText = `${g.name} ${g.address}`
        .toLowerCase()
        .includes(q.toLowerCase());

      const matchStatus =
        status === "all" ? true : g.status === status;

      return matchText && matchStatus;
    });
  }, [gyms, q, status]);

  return (
    <div className="mp-page">
      {/* ===== HEADER ===== */}
      <div className="mp-header">
        <h1 className="mp-heading">Gym & Fitness Centers</h1>
        <p className="mp-sub">
          Khám phá phòng gym, huấn luyện viên và gói tập phù hợp với bạn
        </p>
      </div>

      {/* ===== SEARCH + FILTER ===== */}
      <div className="mp-toolbar">
        <input
          className="mp-search"
          placeholder="🔍 Tìm gym theo tên hoặc địa chỉ..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="mp-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Ngừng hoạt động</option>
          <option value="suspended">Tạm khóa</option>
        </select>
      </div>

      {/* ===== GRID ===== */}
      <div className="mp-grid">
        {filtered.map((gym) => {
          const img = getGymImage(gym);

          return (
            <div
              key={gym.id}
              className="gym-card"
              onClick={() => navigate(`/marketplace/gyms/${gym.id}`)}
            >
              {/* IMAGE */}
              <div className="gym-card__img">
                <ImageWithFallback
                  src={img}
                  alt={gym.name}
                  fallback="/placeholder-gym.jpg"
                />

                <span
                  className={`gym-badge gym-badge--${gym.status}`}
                >
                  {gym.status?.toUpperCase()}
                </span>
              </div>

              {/* BODY */}
              <div className="gym-card__body">
                <h3>{gym.name}</h3>
                <p className="gym-address">{gym.address}</p>

                <div className="gym-meta">
                  <span>🏋️ Gym</span>
                  <span>📍 {gym.address?.split(",")?.[1] || "VN"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mp-empty">
          Không tìm thấy phòng gym phù hợp
        </div>
      )}
    </div>
  );
}
