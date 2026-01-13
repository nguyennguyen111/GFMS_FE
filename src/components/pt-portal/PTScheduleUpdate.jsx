// src/components/pt-portal/PTScheduleUpdate.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMyPTProfile, getPTSchedule, updatePTSchedule } from "../../services/ptService";
import "./PTScheduleUpdate.css";

const EMPTY = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

const days = [
  { key: "monday", label: "Thứ 2" },
  { key: "tuesday", label: "Thứ 3" },
  { key: "wednesday", label: "Thứ 4" },
  { key: "thursday", label: "Thứ 5" },
  { key: "friday", label: "Thứ 6" },
  { key: "saturday", label: "Thứ 7" },
  { key: "sunday", label: "Chủ nhật" },
];

// ===== sanitize schedule before sending to BE =====
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Extract "HH:MM" even if UI/browser returns "08:00 SA" / "09:00 CH"
const toHHMM = (v) => {
  const s = String(v ?? "");
  const m = s.match(/\b\d{2}:\d{2}\b/);
  return m ? m[0] : "";
};

const buildCleanSchedule = (raw) => {
  const out = {};
  for (const k of DAY_KEYS) {
    const slots = Array.isArray(raw?.[k]) ? raw[k] : [];
    out[k] = slots
      .map((x) => ({
        start: toHHMM(x?.start),
        end: toHHMM(x?.end),
      }))
      .filter((x) => x.start && x.end);
  }
  return out;
};

const PTScheduleUpdate = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ptId, setPtId] = useState(null);
  const [resolveError, setResolveError] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState(EMPTY);
  const [msg, setMsg] = useState("");

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  // 1) Resolve đúng PT đang đăng nhập
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const run = async () => {
      try {
        setResolveError("");
        const me = await getMyPTProfile(); // GET /api/pt/me
        const myId = String(me?.id);

        setPtId(myId);

        if (id && id !== "undefined" && String(id) !== myId) {
          navigate(`/pt/${myId}/schedule-update`, { replace: true });
        }
      } catch (e) {
        const err =
          e?.response?.data?.message ||
          e?.EM ||
          e?.message ||
          "Không lấy được PT profile (/api/pt/me)";
        setResolveError(err);
      }
    };

    run();
  }, [id, navigate, user]);

  // 2) Load schedule theo ptId resolved
  useEffect(() => {
    if (!ptId) return;

    const run = async () => {
      try {
        setLoading(true);
        const sch = await getPTSchedule(ptId);
        setSchedule({ ...EMPTY, ...(sch || {}) });
      } catch (e) {
        console.error(e);
        setSchedule(EMPTY);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [ptId]);

  // Helpers
  const addSlot = (dayKey) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), { start: "08:00", end: "09:00" }],
    }));
  };

  const removeSlot = (dayKey, idx) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((_, i) => i !== idx),
    }));
  };

  const updateSlot = (dayKey, idx, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };

  const handleSave = async () => {
    if (!ptId) return;

    try {
      setSaving(true);
      setMsg("");

      const clean = buildCleanSchedule(schedule);

      // ✅ CÁCH A: ptService sẽ tự wrap { availableHours: ... }
      await updatePTSchedule(ptId, clean);

      setMsg("✅ Lưu lịch rảnh thành công!");
      navigate(`/pt/${ptId}/schedule`);
    } catch (e) {
      console.error(e);
      const err = e?.response?.data?.message || e?.EM || e?.message || "Lưu thất bại";
      setMsg(`❌ ${err}`);
    } finally {
      setSaving(false);
    }
  };

  if (resolveError) {
    return (
      <div className="ptSUPage">
        <div className="ptSUPage__inner">
          <div className="ptSU__error">
            <div style={{ fontWeight: 950, marginBottom: 6 }}>Không xác định được PT của bạn</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{resolveError}</div>
          </div>

          <button className="ptSU__btn" onClick={() => navigate("/login")}>
            Về đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ptSUPage">
        <div className="ptSUPage__inner">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="ptSUPage">
      <div className="ptSUPage__inner">
        <div className="ptSUTop">

          <div className="ptSU__header">
            <div>
              <h1>Cập nhật lịch rảnh</h1>
              <div className="ptSU__sub">PT #{ptId}</div>
            </div>

            <div className="ptSU__actions">
              <button
                className="ptSU__btn ptSU__btn--ghost"
                onClick={() => navigate(`/pt/${ptId}/schedule`)}
              >
                Quay lại lịch
              </button>
              <button className="ptSU__btn" onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>

          {msg ? (
            <div
              className="ptSU__error"
              style={{
                borderColor: "rgba(244,137,21,0.35)",
                background: "rgba(244,137,21,0.10)",
              }}
            >
              {msg}
            </div>
          ) : null}
        </div>

        <div className="ptSU__grid">
          {days.map((d) => (
            <div key={d.key} className="ptSU__dayCard">
              <div className="ptSU__dayHeader">
                <h3>{d.label}</h3>
                <button className="ptSU__miniBtn" onClick={() => addSlot(d.key)}>
                  + Thêm
                </button>
              </div>

              {(schedule[d.key] || []).length === 0 ? (
                <div className="ptSU__empty">Không có khung giờ</div>
              ) : (
                (schedule[d.key] || []).map((s, idx) => (
                  <div key={idx} className="ptSU__slot">
                    <div className="ptSU__slotRow">
                      <label>Bắt đầu</label>
                      <input
                        type="time"
                        value={toHHMM(s.start)}
                        onChange={(e) => updateSlot(d.key, idx, "start", e.target.value)}
                      />
                    </div>

                    <div className="ptSU__slotRow" style={{ marginBottom: 12 }}>
                      <label>Kết thúc</label>
                      <input
                        type="time"
                        value={toHHMM(s.end)}
                        onChange={(e) => updateSlot(d.key, idx, "end", e.target.value)}
                      />
                    </div>

                    <button className="ptSU__remove" onClick={() => removeSlot(d.key, idx)}>
                      Xóa khung giờ
                    </button>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PTScheduleUpdate;
