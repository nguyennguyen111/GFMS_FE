import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { createPT, updatePT, getPTDetails } from "../../services/ptService";
import "./PTForm.css";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const PTForm = () => {
  const { id } = useParams();
  const ptId = id;
  const navigate = useNavigate();

  const [pt, setPT] = useState({
    userId: "",
    specialization: "",
    certification: "",
    hourlyRate: 0,
    experienceYears: 0,
    status: "active",
    bio: "",

    // UI-only (tuỳ backend)
    coverImageUrl: "",
    coverPosX: 50, // 0..100
    coverPosY: 50, // 0..100
  });

  const [loading, setLoading] = useState(false);

  // drag state
  const previewRef = useRef(null);
  const dragRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    startPosX: 50,
    startPosY: 50,
  });

  useEffect(() => {
    if (!ptId) return;

    const fetchPT = async () => {
      try {
        setLoading(true);
        const data = await getPTDetails(ptId);
        const t = data?.DT || data;

        // Nếu backend CHƯA có cover fields, vẫn load UI từ localStorage (theo ptId)
        const cached = (() => {
          try {
            return JSON.parse(localStorage.getItem(`pt_cover_${ptId}`) || "null");
          } catch {
            return null;
          }
        })();

        setPT({
          userId: t?.userId != null ? String(t.userId) : "",
          specialization: t?.specialization || "",
          certification: t?.certification || "",
          hourlyRate: t?.hourlyRate ?? 0,
          experienceYears: t?.experienceYears ?? 0,
          status: t?.status || "active",
          bio: t?.bio || "",

          // cover fields: ưu tiên backend -> fallback local
          coverImageUrl: t?.coverImageUrl || cached?.coverImageUrl || "",
          coverPosX: Number.isFinite(t?.coverPosX) ? t.coverPosX : (cached?.coverPosX ?? 50),
          coverPosY: Number.isFinite(t?.coverPosY) ? t.coverPosY : (cached?.coverPosY ?? 50),
        });
      } catch (error) {
        console.error("Error fetching PT details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPT();
  }, [ptId]);

  const headerStatus = useMemo(() => pt.status || "active", [pt.status]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setPT((prev) => ({
      ...prev,
      [name]:
        name === "hourlyRate" || name === "experienceYears"
          ? Number(value)
          : value,
    }));
  };

  // ====== Drag cover preview ======
  const onMouseDownPreview = (e) => {
    if (!previewRef.current) return;
    dragRef.current.isDown = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.startPosX = pt.coverPosX;
    dragRef.current.startPosY = pt.coverPosY;
  };

  const onMouseMove = (e) => {
    if (!dragRef.current.isDown || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    // đổi px -> % theo kích thước preview (càng nhỏ càng nhạy)
    const deltaX = (dx / rect.width) * 100;
    const deltaY = (dy / rect.height) * 100;

    // kéo chuột sang phải => thấy phần bên phải => position X giảm (ngược chiều)
    const nextX = clamp(dragRef.current.startPosX - deltaX, 0, 100);
    const nextY = clamp(dragRef.current.startPosY - deltaY, 0, 100);

    setPT((prev) => ({ ...prev, coverPosX: nextX, coverPosY: nextY }));
  };

  const onMouseUp = () => {
    dragRef.current.isDown = false;
  };

  useEffect(() => {
    // gắn listener global để drag mượt
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [pt.coverPosX, pt.coverPosY]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        userId: pt.userId === "" ? undefined : Number(pt.userId),
        specialization: pt.specialization,
        certification: pt.certification,
        hourlyRate: Number(pt.hourlyRate),
        experienceYears: Number(pt.experienceYears),
        status: pt.status,
        bio: pt.bio,

        // ✅ Nếu backend bạn có field lưu cover thì mở comment:
        // coverImageUrl: pt.coverImageUrl,
        // coverPosX: pt.coverPosX,
        // coverPosY: pt.coverPosY,
      };

      if (!payload.userId || Number.isNaN(payload.userId)) {
        alert("❌ Thiếu User ID. Hãy nhập userId (id trong bảng user).");
        return;
      }

      if (ptId) {
        await updatePT(ptId, payload);

        // fallback lưu local để vẫn giữ được crop nếu backend chưa hỗ trợ
        localStorage.setItem(
          `pt_cover_${ptId}`,
          JSON.stringify({
            coverImageUrl: pt.coverImageUrl,
            coverPosX: pt.coverPosX,
            coverPosY: pt.coverPosY,
          })
        );

        alert("✅ Cập nhật PT thành công");
        navigate(`/pt/${ptId}/details`, { replace: true });
      } else {
        await createPT(payload);
        alert("✅ Tạo PT thành công");
        navigate("/pt/clients");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      const msg =
        error?.response?.data?.message || "❌ Lỗi khi lưu PT. Kiểm tra backend.";
      alert(msg);
    }
  };

  return (
    <div className="ptf-page">
      <div className="ptf-shell">
        <div className="ptf-topbar">
          <div>
            <h1 className="ptf-title">PT Profile</h1>
            <p className="ptf-subtitle">
              Cập nhật thông tin huấn luyện viên theo giao diện dashboard.
            </p>
          </div>

          <div className="ptf-actions">
            <Link to={`/pt/${ptId}/details`} className="ptf-btnGhost">
              Quay lại
            </Link>
            <button form="ptf-form" type="submit" className="ptf-btnPrimary">
              Save
            </button>
          </div>
        </div>

        {loading ? (
          <div className="ptf-card">
            <p className="ptf-muted">Loading...</p>
          </div>
        ) : (
          <form id="ptf-form" className="ptf-grid" onSubmit={handleSubmit}>
            {/* Card: PT Profile */}
            <section className="ptf-card ptf-card--span2">
              <div className="ptf-cardHead">
                <h3 className="ptf-cardTitle">PT Profile</h3>
                <span className={`ptf-pill ${headerStatus === "active" ? "is-active" : "is-inactive"}`}>
                  {headerStatus}
                </span>
              </div>

              <label className="ptf-label">Cover Image URL</label>
              <input
                className="ptf-input"
                name="coverImageUrl"
                value={pt.coverImageUrl}
                onChange={(e) =>
                  setPT((prev) => ({ ...prev, coverImageUrl: e.target.value }))
                }
                placeholder="https://..."
              />

              <div className="ptf-coverHelp">
                Tip: Kéo ảnh trong khung preview để chỉnh vị trí (tránh bị cắt mặt).
                <button
                  type="button"
                  className="ptf-resetBtn"
                  onClick={() => setPT((p) => ({ ...p, coverPosX: 50, coverPosY: 50 }))}
                >
                  Reset
                </button>
              </div>

              <div
                ref={previewRef}
                className={`ptf-coverPreview ${pt.coverImageUrl ? "has-img" : ""}`}
                onMouseDown={onMouseDownPreview}
                style={
                  pt.coverImageUrl
                    ? {
                        backgroundImage: `url(${pt.coverImageUrl})`,
                        backgroundPosition: `${pt.coverPosX}% ${pt.coverPosY}%`,
                      }
                    : undefined
                }
                title="Giữ chuột và kéo để chỉnh vị trí ảnh"
              >
                {!pt.coverImageUrl && <div className="ptf-coverEmpty">Cover preview</div>}
              </div>

              <div className="ptf-posRow">
                <div className="ptf-posItem">
                  <span>X</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={pt.coverPosX}
                    onChange={(e) => setPT((p) => ({ ...p, coverPosX: Number(e.target.value) }))}
                  />
                </div>
                <div className="ptf-posItem">
                  <span>Y</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={pt.coverPosY}
                    onChange={(e) => setPT((p) => ({ ...p, coverPosY: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <label className="ptf-label" style={{ marginTop: 10 }}>
                Bio
              </label>
              <textarea
                className="ptf-textarea"
                name="bio"
                value={pt.bio}
                onChange={handleChange}
                rows={4}
                placeholder="Giới thiệu ngắn về bạn..."
              />
            </section>

            {/* Basic Info */}
            <section className="ptf-card">
              <h3 className="ptf-cardTitle">Basic Info</h3>

              <label className="ptf-label">User ID</label>
              <input
                className="ptf-input"
                type="number"
                name="userId"
                value={pt.userId}
                onChange={(e) =>
                  setPT((prev) => ({ ...prev, userId: e.target.value }))
                }
                placeholder="User ID (bắt buộc)"
              />

              <label className="ptf-label">Status</label>
              <select
                className="ptf-input"
                name="status"
                value={pt.status}
                onChange={handleChange}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>

              <label className="ptf-label">Years of experience</label>
              <input
                className="ptf-input"
                type="number"
                name="experienceYears"
                value={pt.experienceYears}
                onChange={handleChange}
              />
            </section>

            {/* Skills */}
            <section className="ptf-card">
              <h3 className="ptf-cardTitle">Skills</h3>

              <label className="ptf-label">Specialties (comma separated)</label>
              <input
                className="ptf-input"
                type="text"
                name="specialization"
                value={pt.specialization}
                onChange={handleChange}
                placeholder="Weight Loss, Strength Training"
              />

              <label className="ptf-label">Certificates</label>
              <input
                className="ptf-input"
                type="text"
                name="certification"
                value={pt.certification}
                onChange={handleChange}
                placeholder="ACE Certified Personal Trainer"
              />

              <div className="ptf-hint">
                (Hiện backend của bạn đang dùng 1 field certification đơn. Nếu muốn giống
                mẫu “+ Add certificate” thì cần đổi schema/BE thành mảng.)
              </div>

              <label className="ptf-label" style={{ marginTop: 10 }}>
                Hourly Rate
              </label>
              <input
                className="ptf-input"
                type="number"
                name="hourlyRate"
                value={pt.hourlyRate}
                onChange={handleChange}
              />
            </section>
          </form>
        )}
      </div>
    </div>
  );
};

export default PTForm;
