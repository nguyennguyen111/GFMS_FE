import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getPTDetails, getMyPTProfile } from "../../services/ptService";
import { specializationToVietnamese } from "../../utils/specializationI18n";
import { setTrainerId, clearTrainerId } from "./ptStorage";
import "./PTDetails.css";

const readCoverCache = (ptId) => {
  try {
    return JSON.parse(localStorage.getItem(`pt_cover_${ptId}`) || "null");
  } catch {
    return null;
  }
};

const PTDetails = () => {
  const { id } = useParams();
  const ptId = id;
  const navigate = useNavigate();

  const [pt, setPT] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Guard: URL id phải là của user hiện tại
  useEffect(() => {
    const guard = async () => {
      try {
        const data = await getMyPTProfile();
        const me = data?.DT || data;

        const myId =
          me?.id || me?.trainerId || me?.trainer?.id || me?.PT?.id || null;

        if (myId) {
          setTrainerId(Number(myId));
          if (String(myId) !== String(ptId)) {
            navigate(`/pt/${myId}/details`, { replace: true });
          }
        } else {
          clearTrainerId();
          navigate("/pt/profile", { replace: true });
        }
      } catch (e) {
        console.error("PTDetails guard /me failed:", e);
      }
    };

    guard();
  }, [navigate, ptId]);

  useEffect(() => {
    const fetchPTDetails = async () => {
      try {
        setLoading(true);
        const data = await getPTDetails(ptId);
        setPT(data?.DT || data);
      } catch (error) {
        console.error("Error fetching PT details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPTDetails();
  }, [ptId]);

  const name = useMemo(() => {
    return pt?.User?.username || pt?.User?.fullName || pt?.name || `PT #${ptId}`;
  }, [pt, ptId]);

  const status = pt?.status || "—";
  const statusText = String(status).toLowerCase() === "active"
    ? "Đang hoạt động"
    : String(status).toLowerCase() === "inactive"
      ? "Ngưng hoạt động"
      : status;

  // ✅ cover: ưu tiên DB -> fallback localStorage
  const cachedCover = useMemo(() => readCoverCache(ptId), [ptId]);
  const profileImages = pt?.socialLinks?.profileImages || {};
  const coverUrl = profileImages?.coverImageUrl || pt?.coverImageUrl || cachedCover?.coverImageUrl || "";
  const coverPosX =
    Number.isFinite(profileImages?.coverPosX)
      ? profileImages.coverPosX
      : Number.isFinite(pt?.coverPosX)
        ? pt.coverPosX
        : (cachedCover?.coverPosX ?? 50);
  const coverPosY =
    Number.isFinite(profileImages?.coverPosY)
      ? profileImages.coverPosY
      : Number.isFinite(pt?.coverPosY)
        ? pt.coverPosY
        : (cachedCover?.coverPosY ?? 50);
  const avatarUrl = profileImages?.avatarUrl || pt?.avatarUrl || "";
  const certificateItems = useMemo(() => {
    const fromList = Array.isArray(pt?.socialLinks?.certificates)
      ? pt.socialLinks.certificates
          .map((c) => ({
            id: c?.id || `cert_${Math.random().toString(36).slice(2, 9)}`,
            name: String(c?.name || "").trim(),
            url: String(c?.url || "").trim(),
          }))
          .filter((c) => c.name || c.url)
      : [];

    if (fromList.length > 0) return fromList;

    const fallbackUrl = String(profileImages?.certificateUrl || "").trim();
    const fallbackName = String(pt?.certification || "Chứng chỉ").trim();
    if (!fallbackUrl && !fallbackName) return [];
    return [
      {
        id: "cert_main",
        name: fallbackName || "Chứng chỉ",
        url: fallbackUrl,
      },
    ];
  }, [pt, profileImages]);

  return (
    <div className="pt-details-page">
      <div className="pt-details-inner">
        <div className="pt-topbar">
          <div>
            <h1 className="pt-title">Hồ sơ PT</h1>
            <p className="pt-subtitle">Xem thông tin huấn luyện viên và lịch làm việc.</p>
          </div>

          <div className="pt-actions">
            <Link to="/pt/clients" className="pt-btn-ghost">Danh sách</Link>
            <Link to={`/pt/edit/${ptId}`} className="pt-btn-ghost">Chỉnh sửa hồ sơ</Link>
            <Link to={`/pt/${ptId}/schedule`} className="pt-btn-ghost">Xem lịch</Link>
          </div>
        </div>

        {loading && (
          <div className="pt-card">
            <p className="pt-muted">Đang tải...</p>
          </div>
        )}

        {!loading && !pt && (
          <div className="pt-card">
            <p className="pt-error">Không tìm thấy PT</p>
          </div>
        )}

        {!loading && pt && (
          <>
            {/* ✅ COVER */}
            <section className="pt-card pt-coverCard">
              <div
                className={`pt-cover ${coverUrl ? "has-img" : ""}`}
                style={
                  coverUrl
                    ? {
                        backgroundImage: `url(${coverUrl})`,
                        backgroundPosition: `${coverPosX}% ${coverPosY}%`,
                      }
                    : undefined
                }
              >
                {!coverUrl && <div className="pt-coverEmpty">Chưa có cover</div>}
              </div>
            </section>

            <div className="pt-grid">
              <section className="pt-card pt-card--summary">
                <div className="pt-summary">
                  <div className="pt-avatar">
                    {avatarUrl ? (
                      <img className="pt-avatar__img" src={avatarUrl} alt={name} />
                    ) : (
                      name?.slice(0, 1)?.toUpperCase()
                    )}
                  </div>

                  <div className="pt-summary__info">
                    <div className="pt-name-row">
                      <h2 className="pt-name">{name}</h2>
                      <span
                        className={`pt-pill ${
                          status === "active" ? "is-active" : "is-inactive"
                        }`}
                      >
                        {statusText}
                      </span>
                    </div>

                    <p className="pt-mini">
                      {pt?.certification || "—"}
                      {certificateItems.length > 0 ? (
                        <>
                          {" "}•{" "}
                          {certificateItems.length} ảnh chứng chỉ
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="pt-stats">
                  <div className="pt-stat">
                    <div className="pt-stat__label">Kinh nghiệm</div>
                    <div className="pt-stat__value">
                      {pt.experienceYears ?? "—"} năm
                    </div>
                  </div>

                </div>

                <div className="pt-chip-wrap">
                  <div className="pt-chip-title">Chuyên môn</div>
                  <div className="pt-chip">{specializationToVietnamese(pt.specialization || "") || "—"}</div>
                </div>
              </section>

              <section className="pt-card">
                <div className="pt-card__head">
                  <h3 className="pt-card__title">Thông tin chi tiết</h3>
                </div>

                <div className="pt-table">
                  <div className="pt-row">
                    <div className="pt-label">Chuyên môn</div>
                    <div className="pt-value">{specializationToVietnamese(pt.specialization || "") || "—"}</div>
                  </div>

                  <div className="pt-row">
                    <div className="pt-label">Chứng chỉ</div>
                    <div className="pt-value">
                      {certificateItems.length === 0 ? (
                        pt.certification || "—"
                      ) : (
                        <div className="pt-cert-list">
                          {certificateItems.map((cert) => (
                            <div className="pt-cert-item" key={cert.id}>
                              <span>{cert.name || "Chứng chỉ"}</span>
                              {cert.url ? (
                                <a
                                  href={cert.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="pt-cert-link"
                                >
                                  Mở ảnh
                                </a>
                              ) : (
                                <span className="pt-muted">Chưa có link</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-row">
                    <div className="pt-label">Kinh nghiệm (năm)</div>
                    <div className="pt-value">{pt.experienceYears ?? "—"}</div>
                  </div>

                  <div className="pt-row">
                    <div className="pt-label">Trạng thái</div>
                    <div className="pt-value">{statusText}</div>
                  </div>
                </div>
              </section>

              <section className="pt-card pt-card--span2">
                <div className="pt-card__head">
                  <h3 className="pt-card__title">Bio</h3>
                </div>
                <p className="pt-bio">{pt.bio || "—"}</p>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PTDetails;
