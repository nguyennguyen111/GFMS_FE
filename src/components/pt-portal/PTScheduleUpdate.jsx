import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPTSchedule, updatePTSchedule } from '../../services/ptService';
import './PTScheduleUpdate.css';

const DAYS = [
  { key: 'monday', label: 'Thứ 2' },
  { key: 'tuesday', label: 'Thứ 3' },
  { key: 'wednesday', label: 'Thứ 4' },
  { key: 'thursday', label: 'Thứ 5' },
  { key: 'friday', label: 'Thứ 6' },
  { key: 'saturday', label: 'Thứ 7' },
  { key: 'sunday', label: 'Chủ nhật' },
];

const emptySlot = () => ({ start: '09:00', end: '18:00' });

const PTScheduleUpdate = () => {
  const { id } = useParams();
  const ptId = id;
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const sch = await getPTSchedule(ptId);
        const normalized = {};
        DAYS.forEach(({ key }) => (normalized[key] = Array.isArray(sch?.[key]) ? sch[key] : []));
        setSchedule(normalized);
      } catch (e) {
        console.error(e);
        setError('Không tải được lịch rảnh. Kiểm tra backend.');
      }
    };
    run();
  }, [ptId]);

  const addSlot = (dayKey) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: [...prev[dayKey], emptySlot()],
    }));
  };

  const removeSlot = (dayKey, idx) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey].filter((_, i) => i !== idx),
    }));
  };

  const changeSlot = (dayKey, idx, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey].map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };

  const validate = () => {
    for (const { key, label } of DAYS) {
      const slots = schedule?.[key] || [];
      for (const s of slots) {
        if (!s.start || !s.end) return `${label}: Start/End không được rỗng`;
        if (s.start >= s.end) return `${label}: Giờ bắt đầu phải nhỏ hơn giờ kết thúc`;
      }
    }
    return '';
  };

  const handleSave = async () => {
    setError('');
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    try {
      setSaving(true);
      await updatePTSchedule(ptId, schedule);
      navigate(`/pt/${ptId}/schedule`);
    } catch (e) {
      console.error(e);
      setError('Lưu thất bại. Xem Network payload (body) có đúng format backend không.');
    } finally {
      setSaving(false);
    }
  };

  if (!schedule) {
    return (
      <div className="ptSUPage">
        <div className="ptSUPage__inner">
          <div className="ptSU__card">Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ptSUPage">
      <div className="ptSUPage__inner">
        <div className="ptSUTop">
          <button className="ptBack" onClick={() => navigate('/pt/dashboard')}>
            ← Dashboard PT
          </button>

          <div className="ptSU__header">
            <div>
              <h1>Cập nhật lịch rảnh</h1>
              <p className="ptSU__sub">PT #{ptId}</p>
            </div>
            <div className="ptSU__actions">
              <Link className="ptSU__btn ptSU__btn--ghost" to={`/pt/${ptId}/schedule`}>
                Quay lại lịch
              </Link>
              <button className="ptSU__btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>

        {error ? <div className="ptSU__error">{error}</div> : null}

        <div className="ptSU__grid">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="ptSU__dayCard">
              <div className="ptSU__dayHeader">
                <h3>{label}</h3>
                <button className="ptSU__miniBtn" onClick={() => addSlot(key)}>
                  + Thêm
                </button>
              </div>

              {schedule[key].length === 0 ? (
                <div className="ptSU__empty">Không có khung giờ</div>
              ) : (
                schedule[key].map((slot, idx) => (
                  <div className="ptSU__slot" key={idx}>
                    <div className="ptSU__slotRow">
                      <label>Start</label>
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => changeSlot(key, idx, 'start', e.target.value)}
                      />
                    </div>

                    <div className="ptSU__slotRow">
                      <label>End</label>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => changeSlot(key, idx, 'end', e.target.value)}
                      />
                    </div>

                    <button className="ptSU__remove" onClick={() => removeSlot(key, idx)}>
                      Xóa
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
