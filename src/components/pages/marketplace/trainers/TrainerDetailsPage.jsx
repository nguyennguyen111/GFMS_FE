import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Dumbbell,
  Clock3,
  Languages,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { mpGetTrainerDetail } from "../../../../services/marketplaceService";
import ImageWithFallback from "../../../common/ImageWithFallback";
import PublicFeedbackSection from "../../../common/PublicFeedbackSection";
import "./TrainerDetailsPage.css";

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
  if (typeof t?.isActive === "boolean") return t.isActive ? "active" : "inactive";
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
    <span className="td-rowIcon">{icon}</span>
    <div className="td-rowBody">
      <span className="td-rowLabel">{label}</span>
      <span className="td-rowValue">{value}</span>
    </div>
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
          <span>{k}</span>
          <ArrowRight size={14} />
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

  const avatar = useMemo(() => trainer?.User?.avatar || "/placeholder-pt.jpg", [trainer]);
  const status = useMemo(() => normalizeTrainerStatus(trainer), [trainer]);

  const languages = useMemo(() => {
    const arr = trainer?.languages;
    if (!Array.isArray(arr) || !arr.length) return [];
    return arr.filter(Boolean);
  }, [trainer]);

  if (loading)
    return (
      <div className="td-page">
        <div className="td-container">
          <div className="td-loading">Đang tải PT...</div>
        </div>
      </div>
    );

  if (!trainer)
    return (
      <div className="td-page">
        <div className="td-container">
          <div className="td-empty">Không tìm thấy PT</div>
        </div>
      </div>
    );

  const name = trainer?.User?.username || "Personal Trainer";
  const spec = trainer?.specialization || "Personal Trainer";

  return (
    <div className="td-page">
      <div className="td-container">
        <section className="td-hero">
          <button
            className="td-back"
            onClick={() =>
              window.history.length > 1 ? navigate(-1) : navigate("/marketplace/trainers")
            }
          >
            <ArrowLeft size={18} />
            <span>Quay lại</span>
          </button>

          <div className="td-heroGrid">
            <div className="td-avatarWrap">
              <div className="td-avatar">
                <ImageWithFallback src={avatar} alt={name} fallback="/placeholder-pt.jpg" />
              </div>
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
                  <span>RATING</span>
                  <b>{Number(trainer.avgRating || trainer.rating || 0).toFixed(1)} ({Number(trainer.reviewCount || 0)})</b>
                </div>
                <div className="td-metric">
                  <span>KINH NGHIỆM</span>
                  <b>{safe(trainer.experienceYears, 0)} năm</b>
                </div>
                <div className="td-metric">
                  <span>HỌC VIÊN</span>
                  <b>{safe(trainer.studentsCount || trainer.clientsCount, 0)}</b>
                </div>
                <div className="td-metric">
                  <span>BÁO TRƯỚC</span>
                  <b>{safe(trainer.minBookingNotice, 0)}h</b>
                </div>
              </div>

              <div className="td-actions">
                {trainer?.Gym && (
                  <button
                    className="td-btn ghost"
                    onClick={() => navigate(`/marketplace/gyms/${trainer.Gym.id}`)}
                  >
                    Xem Gym
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="td-bgText">PT</div>
        </section>

        <section className="td-grid">
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

            <PublicFeedbackSection
              title="Feedback về huấn luyện viên"
              subtitle="Các đánh giá gần đây từ hội viên đã tập cùng PT này."
              items={trainer.feedback || []}
              className="td-feedbackSection"
            />
          </div>

          <div className="td-right">
            <div className="td-card">
              <div className="td-cardHead">
                <h3>Thông tin</h3>
              </div>

              <div className="td-rows">
                <InfoRow
                  icon={<GraduationCap size={16} />}
                  label="Chứng chỉ"
                  value={safe(trainer.certification)}
                />
                <InfoRow
                  icon={<Languages size={16} />}
                  label="Ngôn ngữ"
                  value={languages.length ? languages.join(", ") : "—"}
                />
                <InfoRow
                  icon={<Briefcase size={16} />}
                  label="Nhận share"
                  value={trainer.isAvailableForShare ? "Có" : "Không"}
                />
              </div>
            </div>

            <div className="td-card">
              <div className="td-cardHead">
                <h3>Liên hệ</h3>
              </div>
              <div className="td-rows">
                <InfoRow
                  icon={<Mail size={16} />}
                  label="Email"
                  value={safe(trainer?.User?.email)}
                />
                <InfoRow
                  icon={<Phone size={16} />}
                  label="SĐT"
                  value={safe(trainer?.User?.phone)}
                />
                {trainer?.Gym && (
                  <InfoRow
                    icon={<Dumbbell size={16} />}
                    label="Gym"
                    value={trainer.Gym.name}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}