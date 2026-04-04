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
import "./PTDemoVideos.css";

const formatBytes = (value) => {
  const n = Number(value || 0);
  if (!n) return "N/A";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const PTDemoVideos = () => {
  const MAX_VIDEO_MB = 200;
  const [videos, setVideos] = useState([]);
  const [durationsById, setDurationsById] = useState({});
  const [plans, setPlans] = useState([]);
  const [title, setTitle] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [file, setFile] = useState(null);
  const [planFile, setPlanFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const [error, setError] = useState("");
  const [eligibleActivations, setEligibleActivations] = useState([]);
  const [sendActivationId, setSendActivationId] = useState("");
  const [sendKind, setSendKind] = useState("demo_video");
  const [sendItemId, setSendItemId] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMaterials, setSentMaterials] = useState([]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMyPTDemoVideos();
      setVideos(Array.isArray(res?.data) ? res.data : []);
      const planRes = await getMyPTTrainingPlans();
      setPlans(Array.isArray(planRes?.data) ? planRes.data : []);
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
    if (!file) {
      setError("Vui lòng chọn 1 video.");
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Video quá lớn. Giới hạn: ${MAX_VIDEO_MB}MB.`);
      return;
    }
    try {
      setUploading(true);
      setError("");
      await uploadMyPTDemoVideo({ file, title });
      setTitle("");
      setFile(null);
      await fetchVideos();
    } catch (err) {
      setError(err?.response?.data?.message || "Upload video thất bại.");
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (videoId) => {
    if (!window.confirm("Xóa video demo này?")) return;
    try {
      await deleteMyPTDemoVideo(videoId);
      setVideos((prev) => prev.filter((v) => String(v.id) !== String(videoId)));
    } catch (err) {
      setError(err?.response?.data?.message || "Không xóa được video.");
    }
  };

  const onUploadPlan = async (e) => {
    e.preventDefault();
    if (!planFile) {
      setError("Vui lòng chọn file kế hoạch (pdf/doc/docx).");
      return;
    }
    try {
      setUploadingPlan(true);
      setError("");
      await uploadMyPTTrainingPlan({ file: planFile, title: planTitle });
      setPlanTitle("");
      setPlanFile(null);
      await fetchVideos();
    } catch (err) {
      setError(err?.response?.data?.message || "Upload file kế hoạch thất bại.");
    } finally {
      setUploadingPlan(false);
    }
  };

  const onDeletePlan = async (planId) => {
    if (!window.confirm("Xóa file kế hoạch này?")) return;
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
    if (!window.confirm("Xóa tài liệu đã gửi? Học viên sẽ không còn thấy trong danh sách.")) return;
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
          <h2 className="ptp-title">Demo Videos</h2>
          <div className="ptp-sub">
            Tải video minh họa để hội viên xem kỹ phong cách huấn luyện của bạn.
          </div>
        </div>
      </div>

      <form className="ptp-card pt-demo-upload-card" onSubmit={onUpload}>
        <div className="ptp-grid">
          <div className="ptp-row">
            <label>Tiêu đề video</label>
            <input
              className="ptp-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Demo buổi tập giảm mỡ"
            />
          </div>
          <div className="ptp-row">
            <label>Chọn file video</label>
            <input
              className="ptp-input"
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <div className="pt-demo-upload-action">
          <button type="submit" className="ptp-btn ptp-btn--primary" disabled={uploading}>
            {uploading ? "Đang upload..." : "Upload video demo"}
          </button>
        </div>
      </form>

      <form className="ptp-card pt-demo-upload-card" onSubmit={onSendToMember}>
        <h3 className="pt-demo-title">Gửi tài liệu cho học viên (theo gói đang học)</h3>
        <div className="ptp-sub" style={{ marginBottom: 10 }}>
          Chọn gói kích hoạt mà bạn được phụ trách, rồi gửi video demo hoặc file kế hoạch đã có ở trên.
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
              <option value="demo_video">Video demo</option>
              <option value="training_plan">File kế hoạch</option>
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
                      {m.materialKind === "demo_video" ? "Video" : "Kế hoạch"} · {m.title || "—"}
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

      <form className="ptp-card pt-demo-upload-card" onSubmit={onUploadPlan}>
        <div className="ptp-grid">
          <div className="ptp-row">
            <label>Tiêu đề kế hoạch tập luyện</label>
            <input
              className="ptp-input"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              placeholder="Ví dụ: Kế hoạch tập 8 tuần giảm mỡ"
            />
          </div>
          <div className="ptp-row">
            <label>Chọn file kế hoạch (pdf/doc/docx)</label>
            <input
              className="ptp-input"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setPlanFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <div className="pt-demo-upload-action">
          <button type="submit" className="ptp-btn ptp-btn--primary" disabled={uploadingPlan}>
            {uploadingPlan ? "Đang upload..." : "Upload kế hoạch tập luyện"}
          </button>
        </div>
      </form>

      {error ? <div className="ptp-error">{error}</div> : null}

      {loading ? (
        <div className="ptp-card pt-demo-loading-card">
          Đang tải...
        </div>
      ) : videos.length === 0 ? (
        <div className="ptp-empty">Chưa có video demo nào.</div>
      ) : (
        <div className="pt-demo-grid">
          {videos.map((v) => (
            <div key={v.id} className="ptp-card pt-demo-item-card">
              <video
                src={v.url}
                controls
                className="pt-demo-video"
                onLoadedMetadata={(e) => {
                  const duration = e.currentTarget?.duration;
                  if (!Number.isFinite(duration)) return;
                  setDurationsById((prev) => {
                    // chỉ set lần đầu để tránh render liên tục
                    if (prev[v.id] != null) return prev;
                    return { ...prev, [v.id]: duration };
                  });
                }}
              />
              <div className="pt-demo-title">{v.title || "Demo video"}</div>
              <div className="ptp-sub">
                {Number.isFinite(durationsById[v.id])
                  ? `Duration: ${Math.round(Number(durationsById[v.id]))}s`
                  : v.duration
                    ? `Duration: ${Math.round(Number(v.duration))}s`
                    : "Duration: N/A"} |{" "}
                {formatBytes(v.bytes)}
              </div>
              <div className="pt-demo-delete-action">
                <button className="ptp-btn ptp-btn--warn ptp-btn--small" onClick={() => onDelete(v.id)}>
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ptp-card pt-demo-upload-card" style={{ marginTop: 12 }}>
        <h3 className="pt-demo-title">Training Plans</h3>
        {!plans.length ? (
          <div className="ptp-sub">Chưa có file kế hoạch nào.</div>
        ) : (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {plans.map((p) => (
              <div key={p.id} className="ptp-card" style={{ padding: 10 }}>
                <div style={{ fontWeight: 700 }}>{p.title || "Training plan"}</div>
                <div className="ptp-sub">{formatBytes(p.bytes)} {p.mimeType ? `| ${p.mimeType}` : ""}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <a className="ptp-btn ptp-btn--small" href={p.url} target="_blank" rel="noreferrer">
                    Xem/Tải file
                  </a>
                  <button className="ptp-btn ptp-btn--warn ptp-btn--small" onClick={() => onDeletePlan(p.id)}>
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PTDemoVideos;
