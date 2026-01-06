import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPT, updatePT, getPTDetails } from '../../services/ptService';
import './PTForm.css';

const PTForm = () => {
  const { id } = useParams(); // tạo mới thì id undefined
  const ptId = id;
  const navigate = useNavigate();

  const [pt, setPT] = useState({
    userId: '', // ✅ thêm userId để backend không 400
    specialization: '',
    certification: '',
    hourlyRate: 0,
    experienceYears: 0,
    status: 'active',
    bio: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ptId) return;

    const fetchPT = async () => {
      try {
        setLoading(true);
        const data = await getPTDetails(ptId);
        const t = data?.DT || data;

        setPT({
          userId: t?.userId != null ? String(t.userId) : '', // ✅ load userId (string để input dễ)
          specialization: t?.specialization || '',
          certification: t?.certification || '',
          hourlyRate: t?.hourlyRate ?? 0,
          experienceYears: t?.experienceYears ?? 0,
          status: t?.status || 'active',
          bio: t?.bio || '',
        });
      } catch (error) {
        console.error('Error fetching PT details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPT();
  }, [ptId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setPT((prev) => ({
      ...prev,
      // ✅ giữ userId là string (để không bị NaN khi input trống)
      [name]:
        name === 'hourlyRate' || name === 'experienceYears'
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // ✅ build payload đúng kiểu dữ liệu cho backend
      const payload = {
        ...pt,
        userId: pt.userId === '' ? undefined : Number(pt.userId),
        hourlyRate: Number(pt.hourlyRate),
        experienceYears: Number(pt.experienceYears),
      };

      // ✅ validation nhẹ phía FE để khỏi bấm rồi mới ăn 400
      if (!payload.userId || Number.isNaN(payload.userId)) {
        alert('❌ Thiếu User ID. Hãy nhập userId (id trong bảng user).');
        return;
      }

      if (ptId) {
        await updatePT(ptId, payload);
        alert('✅ Cập nhật PT thành công');
      } else {
        await createPT(payload);
        alert('✅ Tạo PT thành công');
      }

      navigate('/pt/clients');
    } catch (error) {
      console.error('Error submitting form:', error);
      // nếu backend có trả message thì show luôn cho dễ debug
      const msg = error?.response?.data?.message || '❌ Lỗi khi lưu PT. Kiểm tra backend.';
      alert(msg);
    }
  };

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1>{ptId ? 'Cập nhật PT' : 'Tạo mới PT'}</h1>
        <Link to="/pt/clients" style={{ textDecoration: 'none' }}>
          <button className="btn">Quay lại</button>
        </Link>
      </header>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          {/* ✅ thêm field userId */}
          <input
            type="number"
            name="userId"
            value={pt.userId}
            onChange={(e) => {
              const { value } = e.target;
              setPT((prev) => ({ ...prev, userId: value })); // giữ string
            }}
            placeholder="User ID (bắt buộc - id trong bảng user)"
          />

          <input
            type="text"
            name="specialization"
            value={pt.specialization}
            onChange={handleChange}
            placeholder="Chuyên môn (specialization)"
          />

          <input
            type="text"
            name="certification"
            value={pt.certification}
            onChange={handleChange}
            placeholder="Chứng chỉ (certification)"
          />

          <input
            type="number"
            name="experienceYears"
            value={pt.experienceYears}
            onChange={handleChange}
            placeholder="Số năm kinh nghiệm"
          />

          <input
            type="number"
            name="hourlyRate"
            value={pt.hourlyRate}
            onChange={handleChange}
            placeholder="Giá theo giờ"
          />

          <select name="status" value={pt.status} onChange={handleChange}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>

          <textarea
            name="bio"
            value={pt.bio}
            onChange={handleChange}
            placeholder="Bio"
            rows={4}
          />

          <button type="submit" className="btn">
            {ptId ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </form>
      )}
    </div>
  );
};

export default PTForm;
