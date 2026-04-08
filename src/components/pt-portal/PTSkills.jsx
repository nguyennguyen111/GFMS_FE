import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPTDetails, updatePTSkills } from '../../services/ptService';
import { specializationToVietnamese } from '../../utils/specializationI18n';
import NiceModal from "../common/NiceModal";
import './PTSkills.css';

const PTSkills = () => {
  const { id } = useParams();
  const ptId = id;
  const navigate = useNavigate();

  const [specialization, setSpecialization] = useState('');
  const [certification, setCertification] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await getPTDetails(ptId);
        const t = data?.DT || data;
        setSpecialization(specializationToVietnamese(t?.specialization || ''));
        setCertification(t?.certification || '');
      } catch (e) {
        console.error(e);
        setError('Không tải được thông tin PT.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [ptId]);

  const handleSave = async () => {
    setError('');
    if (!specialization.trim() && !certification.trim()) {
      setError('Vui lòng nhập ít nhất 1 trường (kỹ năng hoặc chứng chỉ).');
      return;
    }
    try {
      setSaving(true);
      await updatePTSkills(ptId, {
        specialization: specialization.trim(),
        certification: certification.trim(),
      });
      setModalState({ title: "Thành công", message: "Cập nhật kỹ năng/chứng chỉ thành công", tone: "success" });
    } catch (e) {
      console.error(e);
      setError('Lưu thất bại (500). Kiểm tra endpoint /skills.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ptSkillsPage">
        <div className="ptSkillsPage__inner">
          <div className="ptSkills__card">Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ptSkillsPage">
      <div className="ptSkillsPage__inner">
        <div className="ptSkillsTop">
          <button className="ptBack" onClick={() => navigate('/pt/dashboard')}>
            ← Bảng điều khiển PT
          </button>

          <div className="ptSkills__header">
            <div>
              <h1>Kỹ năng / Chứng chỉ</h1>
              <p className="ptSkills__sub">PT #{ptId}</p>
            </div>

            <Link className="ptSkills__btn ptSkills__btn--ghost" to={`/pt/${ptId}/details`}>
              Quay lại hồ sơ
            </Link>
          </div>
        </div>

        {error ? <div className="ptSkills__error">{error}</div> : null}

        <div className="ptSkills__card">
          <div className="ptSkills__field">
            <label>Kỹ năng / Chuyên môn</label>
            <textarea
              rows="3"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="Ví dụ: Giảm cân, Tăng sức mạnh, Yoga..."
            />
          </div>

          <div className="ptSkills__field">
            <label>Chứng chỉ</label>
            <textarea
              rows="3"
              value={certification}
              onChange={(e) => setCertification(e.target.value)}
              placeholder="Ví dụ: Chứng chỉ ACE, NASM-CPT..."
            />
          </div>

          <button className="ptSkills__btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
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
    </div>
  );
};

export default PTSkills;
