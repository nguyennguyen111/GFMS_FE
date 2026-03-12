// src/components/pages/marketplace/gyms/GymListPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mpGetGyms } from "../../../../services/marketplaceService";
import ImageWithFallback from "../../../common/ImageWithFallback";
import { getFirstImage } from "../../../../utils/image";
import "../gyms/Gym.css";

const normalizeStatus = (s) => {
  const v = String(s || "").trim().toLowerCase();
  if (v === "active" || v === "inactive" || v === "suspended") return v;
  if (v === "activated") return "active";
  if (v === "deactivated") return "inactive";
  return v || "unknown";
};

const getAreaFromAddress = (address) => {
  if (!address) return "Khác";
  const parts = address.split(",").map((x) => x.trim()).filter(Boolean);
  return parts[parts.length - 1] || "Khác";
};

const SearchIcon = () => (
  <svg className="gym-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
      stroke="currentColor"
      strokeWidth="2"
      opacity="0.9"
    />
    <path
      d="M21 21l-4.3-4.3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.9"
    />
  </svg>
);

export default function GymListPage() {
  const navigate = useNavigate();
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [area, setArea] = useState("all");
  const [sortKey, setSortKey] = useState("nearest");

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    mpGetGyms()
      .then((res) => {
        if (!mounted) return;

        const data = res.data?.DT || [];

        console.log("========== GYMS RAW ==========");
        console.log(data);

        if (data.length > 0) {
          console.log("========== GYM 0 ==========");
          console.log(data[0]);

          console.log("========== GYM 0 IMAGES ==========");
          console.log(data[0]?.images);
          console.log("typeof images =", typeof data[0]?.images);

          console.log("========== GYM 0 FIRST IMAGE NORMALIZED ==========");
          console.log(getFirstImage(data[0]?.images, "/placeholder-gym.jpg"));
        } else {
          console.log("Không có gym nào trong response.");
        }

        setGyms(data);
      })
      .catch((err) => {
        console.error("mpGetGyms error =", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const areas = useMemo(() => {
    const set = new Set();
    gyms.forEach((g) => set.add(getAreaFromAddress(g.address)));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [gyms]);

  const filteredSorted = useMemo(() => {
    const text = q.trim().toLowerCase();

    let list = gyms
      .map((g) => {
        const normalizedImage = getFirstImage(g.images, "/placeholder-gym.jpg");

        return {
          ...g,
          _status: normalizeStatus(g.status),
          _area: getAreaFromAddress(g.address),
          _img: normalizedImage,
        };
      })
      .filter((g) => {
        const matchText =
          !text || `${g.name || ""} ${g.address || ""}`.toLowerCase().includes(text);
        const matchStatus = status === "all" ? true : g._status === status;
        const matchArea = area === "all" ? true : g._area === area;
        return matchText && matchStatus && matchArea;
      });

    if (sortKey === "name_asc") {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    } else if (sortKey === "name_desc") {
      list.sort((a, b) => String(b.name || "").localeCompare(String(a.name || "")));
    } else if (sortKey === "status") {
      const rank = { active: 0, inactive: 1, suspended: 2, unknown: 3 };
      list.sort((a, b) => (rank[a._status] ?? 9) - (rank[b._status] ?? 9));
    }

    return list;
  }, [gyms, q, status, area, sortKey]);

  const activeCount = useMemo(
    () => gyms.filter((g) => normalizeStatus(g.status) === "active").length,
    [gyms]
  );

  useEffect(() => {
    if (!filteredSorted.length) return;

    console.log("========== FILTERED GYMS ==========");
    console.log(filteredSorted);

    console.log("========== FIRST FILTERED GYM IMAGE ==========");
    console.log(filteredSorted[0]?._img);
  }, [filteredSorted]);

  return (
    <div className="gym-page">
      <section className="gym-hero">
        <div className="gym-hero-inner">
          <div className="gym-hero-head">
            <div>
              <span className="gym-section-label">DANH SÁCH CƠ SỞ</span>
              <h1 className="gym-title">Hệ Thống Phòng Gym GFMS</h1>
              <p className="gym-subtitle">
                Tìm kiếm nhanh theo từ khóa, lọc theo trạng thái/khu vực và sắp xếp gọn gàng.
              </p>
            </div>

            <div className="gym-hero-stats">
              <span className="gym-pill">Tổng: <b>{gyms.length}</b></span>
              <span className="gym-pill">Đang hoạt động: <b>{activeCount}</b></span>
              <span className="gym-pill">Kết quả: <b>{filteredSorted.length}</b></span>
            </div>
          </div>

          <div className="gym-toolbar" role="search">
            <div className="gym-search">
              <SearchIcon />
              <input
                placeholder="Tìm theo tên gym, đường, quận, thành phố..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <button className="gym-clear" onClick={() => setQ("")} aria-label="Clear">
                  ✕
                </button>
              )}
            </div>

            <div className="gym-toolbar-row">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
                <option value="suspended">Tạm khóa</option>
              </select>

              <select value={area} onChange={(e) => setArea(e.target.value)}>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a === "all" ? "Tất cả khu vực" : a}
                  </option>
                ))}
              </select>

              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="nearest">Sắp xếp: Gần nhất</option>
                <option value="name_asc">Tên (A → Z)</option>
                <option value="name_desc">Tên (Z → A)</option>
                <option value="status">Trạng thái (Active trước)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="gym-result">
        <div className="gym-result-header">
          <span>
            {loading ? "Đang tải..." : `${filteredSorted.length} kết quả được tìm thấy`}
          </span>
          <span className="gym-tip">Tip: click vào card để xem chi tiết</span>
        </div>

        <div className="gym-chips">
          {["all", "active", "inactive", "suspended"].map((s) => (
            <button
              key={s}
              className={`gym-chip ${status === s ? "active" : ""}`}
              onClick={() => setStatus(s)}
            >
              {s === "all"
                ? "Tất cả"
                : s === "active"
                ? "Đang hoạt động"
                : s === "inactive"
                ? "Ngừng hoạt động"
                : "Tạm khóa"}
            </button>
          ))}
        </div>

        {loading && <div className="gym-loading">Đang tải danh sách phòng gym...</div>}

        {!loading && filteredSorted.length === 0 && (
          <div className="gym-empty">
            Không tìm thấy phòng gym phù hợp. Thử đổi từ khóa hoặc bộ lọc nhé.
          </div>
        )}

        <div className="gym-grid">
          {!loading &&
            filteredSorted.map((gym, index) => {
              const badgeStatus = gym._status;

              if (index < 3) {
                console.log(`GYM CARD ${index}:`, {
                  id: gym.id,
                  name: gym.name,
                  rawImages: gym.images,
                  normalizedImage: gym._img,
                });
              }

              return (
                <div
                  key={gym.id}
                  className="gym-card"
                  onClick={() => navigate(`/marketplace/gyms/${gym.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/marketplace/gyms/${gym.id}`)}
                >
                  <div className="gym-card__img">
                    <ImageWithFallback
                      src={gym._img}
                      alt={gym.name}
                      fallback="/placeholder-gym.jpg"
                    />
                    <div className="gym-img-overlay" />
                    <span className={`gym-badge ${badgeStatus}`}>
                      {badgeStatus === "unknown" ? "N/A" : badgeStatus}
                    </span>
                  </div>

                  <div className="gym-card__body">
                    <div className="gym-card__top">
                      <h3 title={gym.name}>{gym.name}</h3>
                    </div>

                    <p className="gym-card__sub" title={gym.address}>
                      {gym.address || "Chưa có địa chỉ"}
                    </p>

                    <div className="gym-meta">
                      <span className="gym-tag">🏋️ Gym</span>
                      <span className="gym-tag">📍 {gym._area}</span>
                      {gym.phone && <span className="gym-tag">📞 {gym.phone}</span>}
                      {gym.openingHours && <span className="gym-tag">🕒 {gym.openingHours}</span>}
                      {gym.rating && <span className="gym-tag">⭐ {gym.rating}</span>}
                    </div>

                    <div className="gym-card__footer">
                      <span>Nhấn để xem chi tiết</span>
                      <span className="gym-view">Xem →</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}