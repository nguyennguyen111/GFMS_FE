import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  Star,
  ArrowRight,
  Dumbbell,
  Users,
  Package as PackageIcon,
} from "lucide-react";
import { mpGetTrainers, mpGetGymDetail } from "../../../../services/marketplaceService";
import ImageWithFallback from "../../../common/ImageWithFallback";
import "./Trainer.css";

const getTrainerAvatar = (t) => t?.User?.avatar || null;
const isActiveTrainer = (t) => t?.isActive !== false;

const getAreaFromTrainer = (t) => {
  const addr = t?.Gym?.address || "";
  if (!addr) return t?.Gym?.name ? "Hệ thống Gym" : "Khác";
  const parts = addr.split(",").map((x) => x.trim()).filter(Boolean);
  return parts[parts.length - 1] || "Khác";
};

const getTrainerGymId = (t) => t?.Gym?.id || t?.gymId || null;

const getTrainerGymName = (t, fallbackName = "") =>
  t?.Gym?.name || fallbackName || `Gym #${getTrainerGymId(t) || "N/A"}`;

export default function TrainerListPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const presetGymId = sp.get("gymId") ? Number(sp.get("gymId")) : null;

  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presetGymName, setPresetGymName] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [area, setArea] = useState("all");
  const [gymFilter, setGymFilter] = useState(presetGymId ? String(presetGymId) : "all");
  const [sortKey, setSortKey] = useState("rating_desc");

  useEffect(() => {
    setGymFilter(presetGymId ? String(presetGymId) : "all");
  }, [presetGymId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      mpGetTrainers(presetGymId ? { gymId: presetGymId } : {}),
      presetGymId ? mpGetGymDetail(presetGymId) : Promise.resolve(null),
    ])
      .then(([trainerRes, gymRes]) => {
        if (!mounted) return;

        const data = trainerRes?.data?.DT || [];

        const enriched = data.map((t) => ({
          ...t,
          rating: Number.isFinite(t.rating) ? t.rating : Math.random() * 1.2 + 3.8,
          clientsCount: Number.isFinite(t.clientsCount)
            ? t.clientsCount
            : Math.floor(Math.random() * 40),
          packageCount: Number.isFinite(t.packageCount)
            ? t.packageCount
            : Math.floor(Math.random() * 10),
        }));

        setTrainers(enriched);
        setPresetGymName(gymRes?.data?.DT?.name || "");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [presetGymId]);

  const areas = useMemo(() => {
    const set = new Set();
    trainers.forEach((t) => set.add(getAreaFromTrainer(t)));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [trainers]);

  const gyms = useMemo(() => {
    const map = new Map();

    trainers.forEach((t) => {
      const id = getTrainerGymId(t);
      if (!id) return;

      const label =
        String(id) === String(presetGymId)
          ? getTrainerGymName(t, presetGymName)
          : getTrainerGymName(t);

      map.set(String(id), label);
    });

    if (presetGymId && !map.has(String(presetGymId))) {
      map.set(String(presetGymId), presetGymName || `Gym #${presetGymId}`);
    }

    return [
      { value: "all", label: "Tất cả gym" },
      ...Array.from(map.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [trainers, presetGymId, presetGymName]);

  const filteredSorted = useMemo(() => {
    const text = q.trim().toLowerCase();

    let list = trainers
      .map((t) => ({
        ...t,
        _active: isActiveTrainer(t),
        _area: getAreaFromTrainer(t),
        _avatar: getTrainerAvatar(t),
        _gymId: getTrainerGymId(t),
        _gymName:
          String(getTrainerGymId(t)) === String(presetGymId)
            ? getTrainerGymName(t, presetGymName)
            : getTrainerGymName(t),
      }))
      .filter((t) => {
        const matchText =
          !text ||
          `${t.User?.username || ""} ${t.specialization || ""} ${t._gymName || ""}`
            .toLowerCase()
            .includes(text);

        const matchStatus =
          status === "all" ? true : status === "active" ? t._active : !t._active;

        const matchArea = area === "all" ? true : t._area === area;

        const matchGym =
          gymFilter === "all" ? true : String(t._gymId || "") === String(gymFilter);

        return matchText && matchStatus && matchArea && matchGym;
      });

    if (sortKey === "rating_desc") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortKey === "rating_asc") {
      list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else if (sortKey === "name_asc") {
      list.sort((a, b) =>
        String(a.User?.username || "").localeCompare(String(b.User?.username || ""))
      );
    } else if (sortKey === "clients_desc") {
      list.sort((a, b) => (b.clientsCount || 0) - (a.clientsCount || 0));
    } else if (sortKey === "packages_desc") {
      list.sort((a, b) => (b.packageCount || 0) - (a.packageCount || 0));
    } else if (sortKey === "status") {
      list.sort((a, b) => Number(b._active) - Number(a._active));
    }

    return list;
  }, [trainers, q, status, area, gymFilter, sortKey, presetGymId, presetGymName]);

  const activeCount = useMemo(
    () => trainers.filter((t) => isActiveTrainer(t)).length,
    [trainers]
  );

  return (
    <div className="pt-page">
      <section className="pt-hero">
        <div className="pt-hero-inner">
          <div className="pt-hero-copy">
            <span className="pt-section-label">HUẤN LUYỆN VIÊN GFMS</span>

            <h1 className="pt-title">
              FIND YOUR <br />
              <span className="pt-title-accent">TRAINER</span>
            </h1>

            <p className="pt-subtitle">
              Tìm PT phù hợp theo chuyên môn, khu vực, gym và đánh giá để bắt đầu
              hành trình tập luyện đúng mục tiêu.
            </p>

            {presetGymId && (
              <p className="pt-subtitle pt-subtitle--small">
                Đang xem PT của gym: <b>{presetGymName || `#${presetGymId}`}</b>
              </p>
            )}

            <div className="pt-hero-stats">
              <span className="pt-pill">
                Tổng PT <b>{trainers.length}</b>
              </span>
              <span className="pt-pill">
                Đang hoạt động <b>{activeCount}</b>
              </span>
              <span className="pt-pill">
                Kết quả <b>{filteredSorted.length}</b>
              </span>
            </div>

            <div className="pt-toolbar" role="search">
              <div className="pt-search">
                <Search size={18} className="pt-search-icon" />
                <input
                  placeholder="Tìm theo tên PT, chuyên môn, gym..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q && (
                  <button type="button" className="pt-clear" onClick={() => setQ("")} aria-label="Clear">
                    ✕
                  </button>
                )}
              </div>

              <div className="pt-toolbar-row">
                <select value={area} onChange={(e) => setArea(e.target.value)}>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a === "all" ? "KHU VỰC" : a}
                    </option>
                  ))}
                </select>

                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="all">TRẠNG THÁI</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm offline</option>
                </select>

                <select value={gymFilter} onChange={(e) => setGymFilter(e.target.value)}>
                  {gyms.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.value === "all" ? "GYM" : g.label}
                    </option>
                  ))}
                </select>

                <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                  <option value="rating_desc">SẮP XẾP</option>
                  <option value="rating_desc">Rating cao → thấp</option>
                  <option value="rating_asc">Rating thấp → cao</option>
                  <option value="clients_desc">Học viên nhiều</option>
                  <option value="name_asc">Tên (A → Z)</option>
                  <option value="status">Active trước</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-bg-text">PT</div>
      </section>

      <section className="pt-result">
        <div className="pt-result-header">
          <span>{loading ? "Đang tải..." : `${filteredSorted.length} kết quả được tìm thấy`}</span>
          <span className="pt-tip">Tip: click vào card để xem chi tiết</span>
        </div>

        <div className="pt-chips">
          {["all", "active", "inactive"].map((s) => (
            <button
              type="button"
              key={s}
              className={`pt-chip ${status === s ? "active" : ""}`}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? "Tất cả" : s === "active" ? "Đang hoạt động" : "Tạm offline"}
            </button>
          ))}
        </div>

        {loading && <div className="pt-loading">Đang tải danh sách PT...</div>}

        {!loading && filteredSorted.length === 0 && (
          <div className="pt-empty">
            Không tìm thấy PT phù hợp. Thử đổi từ khóa hoặc bộ lọc nhé.
          </div>
        )}

        <div className="pt-grid">
          {!loading &&
            filteredSorted.map((t) => {
              const name = t.User?.username || "PT";
              const avatar = t._avatar;
              const active = t._active;

              return (
                <article
                  key={t.id}
                  className="pt-card"
                  onClick={() => navigate(`/marketplace/trainers/${t.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && navigate(`/marketplace/trainers/${t.id}`)
                  }
                >
                  <div className="pt-card__img">
                    <ImageWithFallback
                      src={avatar}
                      alt={name}
                      fallback="/placeholder-pt.jpg"
                    />
                    <div className="pt-img-overlay" />

                    <span className={`pt-badge ${active ? "active" : "inactive"}`}>
                      {active ? "ACTIVE" : "OFFLINE"}
                    </span>
                  </div>

                  <div className="pt-card__body">
                    <div className="pt-card__header">
                      <div className="pt-card__title-wrap">
                        <h3 title={name}>{name}</h3>

                        <div className="pt-card__subtitle" title={t.specialization || ""}>
                          <span>{t.specialization || "Personal Trainer"}</span>
                        </div>
                      </div>

                      <div className="pt-card__rating">
                        <Star size={16} fill="currentColor" />
                        <span>{Number(t.rating || 0).toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="pt-meta">
                      <span className="pt-tag">
                        <span className="pt-tag-icon">
                          <Users size={16} />
                        </span>
                        <span className="pt-tag-label">{t.clientsCount || 0} học viên</span>
                      </span>

                      <span className="pt-tag">
                        <span className="pt-tag-icon">
                          <PackageIcon size={16} />
                        </span>
                        <span className="pt-tag-label">{t.packageCount || 0} gói</span>
                      </span>

                      <span className="pt-tag">
                        <span className="pt-tag-icon">
                          <Dumbbell size={16} />
                        </span>
                        <span className="pt-tag-label">{t._gymName}</span>
                      </span>

                      <span className="pt-tag">
                        <span className="pt-tag-icon">
                          <MapPin size={16} />
                        </span>
                        <span className="pt-tag-label">{t._area}</span>
                      </span>
                    </div>

                    <div className="pt-card__footer">
                      <div className="pt-card__footer-text">
                        <span className="pt-card__footer-label">KHÁM PHÁ NGAY</span>
                        <div className="pt-card__footer-value">Xem hồ sơ PT</div>
                      </div>

                      <button
                        type="button"
                        className="pt-arrow-btn"
                        aria-label={`Xem chi tiết ${name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/marketplace/trainers/${t.id}`);
                        }}
                      >
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>
    </div>
  );
}