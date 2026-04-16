import React from 'react';
import './Trainers.css';
import { ArrowRight, BriefcaseBusiness, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ImageWithFallback from '../common/ImageWithFallback';

const Trainers = ({ trainers = [], loading }) => {
  const navigate = useNavigate();
  const items = trainers.slice(0, 4);

  return (
    <section className="trainers">
      <div className="trainers-container">
        <div className="trainers-header">
          <div>
            <div className="trainers-label">Trainer</div>
            <h2 className="trainers-title">Đội ngũ Master Trainer</h2>
          </div>
          <button className="gfms-view-all-btn" onClick={() => navigate('/marketplace/trainers')}>
            Xem tất cả <ArrowRight size={16} />
          </button>
        </div>

        <div className="trainer-grid">
          {loading && !items.length ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="trainer-card" />) : items.map((trainer, i) => (
            <button key={trainer.id || i} className="trainer-card" onClick={() => navigate(`/marketplace/trainers/${trainer.id}`)}>
              <div className="trainer-img-wrapper">
                <ImageWithFallback src={trainer?.User?.avatar} alt={trainer?.User?.username || 'PT'} className="trainer-img" fallback="https://placehold.co/500x700/111111/D6FF00?text=PT" />
              </div>
              <h4 className="trainer-name">Coach {trainer?.User?.username || `PT #${trainer.id}`}</h4>
              <div className="trainer-role">{trainer.specialization || 'Huấn luyện cá nhân hoá'}</div>
              <p className="trainer-desc">{trainer?.Gym?.name || 'GFMS'} • {trainer.bookingCount || 0} lượt đặt • {(Number(trainer.avgRating || 0)).toFixed(1)}★</p>
              <div className="trainer-socials trainer-socials--stats">
                <span className="social-btn"><Star size={16} /> {Number(trainer.avgRating || 0).toFixed(1)}</span>
                <span className="social-btn"><BriefcaseBusiness size={16} /> {trainer.reviewCount || 0} đánh giá</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Trainers;
