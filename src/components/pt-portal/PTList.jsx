import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPTs } from '../../services/ptService';
import './PTList.css';

const PTList = () => {
  const [ptList, setPTList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPTList = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getPTs(); // service đã sửa gọi /api/pt
        setPTList(Array.isArray(data) ? data : (data?.DT || data || []));
      } catch (e) {
        console.error('Error fetching PT list:', e);
        setError('Không tải được danh sách PT. Kiểm tra backend /api/pt');
      } finally {
        setLoading(false);
      }
    };
    fetchPTList();
  }, []);

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1>Danh sách Huấn luyện viên</h1>
        <Link to="/pt/create" style={{ textDecoration: 'none' }}>
          <button className="btn">+ Tạo PT</button>
        </Link>
      </header>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#ff9b9b', fontWeight: 700 }}>{error}</p>}

      {!loading && !error && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
          {ptList.length === 0 ? (
            <li style={{ color: '#9c9c9c' }}>Chưa có PT nào.</li>
          ) : (
            ptList.map((t) => (
              <li
                key={t.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {t?.User?.username ? t.User.username : `PT #${t.id}`}
                    <span style={{ marginLeft: 10, color: '#9c9c9c', fontWeight: 700 }}>
                      ({t.status || 'active'})
                    </span>
                  </div>
                  <div style={{ color: '#D9D9D9', marginTop: 6 }}>
                    <strong>Chuyên môn:</strong> {t.specialization || '—'} &nbsp; | &nbsp;
                    <strong>Chứng chỉ:</strong> {t.certification || '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Link to={`/pt/${t.id}/details`} style={{ textDecoration: 'none' }}>
                    <button className="btn">Chi tiết</button>
                  </Link>
                  <Link to={`/pt/${t.id}/schedule`} style={{ textDecoration: 'none' }}>
                    <button className="btn">Lịch</button>
                  </Link>
                  <Link to={`/pt/${t.id}/schedule-update`} style={{ textDecoration: 'none' }}>
                    <button className="btn">Cập nhật lịch</button>
                  </Link>
                  <Link to={`/pt/${t.id}/skills`} style={{ textDecoration: 'none' }}>
                    <button className="btn">Skills</button>
                  </Link>
                  <Link to={`/pt/edit/${t.id}`} style={{ textDecoration: 'none' }}>
                    <button className="btn">Sửa</button>
                  </Link>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default PTList;
