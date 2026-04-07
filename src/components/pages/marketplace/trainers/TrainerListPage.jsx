import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  Star,
  ArrowRight,
  Dumbbell,
  Users,
  SlidersHorizontal,
  Building2,
  BriefcaseBusiness,
} from "lucide-react";
import { mpGetTrainers, mpGetGymDetail } from "../../../../services/marketplaceService";
import ImageWithFallback from "../../../common/ImageWithFallback";
import Pagination from "../../../common/Pagination";
import "./Trainer.css";

const PAGE_SIZE = 9;
const FETCH_LIMIT = 100;

const getTrainerAvatar = (t) => t?.User?.avatar || null;
const isActiveTrainer = (t) => t?.isActive !== false;

const getAreaFromTrainer = (t) => {
  const addr = t?.Gym?.address || "";
  if (!addr) return t?.Gym?.name ? "Hệ thống Gym" : "Khác";
  const parts = addr
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || "Khác";
};

const getTrainerGymId = (t) => t?.Gym?.id || t?.gymId || null;

const getTrainerGymName = (t, fallbackName = "") =>
  t?.Gym?.name || fallbackName || `Gym #${getTrainerGymId(t) || "N/A"}`;

async function fetchAllTrainers() {
  const firstRes = await mpGetTrainers({ page: 1, limit: FETCH_LIMIT });
  const firstPayload = firstRes?.data?.DT || {};
  const firstItems = Array.isArray(firstPayload.items) ? firstPayload.items : [];
  const totalPages = Number(firstPayload.pagination?.totalPages || 1);

  if (totalPages <= 1) return firstItems;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, idx) =>
      mpGetTrainers({ page: idx + 2, limit: FETCH_LIMIT })
    )
  );

  const restItems = rest.flatMap((res) => {
    const payload = res?.data?.DT || {};
    return Array.isArray(payload.items) ? payload.items : [];
  });

  return [...firstItems, ...restItems];
}

export default function TrainerListPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const presetGymId = sp.get("gymId") ? Number(sp.get("gymId")) : null;

  const [allTrainers, setAllTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presetGymName, setPresetGymName] = useState("");
  const [page, setPage] = useState(1);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [area, setArea] = useState("all");
  const [gymFilter, setGymFilter] = useState(presetGymId ? String(presetGymId) : "all");
  const [sortKey, setSortKey] = useState("featured");

  useEffect(() => {
    setGymFilter(presetGymId ? String(presetGymId) : "all");
  }, [presetGymId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      fetchAllTrainers(),
      presetGymId ? mpGetGymDetail(presetGymId) : Promise.resolve(null),
    ])
      .then(([trainerItems, gymRes]) => {
        if (!mounted) return;
        setAllTrainers(Array.isArray(trainerItems) ? trainerItems : []);
        setPresetGymName(gymRes?.data?.DT?.name || "");
      })
      .catch((err) => {
        console.error("fetchAllTrainers error", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [presetGymId]);

  useEffect(() => {
    setPage(1);
  }, [q, status, area, gymFilter, sortKey]);

  const normalizedTrainers = useMemo(() => {
    return allTrainers.map((t) => ({
      ...t,
      _active: isActiveTrainer(t),
      _area: getAreaFromTrainer(t),
      _avatar: getTrainerAvatar(t),
      _gymId: getTrainerGymId(t),
      _gymName:
        String(getTrainerGymId(t)) === String(presetGymId)
          ? getTrainerGymName(t, presetGymName)
          : getTrainerGymName(t),
      _rating: Number(t.avgRating || t.rating || 0),
      _reviewCount: Number(t.reviewCount || 0),
      _clientsCount: Number(t.studentsCount || t.clientsCount || 0),
      _packageCount: Number(t.packageCount || 0),
      _experienceYears: Number(t.experienceYears || 0),
    }));
  }, [allTrainers, presetGymId, presetGymName]);

  const areas = useMemo(() => {
    const set = new Set();
    normalizedTrainers.forEach((t) => set.add(t._area));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [normalizedTrainers]);

  const gyms = useMemo(() => {
    const map = new Map();

    normalizedTrainers.forEach((t) => {
      if (!t._gymId) return;
      map.set(String(t._gymId), t._gymName);
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
  }, [normalizedTrainers, presetGymId, presetGymName]);

  const filteredSorted = useMemo(() => {
    const text = q.trim().toLowerCase();

    const list = normalizedTrainers.filter((t) => {
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
      list.sort((a, b) => b._rating - a._rating);
    } else if (sortKey === "rating_asc") {
      list.sort((a, b) => a._rating - b._rating);
    } else if (sortKey === "name_asc") {
      list.sort((a, b) =>
        String(a.User?.username || "").localeCompare(String(b.User?.username || ""))
      );
    } else if (sortKey === "clients_desc") {
      list.sort((a, b) => b._clientsCount - a._clientsCount);
    } else if (sortKey === "packages_desc") {
      list.sort((a, b) => b._packageCount - a._packageCount);
    } else if (sortKey === "experience_desc") {
      list.sort((a, b) => b._experienceYears - a._experienceYears);
    } else if (sortKey === "gym_asc") {
      list.sort((a, b) => String(a._gymName || "").localeCompare(String(b._gymName || "")));
    } else if (sortKey === "status") {
      list.sort((a, b) => Number(b._active) - Number(a._active));
    } else {
      list.sort((a, b) => {
        const scoreA =
          (a._active ? 1000 : 0) +
          a._rating * 100 +
          a._clientsCount * 3 +
          a._packageCount * 2 +
          a._experienceYears;
        const scoreB =
          (b._active ? 1000 : 0) +
          b._rating * 100 +
          b._clientsCount * 3 +
          b._packageCount * 2 +
          b._experienceYears;
        return scoreB - scoreA;
      });
    }

    return list;
  }, [normalizedTrainers, q, status, area, gymFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));

  const paginatedTrainers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const totalCount = normalizedTrainers.length;
  const activeCount = normalizedTrainers.filter((t) => t._active).length;

  return (
    <div className="market-page market-page--trainer">
      <section className="market-hero">
        <div className="market-shell">
          <div className="market-hero__content">
            <span className="market-kicker">Đội ngũ huấn luyện viên</span>

            <h1 className="market-title">
              Danh sách PT
            </h1>

            {presetGymId && (
              <p className="market-subtitle market-subtitle--small">
                Đang xem PT thuộc gym: <b>{presetGymName || `#${presetGymId}`}</b>
              </p>
            )}

            <div className="market-stats">
              <div className="market-stat-card">
                <span className="market-stat-card__label">Tổng PT</span>
                <strong>{totalCount}</strong>
              </div>
              <div className="market-stat-card">
                <span className="market-stat-card__label">Đang hoạt động</span>
                <strong>{activeCount}</strong>
              </div>
              <div className="market-stat-card">
                <span className="market-stat-card__label">Kết quả phù hợp</span>
                <strong>{filteredSorted.length}</strong>
              </div>
            </div>

            <div className="market-panel" role="search">
              <div className="market-search">
                <Search size={18} className="market-search__icon" />
                <input
                  placeholder="Tìm theo tên PT, chuyên môn, gym..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q && (
                  <button
                    type="button"
                    className="market-search__clear"
                    onClick={() => setQ("")}
                    aria-label="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="market-filters">
                <div className="market-filter">
                  <SlidersHorizontal size={16} />
                  <select value={area} onChange={(e) => setArea(e.target.value)}>
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a === "all" ? "Tất cả khu vực" : a}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="market-filter">
                  <BriefcaseBusiness size={16} />
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Tạm offline</option>
                  </select>
                </div>

                <div className="market-filter">
                  <Building2 size={16} />
                  <select value={gymFilter} onChange={(e) => setGymFilter(e.target.value)}>
                    {gyms.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="market-filter">
                  <ArrowRight size={16} />
                  <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                    <option value="featured">Nổi bật</option>
                    <option value="rating_desc">Rating cao → thấp</option>
                    <option value="rating_asc">Rating thấp → cao</option>
                    <option value="clients_desc">Nhiều học viên</option>
                    <option value="packages_desc">Nhiều gói tập</option>
                    <option value="experience_desc">Kinh nghiệm cao</option>
                    <option value="name_asc">Tên A → Z</option>
                    <option value="gym_asc">Gym A → Z</option>
                    <option value="status">Ưu tiên active</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="market-hero__ghost">PT</div>
      </section>

      <section className="market-content">
        <div className="market-shell">
          <div className="market-content__top">
            <div>
              <h2>Danh sách huấn luyện viên</h2>
              <p>{loading ? "Đang tải dữ liệu..." : `${filteredSorted.length} kết quả phù hợp`}</p>
            </div>

            <div className="market-chips">
              {["all", "active", "inactive"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`market-chip ${status === s ? "active" : ""}`}
                  onClick={() => setStatus(s)}
                >
                  {s === "all" ? "Tất cả" : s === "active" ? "Đang hoạt động" : "Tạm offline"}
                </button>
              ))}
            </div>
          </div>

          {loading && <div className="market-empty">Đang tải danh sách PT...</div>}

          {!loading && filteredSorted.length === 0 && (
            <div className="market-empty">
              Không tìm thấy PT phù hợp. Hãy thử thay đổi từ khóa hoặc bộ lọc.
            </div>
          )}

          <div className="market-grid">
            {!loading &&
              paginatedTrainers.map((t) => {
                const name = t.User?.username || "PT";

                return (
                  <article
                    key={t.id}
                    className="market-card"
                    onClick={() => navigate(`/marketplace/trainers/${t.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && navigate(`/marketplace/trainers/${t.id}`)
                    }
                  >
                    <div className="market-card__media">
                      <ImageWithFallback
                        src={t._avatar}
                        alt={name}
                        fallback="/placeholder-pt.jpg"
                      />
                      <div className="market-card__overlay" />
                      <span className={`market-badge ${t._active ? "active" : "inactive"}`}>
                        {t._active ? "Đang hoạt động" : "Tạm offline"}
                      </span>
                    </div>

                    <div className="market-card__body">
                      <div className="market-card__head">
                        <div className="market-card__title-wrap">
                          <h3 title={name}>{name}</h3>
                          <p title={t.specialization || ""}>
                            {t.specialization || "Personal Trainer"}
                          </p>
                        </div>

                        <div className="market-card__rating">
                          <Star size={15} fill="currentColor" />
                          <span>{t._rating.toFixed(1)}</span>
                          <small>({t._reviewCount})</small>
                        </div>
                      </div>

                      <div className="market-meta">
                        <span className="market-meta__item">
                          <Users size={15} />
                          {t._clientsCount} học viên
                        </span>
                        <span className="market-meta__item">
                          <Dumbbell size={15} />
                          {t._gymName}
                        </span>
                        <span className="market-meta__item">
                          <MapPin size={15} />
                          {t._area}
                        </span>
                      </div>

                      <div className="market-card__footer">
                        <div>
                          <span className="market-card__label">Xem chi tiết</span>
                          <strong>Hồ sơ huấn luyện viên</strong>
                        </div>

                        <button
                          type="button"
                          className="market-card__action"
                          aria-label={`Xem chi tiết ${name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/marketplace/trainers/${t.id}`);
                          }}
                        >
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>

          {!loading && totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </div>
      </section>
    </div>
  );
}