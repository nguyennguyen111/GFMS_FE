import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CreditCard,
  Dumbbell,
  MapPin,
  UserRound,
} from "lucide-react";
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

const fmtMoney = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("vi-VN") + " ₫";
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

  if (err) return <div className="mpd2-empty">{err}</div>;
  if (!data) return <div className="mpd2-empty">Đang tải gói...</div>;

  const total = data.sessionsTotal ?? data.totalSessions ?? "—";
  const left = data.sessionsRemaining ?? "—";
  const used = Number(total) - Number(left);

  return (
    <div className="mpd2-page">
      <div className="mpd2-topbar">
        <button className="mpd2-back" onClick={() => navigate("/member/my-packages")}>
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>
      </div>

      <section className="mpd2-hero">
        <div className="mpd2-heroLeft">
          <div className="mpd2-kicker">Package details</div>
          <h1 className="mpd2-title">{data.Package?.name || "—"}</h1>
        </div>

        <div className="mpd2-heroActions">
          

          <button
            className="mpd2-btn primary"
            onClick={() => navigate(`/marketplace/packages/${data.Package?.id}`)}
          >
            <span>Book next session</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="mpd2-overview">
        <div className="mpd2-investmentCard">
          <div className="mpd2-label">Total investment</div>
          <div className="mpd2-investmentValue">{fmtMoney(data.Package?.price)}</div>

          <div className="mpd2-progressWrap">
            <div className="mpd2-progressMeta">
              <span>Usage progress</span>
              <b>
                {left}/{total} sessions
              </b>
            </div>
            <div className="mpd2-progress">
              <div className="mpd2-progressBar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="mpd2-statCard highlight">
          <div className="mpd2-label">Remaining</div>
          <div className="mpd2-statValue">{left}</div>
          <div className="mpd2-statSub">Sessions left</div>
        </div>

        <div className="mpd2-statCard">
          <div className="mpd2-label">Validity</div>
          <div className="mpd2-statValue small">{fmtDate(data.expiryDate)}</div>
          <div className="mpd2-statSub">Expiry date</div>
        </div>
      </section>

      <section className="mpd2-detailGrid">
        <div className="mpd2-infoCard">
          <div className="mpd2-infoHead">
            <h3>Thông tin sử dụng</h3>
          </div>

          <div className="mpd2-infoRows">
            <div className="mpd2-row">
              <span className="mpd2-rowLabel">
                <MapPin size={15} />
                Gym
              </span>
              <b
                className="mpd2-link"
                onClick={() => navigate(`/marketplace/gyms/${data.Gym?.id}`)}
              >
                {data.Gym?.name || "—"}
              </b>
            </div>

            <div className="mpd2-row">
              <span className="mpd2-rowLabel">
                <UserRound size={15} />
                PT / Trainer
              </span>
              {data.Trainer ? (
                <b
                  className="mpd2-link"
                  onClick={() => navigate(`/marketplace/trainers/${data.Trainer.id}`)}
                >
                  {data.Trainer.User?.username || "—"}
                </b>
              ) : (
                <b className="mpd2-muted">Chưa gán PT</b>
              )}
            </div>

            <div className="mpd2-row">
              <span className="mpd2-rowLabel">
                <Dumbbell size={15} />
                Loại gói
              </span>
              <b>{data.Package?.type || "basic"}</b>
            </div>

            <div className="mpd2-row">
              <span className="mpd2-rowLabel">
                <CalendarDays size={15} />
                Hết hạn
              </span>
              <b>{fmtDate(data.expiryDate)}</b>
            </div>
          </div>
        </div>

        <div className="mpd2-infoCard">
          <div className="mpd2-infoHead">
            <h3>Thống kê gói tập</h3>
          </div>

          <div className="mpd2-miniGrid">
            <div className="mpd2-miniBox">
              <span>Tổng buổi</span>
              <b>{total}</b>
            </div>
            <div className="mpd2-miniBox">
              <span>Đã dùng</span>
              <b>{Number.isNaN(used) ? "—" : used}</b>
            </div>
            <div className="mpd2-miniBox">
              <span>Còn lại</span>
              <b>{left}</b>
            </div>
            <div className="mpd2-miniBox">
              <span>Trạng thái</span>
              <b>{String(data.status || "unknown").toUpperCase()}</b>
            </div>
          </div>
        </div>

        <div className="mpd2-infoCard">
          <div className="mpd2-infoHead">
            <h3>Giao dịch</h3>
          </div>

          <div className="mpd2-infoRows">
            <div className="mpd2-row">
              <span className="mpd2-rowLabel">
                <CreditCard size={15} />
                Mã giao dịch
              </span>
              <b>{data.Transaction?.transactionCode || data.Transaction?.id || "—"}</b>
            </div>

            <div className="mpd2-row">
              <span className="mpd2-rowLabel">
                <CreditCard size={15} />
                Thanh toán
              </span>
              <b>{data.Transaction?.paymentStatus || "—"}</b>
            </div>

            <div className="mpd2-row">
              <span className="mpd2-rowLabel">
                <CreditCard size={15} />
                Phương thức
              </span>
              <b>{data.Transaction?.paymentMethod || "—"}</b>
            </div>

            <div className="mpd2-row">
              <span className="mpd2-rowLabel">
                <CreditCard size={15} />
                Giá trị
              </span>
              <b>{fmtMoney(data.Package?.price)}</b>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}