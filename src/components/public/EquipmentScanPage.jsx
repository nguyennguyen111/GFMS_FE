import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import equipmentAssetService from "../../services/equipmentAssetService";
import axios from "../../setup/axios";
import "./EquipmentScanPage.css";
import { getCurrentUser, isLoggedIn } from "../../utils/auth";
import { showAppToast } from "../../utils/appToast";
import { setSelectedGym } from "../../utils/selectedGym";

const statusLabel = (s) =>
  ({
    active: "Đang hoạt động",
    maintenance: "Đang bảo trì",
    broken: "Bị hỏng",
    retired: "Ngừng sử dụng",
  }[String(s || "").toLowerCase()] || s || "-");

const statusClass = (s) => `scan-badge scan-badge--${String(s || "active").toLowerCase()}`;

export default function EquipmentScanPage() {
  const { qrToken } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolvedAsset, setResolvedAsset] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const API_HOST = String(axios?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "http://localhost:8080").replace(/\/+$/, "");
  const absUrl = (value) => (value ? (String(value).startsWith("http") || String(value).startsWith("data:") ? String(value) : `${API_HOST}${value}`) : "");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    equipmentAssetService
      .publicScan(qrToken)
      .then((res) => {
        if (!mounted) return;
        setData(res?.data?.data || null);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.message || e.message);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [qrToken]);

  const imageUrl = useMemo(() => absUrl(data?.imageUrl), [data?.imageUrl]);
  const user = useMemo(() => getCurrentUser(), []);
  const isOwner = useMemo(() => Number(user?.groupId ?? user?.group_id ?? 0) === 2, [user]);

  const openMaintenance = async () => {
    setError("");
    if (!isLoggedIn()) {
      sessionStorage.setItem("redirectAfterLogin", `/owner/equipment-assets?scanToken=${encodeURIComponent(qrToken)}`);
      navigate("/login");
      return;
    }
    if (!isOwner) {
      setError("Chỉ tài khoản chủ gym sở hữu thiết bị này mới được gửi yêu cầu bảo trì.");
      return;
    }
    try {
      const res = await equipmentAssetService.ownerResolveByToken(qrToken);
      const asset = res?.data?.data || null;
      setResolvedAsset(asset);
      if (asset?.gymId) {
        setSelectedGym({ id: asset.gymId, name: asset.gymName || `Gym #${asset.gymId}` });
      }
      setMaintenanceOpen(true);
    } catch (e) {
      const status = e?.response?.status;
      setError(status === 403
        ? "Bạn không phải chủ gym của thiết bị này nên không thể gửi yêu cầu bảo trì."
        : (e?.response?.data?.message || e.message));
    }
  };

  const submitMaintenance = async () => {
    if (!resolvedAsset?.id) return;
    setSubmitting(true);
    setError("");
    try {
      await equipmentAssetService.ownerCreateMaintenance(resolvedAsset.id, { issueDescription });
      showAppToast({
        type: "success",
        title: "Đã gửi yêu cầu bảo trì",
        message: `Thiết bị ${resolvedAsset.assetCode} đã được ghi nhận yêu cầu bảo trì.`,
      });
      setMaintenanceOpen(false);
      setIssueDescription("");
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="scan-page">
      <div className="scan-shell">
        <header className="scan-header">
          <div className="scan-brand">
            <div className="scan-dot" />
            <div>
              <div className="scan-title">GFMS · Quét QR thiết bị</div>
              <div className="scan-sub">Trang public — không yêu cầu đăng nhập</div>
            </div>
          </div>
          <Link className="scan-link" to="/">Về trang chủ</Link>
        </header>

        {loading ? <div className="scan-card">Đang tải thông tin thiết bị…</div> : null}
        {error ? <div className="scan-alert">{error}</div> : null}

        {!loading && data ? (
          <main className="scan-card">
            <div className="scan-hero">
              <div className="scan-media">
                {imageUrl ? <img src={imageUrl} alt={data.equipmentName || data.assetCode} /> : <div className="scan-fallback">EQ</div>}
              </div>
              <div className="scan-info">
                <div className="scan-eqName">{data.equipmentName || "Thiết bị"}</div>
                <div className="scan-assetCode">{data.assetCode}</div>
                <div className="scan-row">
                  <span className={statusClass(data.status)}>{statusLabel(data.status)}</span>
                  {data.gymName ? <span className="scan-chip">{data.gymName}</span> : null}
                </div>
              </div>
            </div>

            <div className="scan-actions">
              <button className="scan-btn" onClick={openMaintenance}>
                Gửi yêu cầu bảo trì
              </button>
              <button
                className="scan-btn scan-btn--ghost"
                onClick={() => {
                  setGuideOpen(true);
                  setTimeout(() => {
                    const el = document.getElementById("scan-guide");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 0);
                }}
              >
                Xem hướng dẫn tập
              </button>
            </div>

            <div className="scan-note">
              Quét QR để xác định đúng thiết bị, xem hướng dẫn an toàn và gửi bảo trì khi phát hiện sự cố.
            </div>

            {guideOpen ? (
              <section id="scan-guide" className="scan-guide">
                <div className="scan-guide__title">Hướng dẫn sử dụng / tập luyện</div>
                {data.guide?.hasGuide ? (
                  <>
                    {data.guide?.muscleGroups || data.guide?.targetMuscles ? (
                      <div className="scan-guide__chips">
                        {String(data.guide.muscleGroups || data.guide.targetMuscles).split(/[\n,]/).map((x) => x.trim()).filter(Boolean).map((item) => (
                          <span key={item} className="scan-chip">{item}</span>
                        ))}
                      </div>
                    ) : null}
                    {data.guide?.usageGuide || data.guide?.workoutInstructions ? <div className="scan-guide__content"><b>Cách sử dụng</b>
{data.guide.usageGuide || data.guide.workoutInstructions}</div> : null}
                    {data.guide?.trainingInstructions || data.guide?.workoutTips ? <div className="scan-guide__content"><b>Gợi ý / hướng dẫn tập</b>
{data.guide.trainingInstructions || data.guide.workoutTips}</div> : null}
                    {data.guide?.safetyNotes ? <div className="scan-guide__content scan-guide__content--warn"><b>Lưu ý an toàn</b>
{data.guide.safetyNotes}</div> : null}
                    {Array.isArray(data.guide?.guideImages) && data.guide.guideImages.length ? (
                      <div className="scan-guide__images">
                        {data.guide.guideImages.map((url, idx) => (
                          <img key={`${url}-${idx}`} src={absUrl(url)} alt={`Hướng dẫn ${idx + 1}`} />
                        ))}
                      </div>
                    ) : null}
                    {data.guide?.guideVideoUrl || data.guide?.videoUrl ? (
                      <a className="scan-link scan-link--video" href={data.guide.guideVideoUrl || data.guide.videoUrl} target="_blank" rel="noreferrer">
                        Mở video hướng dẫn
                      </a>
                    ) : null}
                  </>
                ) : (
                  <div className="scan-guide__content scan-guide__empty">
                    Thiết bị này chưa có hướng dẫn tập.
                  </div>
                )}
              </section>
            ) : null}
          </main>
        ) : null}

        {maintenanceOpen ? (
          <div className="scan-modalOverlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setMaintenanceOpen(false); }}>
            <div className="scan-modal">
              <div className="scan-modal__header">
                <div>
                  <div className="scan-modal__title">Yêu cầu bảo trì</div>
                  <div className="scan-modal__sub">{resolvedAsset?.assetCode || "-"} · {resolvedAsset?.equipmentName || "-"}</div>
                </div>
                <button className="scan-btn scan-btn--ghost" onClick={() => setMaintenanceOpen(false)}>Đóng</button>
              </div>
              <textarea
                className="scan-input scan-input--textarea"
                placeholder="Mô tả sự cố (ví dụ: máy phát tiếng kêu, rung mạnh...)"
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
              />
              <div className="scan-modal__actions">
                <button className="scan-btn" onClick={submitMaintenance} disabled={submitting || !String(issueDescription || '').trim()}>
                  {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
                </button>
                <button className="scan-btn scan-btn--ghost" onClick={() => setMaintenanceOpen(false)} disabled={submitting}>
                  Huỷ
                </button>
              </div>
              <div className="scan-note" style={{ marginTop: 0 }}>
                Yêu cầu sẽ được tự động gắn đúng mã thiết bị, gym và owner để admin xử lý.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

