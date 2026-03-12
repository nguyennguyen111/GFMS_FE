import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { memberGetMyPackageDetail } from "../../../services/memberPackageService";
import "./MemberPackageDetailPage.css";

const fmtDate = (v) => {
  if (!v) return "—";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
};

export default function MemberPackageDetailPage() {
  const { activationId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setErr("");
        const res = await memberGetMyPackageDetail(activationId);
        if (!mounted) return;
        setData(res.data?.DT);
      } catch (e) {
        if (!mounted) return;
        setErr(e.response?.data?.message || "Không tải được chi tiết gói.");
      }
    })();
    return () => (mounted = false);
  }, [activationId]);

  const progress = useMemo(() => {
    if (!data) return 0;
    const total = Number(data.sessionsTotal || data.totalSessions || 0);
    const left = Number(data.sessionsRemaining || 0);
    if (!total) return 0;
    const used = Math.max(0, total - left);
    return Math.round((used / total) * 100);
  }, [data]);

  if (err) return <div className="mpd-empty">{err}</div>;
  if (!data) return <div className="mpd-empty">Đang tải gói...</div>;

  const total = data.sessionsTotal ?? data.totalSessions ?? "—";
  const left = data.sessionsRemaining ?? "—";

  return (
    <div className="mpd-page">
      <div className="mpd-hero">
        <button className="mpd-back" onClick={() => navigate("/member/my-packages")}>
          ← Quay lại
        </button>

        <div className="mpd-heroMain">
          <div className="mpd-kicker">CHI TIẾT GÓI</div>
          <h2 className="mpd-title">{data.Package?.name || "—"}</h2>
          <div className="mpd-sub">
            Còn lại <b>{left}</b> / <b>{total}</b> buổi • Hết hạn <b>{fmtDate(data.expiryDate)}</b>
          </div>

          <div className="mpd-progress">
            <div className="mpd-progressBar" style={{ width: `${progress}%` }} />
          </div>
          <div className="mpd-progressText">
            Đã sử dụng: <b>{progress}%</b>
          </div>
        </div>

        <div className="mpd-heroSide">
          <div className={`mpd-status ${data.status === "active" ? "on" : "off"}`}>
            {data.status === "active" ? "ACTIVE" : String(data.status || "UNKNOWN").toUpperCase()}
          </div>

         

          <button className="mpd-btn ghost" onClick={() => navigate(`/marketplace/packages/${data.Package?.id}`)}>
            Xem gói trên Marketplace →
          </button>
        </div>
      </div>

      <div className="mpd-grid">
        <div className="mpd-card">
          <div className="mpd-cardHead">
            <h3>🏟️ Gym</h3>
          </div>
          <div className="mpd-cardBody">
            <div className="mpd-link" onClick={() => navigate(`/marketplace/gyms/${data.Gym?.id}`)}>
              {data.Gym?.name || "—"}
            </div>
            <div className="mpd-muted">{data.Gym?.address || ""}</div>
          </div>
        </div>

        <div className="mpd-card">
          <div className="mpd-cardHead">
            <h3>🏋️ PT</h3>
          </div>
          <div className="mpd-cardBody">
            {data.Trainer ? (
              <>
                <div className="mpd-link" onClick={() => navigate(`/marketplace/trainers/${data.Trainer.id}`)}>
                  {data.Trainer.User?.username || "—"}
                </div>
                <div className="mpd-muted">{data.Trainer.specialization || "Personal Trainer"}</div>
              </>
            ) : (
              <div className="mpd-muted">Chưa gán PT.</div>
            )}
          </div>
        </div>

        <div className="mpd-card">
          <div className="mpd-cardHead">
            <h3>📦 Thông tin gói</h3>
          </div>
          <div className="mpd-cardBody mpd-specs">
            <div className="mpd-spec">
              <span>Loại</span>
              <b>{data.Package?.type || "basic"}</b>
            </div>
            <div className="mpd-spec">
              <span>Tổng buổi</span>
              <b>{total}</b>
            </div>
            <div className="mpd-spec">
              <span>Còn lại</span>
              <b>{left}</b>
            </div>
          </div>
        </div>

        <div className="mpd-card">
          <div className="mpd-cardHead">
            <h3>🧾 Giao dịch</h3>
          </div>
          <div className="mpd-cardBody mpd-specs">
            <div className="mpd-spec">
              <span>Mã</span>
              <b>{data.Transaction?.transactionCode || data.Transaction?.id || "—"}</b>
            </div>
            <div className="mpd-spec">
              <span>Thanh toán</span>
              <b>{data.Transaction?.paymentStatus || "—"}</b>
            </div>
            <div className="mpd-spec">
              <span>Phương thức</span>
              <b>{data.Transaction?.paymentMethod || "—"}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}