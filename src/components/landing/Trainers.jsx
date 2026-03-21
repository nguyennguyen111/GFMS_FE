import React from 'react';
import './Trainers.css';
import { Instagram, Youtube } from 'lucide-react';

const Trainers = () => {
  const trainers = [
    { name: 'Tuấn Anh', role: 'Bodybuilding Pro', img: 'https://images.unsplash.com/photo-1567013127542-490d757e51fe?q=80&w=1974&auto=format&fit=crop' },
    { name: 'Minh Vy', role: 'Pilates & Strength', img: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=2070&auto=format&fit=crop' },
    { name: 'Hoàng Nam', role: 'HIIT Master', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop' },
    { name: 'Linh Chi', role: 'Yoga Specialist', img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2120&auto=format&fit=crop' }
  ];

  return (
    <section className="trainers">
      <div className="trainers-container">
        <div className="trainers-header">
          <div className="trainers-label">Expertise</div>
          <h2 className="trainers-title">Đội ngũ Master Trainer</h2>
        </div>

        <div className="trainer-grid">
          {trainers.map((trainer, i) => (
            <div key={i} className="trainer-card">
              <div className="trainer-img-wrapper">
                <img 
                  src={trainer.img} 
                  alt={trainer.name}
                  className="trainer-img"
                />
              </div>
              <h4 className="trainer-name">Coach {trainer.name}</h4>
              <div className="trainer-role">{trainer.role}</div>
              <p className="trainer-desc">Chuyên gia cấp cao với lộ trình tập luyện cá nhân hóa.</p>
              <div className="trainer-socials">
                <button className="social-btn">
                  <Instagram size={16} />
                </button>
                <button className="social-btn">
                  <Youtube size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Trainers;
