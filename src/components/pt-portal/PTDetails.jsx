import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPTDetails } from '../../services/ptService';
import './PTDetails.css';

const PTDetails = () => {
  const { id } = useParams();
  const ptId = id;

  const [pt, setPT] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPTDetails = async () => {
      try {
        setLoading(true);
        const data = await getPTDetails(ptId);
        setPT(data?.DT || data);
      } catch (error) {
        console.error('Error fetching PT details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPTDetails();
  }, [ptId]);

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1>Hồ sơ PT</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link to="/pt/clients" style={{ textDecoration: 'none' }}>
            <button className="btn">Danh sách</button>
          </Link>
          <Link to={`/pt/${ptId}/schedule`} style={{ textDecoration: 'none' }}>
            <button className="btn">Xem lịch</button>
          </Link>
          <Link to={`/pt/${ptId}/skills`} style={{ textDecoration: 'none' }}>
            <button className="btn">Cập nhật skills</button>
          </Link>
        </div>
      </header>

      {loading && <p>Loading...</p>}

      {!loading && !pt && <p style={{ color: '#ff9b9b' }}>Không tìm thấy PT</p>}

      {!loading && pt && (
        <div style={{
          marginTop: 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: 16
        }}>
          <h2 style={{ marginTop: 0, color: '#f48915' }}>
            {pt?.User?.username ? pt.User.username : `PT #${ptId}`}
          </h2>

          <p><strong>Chuyên môn:</strong> {pt.specialization || '—'}</p>
          <p><strong>Chứng chỉ:</strong> {pt.certification || '—'}</p>
          <p><strong>Kinh nghiệm (năm):</strong> {pt.experienceYears ?? '—'}</p>
          <p><strong>Giá theo giờ:</strong> {pt.hourlyRate ?? '—'}</p>
          <p><strong>Trạng thái:</strong> {pt.status || '—'}</p>
          <p><strong>Bio:</strong> {pt.bio || '—'}</p>
        </div>
      )}
    </div>
  );
};

export default PTDetails;
