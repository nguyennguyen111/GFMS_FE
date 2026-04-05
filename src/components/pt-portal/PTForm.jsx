import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { createPT, updatePT, getPTDetails, uploadMyPTProfileImage } from "../../services/ptService";
import { specializationToVietnamese } from "../../utils/specializationI18n";
import "./PTForm.css";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const makeCertId = () => `cert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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
    avatarUrl: "",
    certificates: [],

    // UI-only (tuỳ backend)
    coverImageUrl: "",
    coverPosX: 50, // 0..100
    coverPosY: 50, // 0..100
  });

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [certDraftName, setCertDraftName] = useState("");
  const [certDraftUrl, setCertDraftUrl] = useState("");

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
        const profileImages = t?.socialLinks?.profileImages || {};
        const oldCertificateUrl = profileImages?.certificateUrl || "";
        const certsFromDB = Array.isArray(t?.socialLinks?.certificates)
          ? t.socialLinks.certificates
              .filter((c) => c && (String(c?.name || "").trim() || String(c?.url || "").trim()))
              .map((c) => ({
                id: c.id || makeCertId(),
                name: String(c.name || "").trim(),
                url: String(c.url || "").trim(),
              }))
          : [];

        const fallbackCerts =
          certsFromDB.length > 0
            ? certsFromDB
            : (t?.certification || oldCertificateUrl)
              ? [
                  {
                    id: makeCertId(),
                    name: String(t?.certification || "Chứng chỉ").trim(),
                    url: String(oldCertificateUrl || "").trim(),
                  },
                ]
              : [];

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
          specialization: specializationToVietnamese(t?.specialization || ""),
          certification: t?.certification || "",
          hourlyRate: t?.hourlyRate ?? 0,
          experienceYears: t?.experienceYears ?? 0,
          status: t?.status || "active",
          bio: t?.bio || "",
          avatarUrl: profileImages?.avatarUrl || t?.avatarUrl || "",
          certificates: fallbackCerts,

          // cover fields: ưu tiên backend -> fallback local
          coverImageUrl: profileImages?.coverImageUrl || t?.coverImageUrl || cached?.coverImageUrl || "",
          coverPosX: Number.isFinite(profileImages?.coverPosX)
            ? profileImages.coverPosX
            : Number.isFinite(t?.coverPosX)
              ? t.coverPosX
              : (cached?.coverPosX ?? 50),
          coverPosY: Number.isFinite(profileImages?.coverPosY)
            ? profileImages.coverPosY
            : Number.isFinite(t?.coverPosY)
              ? t.coverPosY
              : (cached?.coverPosY ?? 50),
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

  const onUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const res = await uploadMyPTProfileImage({ file, imageType: "avatar" });
      const url = res?.data?.url || "";
      if (url) setPT((prev) => ({ ...prev, avatarUrl: url }));
    } catch (error) {
      console.error("Upload avatar failed:", error);
      alert(error?.response?.data?.message || "Upload avatar thất bại");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const onUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const res = await uploadMyPTProfileImage({ file, imageType: "cover" });
      const url = res?.data?.url || "";
      if (url) setPT((prev) => ({ ...prev, coverImageUrl: url }));
    } catch (error) {
      console.error("Upload cover failed:", error);
      alert(error?.response?.data?.message || "Upload ảnh cover thất bại");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const onUploadCertificate = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCertificate(true);
      const res = await uploadMyPTProfileImage({
        file,
        imageType: "certificate",
        certificateName: certDraftName.trim(),
      });
      const url = res?.data?.url || "";
      if (url) {
        setPT((prev) => ({
          ...prev,
          certificates: [
            {
              id: makeCertId(),
              name: certDraftName.trim() || file.name || "Chứng chỉ",
              url,
            },
            ...(Array.isArray(prev.certificates) ? prev.certificates : []),
          ],
        }));
        setCertDraftName("");
        setCertDraftUrl("");
      }
    } catch (error) {
      console.error("Upload certificate failed:", error);
      alert(error?.response?.data?.message || "Upload chứng chỉ thất bại");
    } finally {
      setUploadingCertificate(false);
      e.target.value = "";
    }
  };

  const addCertificateByLink = () => {
    const name = certDraftName.trim();
    const url = certDraftUrl.trim();
    if (!name && !url) return;
    setPT((prev) => ({
      ...prev,
      certificates: [
        {
          id: makeCertId(),
          name: name || "Chứng chỉ",
          url,
        },
        ...(Array.isArray(prev.certificates) ? prev.certificates : []),
      ],
    }));
    setCertDraftName("");
    setCertDraftUrl("");
  };

  const removeCertificate = (certId) => {
    setPT((prev) => ({
      ...prev,
      certificates: (Array.isArray(prev.certificates) ? prev.certificates : []).filter(
        (c) => String(c?.id) !== String(certId)
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const normalizedCertificates = (Array.isArray(pt.certificates) ? pt.certificates : [])
        .map((c) => ({
          id: c?.id || makeCertId(),
          name: String(c?.name || "").trim(),
          url: String(c?.url || "").trim(),
        }))
        .filter((c) => c.name || c.url);

      const payload = {
        userId: pt.userId === "" ? undefined : Number(pt.userId),
        specialization: pt.specialization,
        certification:
          normalizedCertificates.map((c) => c.name).filter(Boolean).join(", ") || "",
        hourlyRate: Number(pt.hourlyRate),
        experienceYears: Number(pt.experienceYears),
        status: pt.status,
        bio: pt.bio,
        socialLinks: {
          profileImages: {
            avatarUrl: pt.avatarUrl || "",
            coverImageUrl: pt.coverImageUrl || "",
            certificateUrl: normalizedCertificates[0]?.url || "",
            coverPosX: Number(pt.coverPosX ?? 50),
            coverPosY: Number(pt.coverPosY ?? 50),
          },
          certificates: normalizedCertificates,
        },
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
            <h1 className="ptf-title">Hồ sơ PT</h1>
            <p className="ptf-subtitle">
              Cập nhật thông tin huấn luyện viên theo giao diện dashboard.
            </p>
          </div>

          <div className="ptf-actions">
            <Link to={`/pt/${ptId}/details`} className="ptf-btnGhost">
              Quay lại
            </Link>
            <button form="ptf-form" type="submit" className="ptf-btnPrimary">
              Lưu
            </button>
          </div>
        </div>

        {loading ? (
          <div className="ptf-card">
            <p className="ptf-muted">Đang tải...</p>
          </div>
        ) : (
          <form id="ptf-form" className="ptf-grid" onSubmit={handleSubmit}>
            <section className="ptf-card ptf-card--span2">
              <div className="ptf-cardHead">
                <h3 className="ptf-cardTitle">Hồ sơ PT</h3>
                <span className={`ptf-pill ${headerStatus === "active" ? "is-active" : "is-inactive"}`}>
                  {headerStatus === "active" ? "Đang hoạt động" : "Ngưng hoạt động"}
                </span>
              </div>

              <label className="ptf-label">Ảnh đại diện</label>
              <div className="ptf-uploadRow">
                <div className="ptf-avatarPreview">
                  {pt.avatarUrl ? <img src={pt.avatarUrl} alt="" /> : <span>Ảnh đại diện</span>}
                </div>
                <label className="ptf-uploadBtn">
                  {uploadingAvatar ? "Đang upload..." : "Upload avatar"}
                  <input type="file" accept="image/*" onChange={onUploadAvatar} hidden />
                </label>
              </div>

              <label className="ptf-label">URL ảnh bìa</label>
              <input
                className="ptf-input"
                name="coverImageUrl"
                value={pt.coverImageUrl}
                onChange={(e) =>
                  setPT((prev) => ({ ...prev, coverImageUrl: e.target.value }))
                }
                placeholder="https://..."
              />

              <div className="ptf-uploadRow ptf-uploadRow--cover">
                <label className="ptf-uploadBtn">
                  {uploadingCover ? "Đang upload..." : "Upload ảnh cover"}
                  <input type="file" accept="image/*" onChange={onUploadCover} hidden />
                </label>
              </div>

              <div className="ptf-coverHelp">
                Tip: Kéo ảnh trong khung preview để chỉnh vị trí (tránh bị cắt mặt).
                <button
                  type="button"
                  className="ptf-resetBtn"
                  onClick={() => setPT((p) => ({ ...p, coverPosX: 50, coverPosY: 50 }))}
                >
                  Đặt lại
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
                {!pt.coverImageUrl && <div className="ptf-coverEmpty">Xem trước ảnh bìa</div>}
              </div>

              <label className="ptf-label" style={{ marginTop: 10 }}>
                Giới thiệu
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

            <section className="ptf-card">
              <h3 className="ptf-cardTitle">Thông tin cơ bản</h3>

              <label className="ptf-label">Mã người dùng</label>
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

              <label className="ptf-label">Trạng thái</label>
              <select
                className="ptf-input"
                name="status"
                value={pt.status}
                onChange={handleChange}
              >
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngưng hoạt động</option>
              </select>

              <label className="ptf-label">Số năm kinh nghiệm</label>
              <input
                className="ptf-input"
                type="number"
                name="experienceYears"
                value={pt.experienceYears}
                onChange={handleChange}
              />
            </section>

            <section className="ptf-card">
              <h3 className="ptf-cardTitle">Kỹ năng</h3>

              <label className="ptf-label">Chuyên môn (phân tách bằng dấu phẩy)</label>
              <input
                className="ptf-input"
                type="text"
                name="specialization"
                value={pt.specialization}
                onChange={handleChange}
                placeholder="Ví dụ: Giảm cân, Tăng sức mạnh"
              />

              <label className="ptf-label">Tên chứng chỉ</label>
              <input
                className="ptf-input"
                type="text"
                value={certDraftName}
                onChange={(e) => setCertDraftName(e.target.value)}
                placeholder="Ví dụ: Chứng chỉ huấn luyện viên ACE"
              />
              <label className="ptf-label">Link ảnh chứng chỉ</label>
              <input
                className="ptf-input"
                type="text"
                value={certDraftUrl}
                onChange={(e) => setCertDraftUrl(e.target.value)}
                placeholder="https://..."
              />

              <div className="ptf-uploadRow ptf-uploadRow--cover">
                <button type="button" className="ptf-uploadBtn" onClick={addCertificateByLink}>
                  Thêm chứng chỉ bằng link
                </button>
                <label className="ptf-uploadBtn">
                  {uploadingCertificate ? "Đang upload..." : "Upload ảnh chứng chỉ"}
                  <input type="file" accept="image/*" onChange={onUploadCertificate} hidden />
                </label>
              </div>

              <div className="ptf-hint">
                Bạn có thể thêm nhiều chứng chỉ: nhập tên + link rồi bấm thêm, hoặc upload ảnh.
              </div>

              <div className="ptf-certList">
                {(Array.isArray(pt.certificates) ? pt.certificates : []).length === 0 ? (
                  <div className="ptf-hint">Chưa có chứng chỉ nào.</div>
                ) : (
                  (Array.isArray(pt.certificates) ? pt.certificates : []).map((cert) => (
                    <div className="ptf-certItem" key={cert.id}>
                      <div className="ptf-certText">
                        <strong>{cert.name || "Chứng chỉ"}</strong>
                        {cert.url ? (
                          <a href={cert.url} target="_blank" rel="noreferrer" className="ptf-certLink">
                            Mở ảnh
                          </a>
                        ) : (
                          <span className="ptf-muted">Chưa có link</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="ptf-resetBtn"
                        onClick={() => removeCertificate(cert.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  ))
                )}
              </div>

              <label className="ptf-label" style={{ marginTop: 10 }}>
                Giá theo giờ
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
