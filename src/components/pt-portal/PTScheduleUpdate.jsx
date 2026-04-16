import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMyPTProfile, getPTScheduleRaw, updatePTSchedule } from "../../services/ptService";
import NiceModal from "../common/NiceModal";

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

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

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

const extractHHmm = (v) => {
  const s = String(v ?? "").trim();
  const m = s.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  return m ? `${m[1]}:${m[2]}` : null;
};

const parseHHmmToMin = (hhmm) => {
  const x = extractHHmm(hhmm);
  if (!x) return null;
  const [h, m] = x.split(":").map(Number);
  return h * 60 + m;
};

const parseGymOperating = (raw) => {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;
  const mf = obj.monFri || obj.mon_fri;
  const we = obj.weekend;
  if (!mf?.open || !mf?.close || !we?.open || !we?.close) return null;
  const mo = parseHHmmToMin(mf.open);
  const mc = parseHHmmToMin(mf.close);
  const wo = parseHHmmToMin(we.open);
  const wc = parseHHmmToMin(we.close);
  if (mo === null || mc === null || wo === null || wc === null) return null;
  if (mc <= mo || wc <= wo) return null;
  return {
    monFri: { open: extractHHmm(mf.open), close: extractHHmm(mf.close), openMin: mo, closeMin: mc },
    weekend: { open: extractHHmm(we.open), close: extractHHmm(we.close), openMin: wo, closeMin: wc },
  };
};

const dayLabelVi = {
  monday: "Thứ 2",
  tuesday: "Thứ 3",
  wednesday: "Thứ 4",
  thursday: "Thứ 5",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật",
};

const windowForDay = (dayKey, parsed) => {
  if (!parsed) return null;
  const monFriDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  return monFriDays.includes(dayKey) ? parsed.monFri : parsed.weekend;
};

const validateScheduleAgainstGym = (clean, gym) => {
  const ohRaw = gym?.operatingHours;
  if (ohRaw == null || ohRaw === "") return null;
  const parsed = parseGymOperating(ohRaw);
  if (!parsed) return null;
  for (const d of DAY_KEYS) {
    const win = windowForDay(d, parsed);
    if (!win) continue;
    for (const slot of clean[d] || []) {
      const s = parseHHmmToMin(slot.start);
      const e = parseHHmmToMin(slot.end);
      if (s === null || e === null) continue;
      if (s < win.openMin || e > win.closeMin) {
        return `${dayLabelVi[d]}: khung ${slot.start}–${slot.end} ngoài giờ mở cửa phòng gym (${win.open}–${win.close}).`;
      }
    }
  }
  return null;
};

const validateScheduleBasics = (clean) => {
  for (const d of DAY_KEYS) {
    const slots = Array.isArray(clean?.[d]) ? clean[d] : [];
    const withMin = slots.map((slot) => ({
      ...slot,
      startMin: parseHHmmToMin(slot.start),
      endMin: parseHHmmToMin(slot.end),
    }));

    for (const s of withMin) {
      if (s.startMin === null || s.endMin === null) {
        return `${dayLabelVi[d]}: giờ bắt đầu/kết thúc không hợp lệ.`;
      }
      if (s.endMin <= s.startMin) {
        return `${dayLabelVi[d]}: giờ kết thúc phải lớn hơn giờ bắt đầu.`;
      }
    }

    const sorted = [...withMin].sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].startMin < sorted[i - 1].endMin) {
        return `${dayLabelVi[d]}: các khung giờ bị trùng nhau, vui lòng chỉnh lại.`;
      }
    }
  }
  return null;
};

const PTScheduleUpdate = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ptId, setPtId] = useState(null);
  const [resolveError, setResolveError] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState(EMPTY);
  const [modalState, setModalState] = useState(null);
  const [gym, setGym] = useState(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const gymHoursParsed = useMemo(() => parseGymOperating(gym?.operatingHours), [gym?.operatingHours]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const run = async () => {
      try {
        setResolveError("");
        const me = await getMyPTProfile();
        const myId = String(me?.id);

        setPtId(myId);
        setGym(me?.Gym || null);

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

  useEffect(() => {
    if (!ptId) return;

    const run = async () => {
      try {
        setLoading(true);
        const sch = await getPTScheduleRaw(ptId);
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

      const clean = buildCleanSchedule(schedule);
      const basicErr = validateScheduleBasics(clean);
      if (basicErr) {
        setModalState({ title: "Không thể lưu lịch", message: basicErr, tone: "danger" });
        setSaving(false);
        return;
      }

      const gymErr = validateScheduleAgainstGym(clean, gym);
      if (gymErr) {
        setModalState({ title: "Không thể lưu lịch", message: gymErr, tone: "danger" });
        setSaving(false);
        return;
      }

      await updatePTSchedule(ptId, clean);

      navigate(`/pt/${ptId}/schedule`);
    } catch (e) {
      console.error(e);
      const err = e?.response?.data?.message || e?.EM || e?.message || "Lưu thất bại";
      setModalState({ title: "Không thể lưu lịch", message: err, tone: "danger" });
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
              {gym?.name ? (
                <div className="ptSU__sub" style={{ marginTop: 6 }}>
                  Phòng gym: {gym.name}
                  {gymHoursParsed ? (
                    <span>
                      {" "}
                      — Giờ mở cửa: T2–T6 {gymHoursParsed.monFri.open}–{gymHoursParsed.monFri.close}; T7–CN{" "}
                      {gymHoursParsed.weekend.open}–{gymHoursParsed.weekend.close}
                    </span>
                  ) : null}
                </div>
              ) : null}
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
      <NiceModal
        open={Boolean(modalState)}
        onClose={() => setModalState(null)}
        tone={modalState?.tone || "info"}
        title={modalState?.title || "Thông báo"}
        footer={
          <button type="button" className="nice-modal__btn nice-modal__btn--primary" onClick={() => setModalState(null)}>
            Đã hiểu
          </button>
        }
      >
        <p>{modalState?.message}</p>
      </NiceModal>
    </div>
  );
};

export default PTScheduleUpdate;

