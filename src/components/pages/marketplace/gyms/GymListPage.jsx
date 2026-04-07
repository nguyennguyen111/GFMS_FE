import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Star,
  ArrowRight,
  Dumbbell,
  Phone,
  Clock3,
  SlidersHorizontal,
  Building2,
} from "lucide-react";
import { mpGetGyms } from "../../../../services/marketplaceService";
import ImageWithFallback from "../../../common/ImageWithFallback";
import Pagination from "../../../common/Pagination";
import { getFirstImage } from "../../../../utils/image";
import "../gyms/Gym.css";

const PAGE_SIZE = 9;
const FETCH_LIMIT = 100;

const normalizeStatus = (s) => {
  const v = String(s || "").trim().toLowerCase();
  if (v === "active" || v === "inactive" || v === "suspended") return v;
  if (v === "activated") return "active";
  if (v === "deactivated") return "inactive";
  return v || "unknown";
};

const getAreaFromAddress = (address) => {
  if (!address) return "Khác";
  const parts = address
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || "Khác";
};

const statusLabel = (s) => {
  if (s === "active") return "Đang hoạt động";
  if (s === "inactive") return "Tạm offline";
  if (s === "suspended") return "Tạm khóa";
  return "Chưa rõ";
};

const statusBadgeClass = (s) => {
  if (s === "active") return "active";
  if (s === "inactive") return "inactive";
  if (s === "suspended") return "suspended";
  return "unknown";
};

async function fetchAllGyms() {
  const firstRes = await mpGetGyms({ page: 1, limit: FETCH_LIMIT });
  const firstPayload = firstRes?.data?.DT || {};
  const firstItems = Array.isArray(firstPayload.items) ? firstPayload.items : [];
  const totalPages = Number(firstPayload.pagination?.totalPages || 1);

  if (totalPages <= 1) return firstItems;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, idx) =>
      mpGetGyms({ page: idx + 2, limit: FETCH_LIMIT })
    )
  );

  const restItems = rest.flatMap((res) => {
    const payload = res?.data?.DT || {};
    return Array.isArray(payload.items) ? payload.items : [];
  });

  return [...firstItems, ...restItems];
}

export default function GymListPage() {
  const navigate = useNavigate();

  const [allGyms, setAllGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [area, setArea] = useState("all");
  const [sortKey, setSortKey] = useState("featured");

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchAllGyms()
      .then((items) => {
        if (!mounted) return;
        setAllGyms(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        console.error("fetchAllGyms error =", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, status, area, sortKey]);

  const normalizedGyms = useMemo(() => {
    return allGyms.map((g) => ({
      ...g,
      _status: normalizeStatus(g.status),
      _area: getAreaFromAddress(g.address),
      _img: getFirstImage(g.images, "/placeholder-gym.jpg"),
      _rating: Number(g.avgRating || g.rating || 0),
      _reviewCount: Number(g.reviewCount || 0),
      _updatedAt: new Date(g.updatedAt || g.createdAt || 0).getTime() || 0,
    }));
  }, [allGyms]);

  const areas = useMemo(() => {
    const set = new Set();
    normalizedGyms.forEach((g) => set.add(g._area));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [normalizedGyms]);

  const filteredSorted = useMemo(() => {
    const text = q.trim().toLowerCase();

    const list = normalizedGyms.filter((g) => {
      const matchText =
        !text ||
        `${g.name || ""} ${g.address || ""} ${g.description || ""} ${g.phone || ""}`
          .toLowerCase()
          .includes(text);

      const matchStatus = status === "all" ? true : g._status === status;
      const matchArea = area === "all" ? true : g._area === area;

      return matchText && matchStatus && matchArea;
    });

    if (sortKey === "name_asc") {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    } else if (sortKey === "name_desc") {
      list.sort((a, b) => String(b.name || "").localeCompare(String(a.name || "")));
    } else if (sortKey === "rating_desc") {
      list.sort((a, b) => b._rating - a._rating);
    } else if (sortKey === "rating_asc") {
      list.sort((a, b) => a._rating - b._rating);
    } else if (sortKey === "area_asc") {
      list.sort((a, b) => String(a._area || "").localeCompare(String(b._area || "")));
    } else if (sortKey === "updated_desc") {
      list.sort((a, b) => b._updatedAt - a._updatedAt);
    } else if (sortKey === "status") {
      const rank = { active: 0, inactive: 1, suspended: 2, unknown: 3 };
      list.sort((a, b) => (rank[a._status] ?? 9) - (rank[b._status] ?? 9));
    } else {
      list.sort((a, b) => {
        const scoreA =
          (a._status === "active" ? 1000 : 0) +
          a._rating * 100 +
          (a._updatedAt ? 1 : 0);
        const scoreB =
          (b._status === "active" ? 1000 : 0) +
          b._rating * 100 +
          (b._updatedAt ? 1 : 0);
        return scoreB - scoreA;
      });
    }

    return list;
  }, [normalizedGyms, q, status, area, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));

  const paginatedGyms = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const totalCount = normalizedGyms.length;
  const activeCount = normalizedGyms.filter((g) => g._status === "active").length;
  const suspendedCount = normalizedGyms.filter((g) => g._status === "suspended").length;

  return (
    <div className="market-page market-page--gym">
      <section className="market-hero">
        <div className="market-shell">
          <div className="market-hero__content">
            <span className="market-kicker">Hệ thống phòng tập</span>

            <h1 className="market-title">
              Danh sách Gym
            </h1>

            <div className="market-stats">
              <div className="market-stat-card">
                <span className="market-stat-card__label">Tổng cơ sở</span>
                <strong>{totalCount}</strong>
              </div>
              <div className="market-stat-card">
                <span className="market-stat-card__label">Đang hoạt động</span>
                <strong>{activeCount}</strong>
              </div>
              <div className="market-stat-card">
                <span className="market-stat-card__label">Tạm khóa</span>
                <strong>{suspendedCount}</strong>
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
                  placeholder="Tìm theo tên gym, địa chỉ, mô tả..."
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
                  <Building2 size={16} />
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Tạm offline</option>
                    <option value="suspended">Tạm khóa</option>
                  </select>
                </div>

                <div className="market-filter">
                  <ArrowRight size={16} />
                  <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                    <option value="featured">Nổi bật</option>
                    <option value="name_asc">Tên A → Z</option>
                    <option value="name_desc">Tên Z → A</option>
                    <option value="rating_desc">Đánh giá cao → thấp</option>
                    <option value="rating_asc">Đánh giá thấp → cao</option>
                    <option value="area_asc">Khu vực A → Z</option>
                    <option value="updated_desc">Mới cập nhật</option>
                    <option value="status">Ưu tiên active</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="market-hero__ghost">GYM</div>
      </section>

      <section className="market-content">
        <div className="market-shell">
          <div className="market-content__top">
            <div>
              <h2>Danh sách phòng gym</h2>
              <p>{loading ? "Đang tải dữ liệu..." : `${filteredSorted.length} kết quả phù hợp`}</p>
            </div>

            <div className="market-chips">
              {["all", "active", "inactive", "suspended"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`market-chip ${status === s ? "active" : ""}`}
                  onClick={() => setStatus(s)}
                >
                  {s === "all"
                    ? "Tất cả"
                    : s === "active"
                    ? "Đang hoạt động"
                    : s === "inactive"
                    ? "Tạm offline"
                    : "Tạm khóa"}
                </button>
              ))}
            </div>
          </div>

          {loading && <div className="market-empty">Đang tải danh sách gym...</div>}

          {!loading && filteredSorted.length === 0 && (
            <div className="market-empty">
              Không tìm thấy phòng gym phù hợp. Hãy thử thay đổi từ khóa hoặc bộ lọc.
            </div>
          )}

          <div className="market-grid">
            {!loading &&
              paginatedGyms.map((gym) => (
                <article
                  key={gym.id}
                  className="market-card"
                  onClick={() => navigate(`/marketplace/gyms/${gym.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && navigate(`/marketplace/gyms/${gym.id}`)
                  }
                >
                  <div className="market-card__media">
                    <ImageWithFallback
                      src={gym._img}
                      alt={gym.name}
                      fallback="/placeholder-gym.jpg"
                    />
                    <div className="market-card__overlay" />
                    <span className={`market-badge ${statusBadgeClass(gym._status)}`}>
                      {statusLabel(gym._status)}
                    </span>
                  </div>

                  <div className="market-card__body">
                    <div className="market-card__head">
                      <div className="market-card__title-wrap">
                        <h3 title={gym.name}>{gym.name}</h3>
                        <p title={gym.address || ""}>{gym.address || "Chưa có địa chỉ"}</p>
                      </div>

                      <div className="market-card__rating">
                        <Star size={15} fill="currentColor" />
                        <span>{gym._rating.toFixed(1)}</span>
                          <small>({gym._reviewCount})</small>
                      </div>
                    </div>

                    <div className="market-meta">
                      <span className="market-meta__item">
                        <Dumbbell size={15} />
                        Gym
                      </span>
                      <span className="market-meta__item">
                        <MapPin size={15} />
                        {gym._area}
                      </span>
                      <span className="market-meta__item">
                        <Phone size={15} />
                        {gym.phone || "Chưa cập nhật"}
                      </span>
                      <span className="market-meta__item">
                        <Clock3 size={15} />
                        {gym.operatingHours || "Chưa cập nhật"}
                      </span>
                    </div>

                    <div className="market-card__footer">
                      <div>
                        <span className="market-card__label">Xem chi tiết</span>
                        <strong>Thông tin phòng tập</strong>
                      </div>

                      <button
                        type="button"
                        className="market-card__action"
                        aria-label={`Xem chi tiết ${gym.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/marketplace/gyms/${gym.id}`);
                        }}
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
          </div>

          {!loading && totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </div>
      </section>
    </div>
  );
}