import React, { useEffect, useState } from "react";
import {
  deleteMyPTTrainingPlan,
  deleteMyPTDemoVideo,
  getMyPTDemoVideos,
  getMyPTTrainingPlans,
  uploadMyPTTrainingPlan,
  uploadMyPTDemoVideo,
  getPTEligibleActivations,
  getPTActivationMaterials,
  sendPTActivationMaterial,
  deletePTActivationMaterial,
} from "../../services/ptService";
import NiceModal from "../common/NiceModal";
import "./PTDemoVideos.css";

const formatBytes = (value) => {
  const n = Number(value || 0);
  if (!n) return "Không có";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const PTDemoVideos = () => {
  const MAX_VIDEO_MB = 200;
  const MAX_PLAN_MB = 50;
  const [videos, setVideos] = useState([]);
  const [durationsById, setDurationsById] = useState({});
  const [plans, setPlans] = useState([]);
  const [uploadKind, setUploadKind] = useState("demo_video"); // demo_video | training_plan
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [eligibleActivations, setEligibleActivations] = useState([]);
  const [sendActivationId, setSendActivationId] = useState("");
  const [sendKind, setSendKind] = useState("demo_video");
  const [sendItemId, setSendItemId] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMaterials, setSentMaterials] = useState([]);
  const [modalState, setModalState] = useState(null);

  const askConfirm = (message, title = "Xác nhận") =>
    new Promise((resolve) => {
      setModalState({
        kind: "confirm",
        message,
        title,
        tone: "info",
        onConfirm: () => {
          setModalState(null);
          resolve(true);
        },
        onClose: () => {
          setModalState(null);
          resolve(false);
        },
      });
    });

  const normalizeList = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(raw?.result)) return raw.result;
    return [];
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMyPTDemoVideos();
      setVideos(normalizeList(res));
      const planRes = await getMyPTTrainingPlans();
      setPlans(normalizeList(planRes));
    } catch (e) {
      setError(e?.response?.data?.message || "Không tải được danh sách video demo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getPTEligibleActivations();
        if (!mounted) return;
        setEligibleActivations(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (mounted) setEligibleActivations([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!sendActivationId) {
      setSentMaterials([]);
      return undefined;
    }
    (async () => {
      try {
        const res = await getPTActivationMaterials(sendActivationId);
        if (!mounted) return;
        setSentMaterials(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (mounted) setSentMaterials([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sendActivationId]);

  const onUpload = async (e) => {
    e.preventDefault();
    const kind = String(uploadKind || "").toLowerCase();
    const isVideo = kind === "demo_video";
    const titleLabel = isVideo ? "video" : "kế hoạch tập luyện";
    const maxMb = isVideo ? MAX_VIDEO_MB : MAX_PLAN_MB;

    if (!String(uploadTitle || "").trim()) {
      setError(`Vui lòng nhập tiêu đề ${titleLabel}.`);
      return;
    }
    if (!uploadFile) {
      setError(isVideo ? "Vui lòng chọn 1 video." : "Vui lòng chọn file kế hoạch (pdf/doc/docx).");
      return;
    }
    if (uploadFile.size > maxMb * 1024 * 1024) {
      setError(
        isVideo
          ? `Video quá lớn. Giới hạn: ${MAX_VIDEO_MB}MB.`
          : `File kế hoạch quá lớn. Giới hạn: ${MAX_PLAN_MB}MB.`
      );
      return;
    }
    try {
      setUploading(true);
      setError("");
      if (isVideo) {
        await uploadMyPTDemoVideo({ file: uploadFile, title: String(uploadTitle || "").trim() });
      } else {
        await uploadMyPTTrainingPlan({ file: uploadFile, title: String(uploadTitle || "").trim() });
      }
      setUploadTitle("");
      setUploadFile(null);
      await fetchVideos();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          (isVideo ? "Upload video thất bại." : "Upload file kế hoạch thất bại.")
      );
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (videoId) => {
    if (!(await askConfirm("Xóa video demo này?", "Xác nhận xóa"))) return;
    try {
      await deleteMyPTDemoVideo(videoId);
      setVideos((prev) => prev.filter((v) => String(v.id) !== String(videoId)));
    } catch (err) {
      setError(err?.response?.data?.message || "Không xóa được video.");
    }
  };

  const onDeletePlan = async (planId) => {
    if (!(await askConfirm("Xóa file kế hoạch này?", "Xác nhận xóa"))) return;
    try {
      await deleteMyPTTrainingPlan(planId);
      setPlans((prev) => prev.filter((p) => String(p.id) !== String(planId)));
    } catch (err) {
      setError(err?.response?.data?.message || "Không xóa được file kế hoạch.");
    }
  };

  const onSendToMember = async (e) => {
    e.preventDefault();
    if (!sendActivationId || !sendItemId) {
      setError("Chọn gói kích hoạt và mục cần gửi.");
      return;
    }
    try {
      setSending(true);
      setError("");
      await sendPTActivationMaterial({
        packageActivationId: Number(sendActivationId),
        materialKind: sendKind,
        sourceItemId: sendItemId,
      });
      const res = await getPTActivationMaterials(sendActivationId);
      setSentMaterials(Array.isArray(res?.data) ? res.data : []);
      setSendItemId("");
    } catch (err) {
      setError(err?.response?.data?.message || "Gửi thất bại.");
    } finally {
      setSending(false);
    }
  };

  const onDeleteSent = async (materialId) => {
    if (!(await askConfirm("Xóa tài liệu đã gửi? Học viên sẽ không còn thấy trong danh sách.", "Xác nhận xóa"))) return;
    try {
      await deletePTActivationMaterial(materialId);
      const res = await getPTActivationMaterials(sendActivationId);
      setSentMaterials(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Không xóa được.");
    }
  };

  const sendItemOptions =
    sendKind === "demo_video"
      ? videos.map((v) => ({ id: v.id, label: v.title || v.id }))
      : plans.map((p) => ({ id: p.id, label: p.title || p.id }));

  return (
    <div className="ptp-wrap">
      <div className="ptp-head">
        <div>
          <h2 className="ptp-title">Kế hoạch tập luyện</h2>
          <div className="ptp-sub">
            Quản lý thư viện video hướng dẫn và tài liệu kế hoạch tập luyện để gửi cho học viên.
          </div>
        </div>
      </div>

      <form className="ptp-card pt-demo-upload-card" onSubmit={onUpload}>
        <h3 className="pt-demo-title">Upload vào thư viện</h3>
        <div className="ptp-grid ptp-grid--single">
          <div className="ptp-row">
            <label>Loại nội dung</label>
            <select
              className="ptp-input"
              value={uploadKind}
              onChange={(e) => {
                const next = e.target.value;
                setUploadKind(next);
                setUploadTitle("");
                setUploadFile(null);
                setError("");
              }}
            >
              <option value="demo_video">Video hướng dẫn</option>
              <option value="training_plan">Tài liệu kế hoạch (PDF/DOC/DOCX)</option>
            </select>
          </div>
          <div className="ptp-row">
            <label>{uploadKind === "demo_video" ? "Tiêu đề video" : "Tiêu đề kế hoạch tập luyện"}</label>
            <input
              className="ptp-input"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder={
                uploadKind === "demo_video"
                  ? "Ví dụ: Demo buổi tập giảm mỡ"
                  : "Ví dụ: Kế hoạch tập 8 tuần giảm mỡ"
              }
            />
          </div>
          <div className="ptp-row">
            <label>
              {uploadKind === "demo_video"
                ? `Chọn file video (≤ ${MAX_VIDEO_MB}MB)`
                : `Chọn file kế hoạch (≤ ${MAX_PLAN_MB}MB)`}
            </label>
            <input
              className="ptp-input"
              type="file"
              accept={
                uploadKind === "demo_video"
                  ? "video/*"
                  : ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              }
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <div className="pt-demo-upload-action">
          <button type="submit" className="ptp-btn ptp-btn--primary" disabled={uploading}>
            {uploading
              ? "Đang lưu..."
              : uploadKind === "demo_video"
              ? "Lưu video vào thư viện"
              : "Lưu tài liệu vào thư viện"}
          </button>
        </div>
      </form>

      {error ? <div className="ptp-error">{error}</div> : null}

      <div className="ptp-card pt-demo-upload-card" style={{ marginTop: 12 }}>
        <h3 className="pt-demo-title">Video hướng dẫn</h3>
        {loading ? (
          <div className="ptp-sub">Đang tải...</div>
        ) : videos.length === 0 ? (
          <div className="ptp-sub">Chưa có video hướng dẫn nào.</div>
        ) : (
          <div className="pt-demo-grid" style={{ marginTop: 10 }}>
            {videos.map((v) => (
              <div key={v.id} className="ptp-card pt-demo-item-card">
                <video
                  src={v.url || v.fileUrl || v.videoUrl || v.src}
                  controls
                  className="pt-demo-video"
                  onLoadedMetadata={(e) => {
                    const duration = e.currentTarget?.duration;
                    if (!Number.isFinite(duration)) return;
                    setDurationsById((prev) => {
                      if (prev[v.id] != null) return prev;
                      return { ...prev, [v.id]: duration };
                    });
                  }}
                />
                <div className="pt-demo-title">{v.title || "Video hướng dẫn"}</div>
                <div className="ptp-sub">
                  {Number.isFinite(durationsById[v.id])
                    ? `Thời lượng: ${Math.round(Number(durationsById[v.id]))} giây`
                    : v.duration
                      ? `Thời lượng: ${Math.round(Number(v.duration))} giây`
                      : "Thời lượng: không có"}{" "}
                  | {formatBytes(v.bytes)}
                </div>
                <div className="pt-demo-delete-action">
                  <button
                    type="button"
                    className="ptp-btn ptp-btn--warn ptp-btn--small"
                    onClick={() => onDelete(v.id)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ptp-card pt-demo-upload-card" style={{ marginTop: 12 }}>
        <h3 className="pt-demo-title">Tài liệu kế hoạch tập luyện</h3>
        {!plans.length ? (
          <div className="ptp-sub">Chưa có file kế hoạch nào.</div>
        ) : (
          <div className="pt-demo-grid pt-demo-grid--docs">
            {plans.map((p) => {
              const url = p.url || p.fileUrl || "";
              return (
                <div key={p.id} className="ptp-card pt-demo-item-card pt-doc-item">
                  <div className="pt-doc-titleRow">
                    <div className="pt-doc-title">{p.title || "Kế hoạch tập"}</div>
                    <div className="pt-doc-meta">{formatBytes(p.bytes)}</div>
                  </div>
                  <div className="ptp-sub">
                    {p.mimeType ? p.mimeType : "Tài liệu"}
                  </div>
                  <div className="pt-doc-actions">
                    {url ? (
                      <a
                        className="ptp-btn ptp-btn--small"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem/Tải file
                      </a>
                    ) : (
                      <span className="ptp-sub">Chưa có link file</span>
                    )}
                    <button
                      type="button"
                      className="ptp-btn ptp-btn--warn ptp-btn--small"
                      onClick={() => onDeletePlan(p.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form className="ptp-card pt-demo-upload-card" onSubmit={onSendToMember}>
        <h3 className="pt-demo-title">Gửi tài liệu cho học viên (theo gói đang học)</h3>
        <div className="ptp-sub" style={{ marginBottom: 10 }}>
          Chọn gói kích hoạt bạn phụ trách rồi gửi mục từ thư viện bên trên.
        </div>
        <div className="ptp-grid">
          <div className="ptp-row">
            <label>Gói kích hoạt</label>
            <select
              className="ptp-input"
              value={sendActivationId}
              onChange={(e) => {
                setSendActivationId(e.target.value);
                setSendItemId("");
              }}
            >
              <option value="">— Chọn —</option>
              {eligibleActivations.map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.id} · {a.packageName || "Gói"} · {a.memberUsername || "Học viên"}
                </option>
              ))}
            </select>
          </div>
          <div className="ptp-row">
            <label>Loại gửi</label>
            <select
              className="ptp-input"
              value={sendKind}
              onChange={(e) => {
                setSendKind(e.target.value);
                setSendItemId("");
              }}
            >
              <option value="demo_video">Video hướng dẫn</option>
              <option value="training_plan">Tài liệu kế hoạch</option>
            </select>
          </div>
          <div className="ptp-row">
            <label>Mục từ thư viện của bạn</label>
            <select
              className="ptp-input"
              value={sendItemId}
              onChange={(e) => setSendItemId(e.target.value)}
            >
              <option value="">— Chọn —</option>
              {sendItemOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="pt-demo-upload-action">
          <button type="submit" className="ptp-btn ptp-btn--primary" disabled={sending || !sendActivationId}>
            {sending ? "Đang gửi..." : "Gửi cho học viên"}
          </button>
        </div>
        {sendActivationId ? (
          <div style={{ marginTop: 14 }}>
            <div className="ptp-sub" style={{ marginBottom: 10 }}>
              Đã gửi cho gói này:
            </div>
            {!sentMaterials.length ? (
              <div className="ptp-sub">Chưa có mục nào.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {sentMaterials.map((m) => (
                  <div key={m.id} className="ptp-card" style={{ padding: 10 }}>
                    <div style={{ fontWeight: 700 }}>
                      {m.materialKind === "demo_video" ? "Video hướng dẫn" : "Tài liệu kế hoạch"} · {m.title || "—"}
                    </div>
                    <div className="ptp-sub">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString("vi-VN") : ""}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <a className="ptp-btn ptp-btn--small" href={m.fileUrl} target="_blank" rel="noreferrer">
                        Mở link
                      </a>
                      <button
                        type="button"
                        className="ptp-btn ptp-btn--warn ptp-btn--small"
                        onClick={() => onDeleteSent(m.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </form>

      <NiceModal
        open={Boolean(modalState)}
        onClose={() => {
          if (modalState?.kind === "confirm") {
            modalState?.onClose?.();
            return;
          }
          setModalState(null);
        }}
        tone={modalState?.tone || "info"}
        title={modalState?.title || "Thông báo"}
        footer={
          modalState?.kind === "confirm" ? (
            <>
              <button type="button" className="nice-modal__btn nice-modal__btn--ghost" onClick={modalState?.onClose}>
                Hủy
              </button>
              <button type="button" className="nice-modal__btn nice-modal__btn--primary" onClick={modalState?.onConfirm}>
                Xác nhận
              </button>
            </>
          ) : (
            <button type="button" className="nice-modal__btn nice-modal__btn--primary" onClick={() => setModalState(null)}>
              Đã hiểu
            </button>
          )
        }
      >
        <p>{modalState?.message}</p>
      </NiceModal>
    </div>
  );
};

export default PTDemoVideos;
