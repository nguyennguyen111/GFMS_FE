// src/components/pages/marketplace/trainers/TrainerDetailsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mpGetTrainerDetail } from "../../../../services/marketplaceService";
import ImageWithFallback from "../../../common/ImageWithFallback";
import "./TrainerDetailsPage.css";

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("vi-VN") + " ₫";
};

const safe = (v, fallback = "—") => (v === null || v === undefined || v === "" ? fallback : v);

const dayLabel = {
  monday: "Thứ 2",
  tuesday: "Thứ 3",
  wednesday: "Thứ 4",
  thursday: "Thứ 5",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật",
};

const normalizeTrainerStatus = (t) => {
  // ưu tiên isActive boolean
  if (typeof t?.isActive === "boolean") return t.isActive ? "active" : "inactive";
  // fallback status string
  const s = String(t?.status || "").toLowerCase();
  if (["active", "inactive", "suspended"].includes(s)) return s;
  return "unknown";
};

const StatusPill = ({ value }) => {
  const text =
    value === "active"
      ? "ĐANG HOẠT ĐỘNG"
      : value === "inactive"
      ? "TẠM OFFLINE"
      : value === "suspended"
      ? "TẠM KHÓA"
      : "N/A";
  return <span className={`td-status ${value}`}>{text}</span>;
};

const InfoRow = ({ icon, label, value }) => (
  <div className="td-row">
    <span className="td-ico">{icon}</span>
    <span className="td-k">{label}</span>
    <span className="td-v">{value}</span>
  </div>
);

const SocialLinks = ({ links }) => {
  if (!links || typeof links !== "object") return <div className="td-muted">Chưa cập nhật.</div>;
  const entries = Object.entries(links).filter(([, v]) => v);
  if (!entries.length) return <div className="td-muted">Chưa cập nhật.</div>;

  return (
    <div className="td-links">
      {entries.map(([k, v]) => (
        <a key={k} className="td-link" href={String(v)} target="_blank" rel="noreferrer">
          🔗 {k}
        </a>
      ))}
    </div>
  );
};

const Schedule = ({ availableHours }) => {
  if (!availableHours || typeof availableHours !== "object") {
    return <div className="td-muted">Chưa cập nhật lịch rảnh.</div>;
  }

  const keys = Object.keys(dayLabel);
  return (
    <div className="td-schedule">
      {keys.map((d) => {
        const slots = Array.isArray(availableHours[d]) ? availableHours[d] : [];
        return (
          <div key={d} className="td-scheduleRow">
            <div className="td-scheduleDay">{dayLabel[d]}</div>
            <div className="td-scheduleSlots">
              {slots.length ? (
                slots.map((s, i) => (
                  <span key={i} className="td-slot">
                    {safe(s?.start)}–{safe(s?.end)}
                  </span>
                ))
              ) : (
                <span className="td-muted">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function TrainerDetailsPage() {
  const { trainerId } = useParams();
  const navigate = useNavigate();

  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await mpGetTrainerDetail(trainerId);
        if (!mounted) return;
        setTrainer(res.data?.DT || null);
      } finally {
        setLoading(false);
      }
    })();

    return () => (mounted = false);
  }, [trainerId]);

  const avatar = useMemo(
    () => trainer?.User?.avatar || "/placeholder-pt.jpg",
    [trainer]
  );

  const status = useMemo(() => normalizeTrainerStatus(trainer), [trainer]);

  const languages = useMemo(() => {
    const arr = trainer?.languages;
    if (!Array.isArray(arr) || !arr.length) return [];
    return arr.filter(Boolean);
  }, [trainer]);

  const preferredGyms = useMemo(() => {
    const arr = trainer?.preferredGyms;
    if (!Array.isArray(arr) || !arr.length) return [];
    return arr.filter(Boolean);
  }, [trainer]);

  if (loading)
    return (
      <div className="td-page">
        <div className="td-container">Đang tải PT...</div>
      </div>
    );

  if (!trainer)
    return (
      <div className="td-page">
        <div className="td-container">Không tìm thấy PT</div>
      </div>
    );

  const name = trainer?.User?.username || "Personal Trainer";
  const spec = trainer?.specialization || "Personal Trainer";

  return (
    <div className="td-page">
      <div className="td-container">
        {/* HERO */}
        <section className="td-hero">
          <button
            className="td-back"
            onClick={() =>
              window.history.length > 1 ? navigate(-1) : navigate("/marketplace/trainers")
            }
          >
            ← Quay lại
          </button>

          <div className="td-heroGrid">
            <div className="td-avatar">
              <ImageWithFallback src={avatar} alt={name} fallback="/placeholder-pt.jpg" />
            </div>

            <div className="td-info">
              <div className="td-label">PERSONAL TRAINER</div>
              <div className="td-titleRow">
                <h1 className="td-title">{name}</h1>
                <StatusPill value={status} />
              </div>

              <p className="td-sub">{spec}</p>

              <div className="td-metrics">
                <div className="td-metric">
                  <span>⭐ Rating</span>
                  <b>{Number(trainer.rating || 4.8).toFixed(1)}</b>
                </div>
                <div className="td-metric">
                  <span>💼 Kinh nghiệm</span>
                  <b>{safe(trainer.experienceYears, 0)} năm</b>
                </div>
                <div className="td-metric">
                  <span>📈 Tổng buổi</span>
                  <b>{safe(trainer.totalSessions, 0)}</b>
                </div>
                <div className="td-metric">
                  <span>⏱ Báo trước</span>
                  <b>{safe(trainer.minBookingNotice, 0)}h</b>
                </div>
              </div>

              <div className="td-actions">
                {trainer?.Gym && (
                  <button
                    className="td-btn ghost"
                    onClick={() => navigate(`/marketplace/gyms/${trainer.Gym.id}`)}
                  >
                    🏋️ Xem Gym
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT GRID */}
        <section className="td-grid">
          {/* Left */}
          <div className="td-left">
            <div className="td-card">
              <div className="td-cardHead">
                <h3>Giới thiệu</h3>
              </div>
              <div className="td-text">
                {trainer.bio || "PT chưa cập nhật phần giới thiệu."}
              </div>
            </div>

            <div className="td-card">
              <div className="td-cardHead">
                <h3>Lịch rảnh</h3>
              </div>
              <Schedule availableHours={trainer.availableHours} />
            </div>
          </div>

          {/* Right */}
          <div className="td-right">
            <div className="td-card">
              <div className="td-cardHead">
                <h3>Thông tin</h3>
              </div>

              <div className="td-rows">
                <InfoRow icon="🎓" label="Chứng chỉ" value={safe(trainer.certification)} />
                <InfoRow icon="🧠" label="Ngôn ngữ" value={languages.length ? languages.join(", ") : "—"} />
                <InfoRow icon="📅" label="Tối đa/ngày" value={safe(trainer.maxSessionsPerDay, 5)} />
                <InfoRow icon="🤝" label="Nhận share" value={trainer.isAvailableForShare ? "Có" : "Không"} />
              </div>
            </div>

            <div className="td-card">
              <div className="td-cardHead">
                <h3>Liên hệ</h3>
              </div>
              <div className="td-rows">
                <InfoRow icon="✉️" label="Email" value={safe(trainer?.User?.email)} />
                <InfoRow icon="📞" label="SĐT" value={safe(trainer?.User?.phone)} />
                <InfoRow icon="📍" label="Địa chỉ" value={safe(trainer?.User?.address)} />
              </div>
            </div>

            <div className="td-card">
              <div className="td-cardHead">
                <h3>Social</h3>
              </div>
              <SocialLinks links={trainer.socialLinks} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}