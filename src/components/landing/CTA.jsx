import React from 'react';
import '../landing/CTA.css';
import { Dumbbell } from 'lucide-react';

const CTA = () => {
  return (
    <section className="cta">
      <div className="cta-container">
        <div className="cta-card">
          <Dumbbell className="cta-bg-icon" />
          
          <div className="cta-content">
            <h2 className="cta-title">
              Sẵn sàng bứt phá <br /> giới hạn bản thân?
            </h2>
            <p className="cta-desc">
              Nhận ưu đãi tập thử miễn phí 7 ngày và tư vấn 1:1 từ chuyên gia ngay hôm nay.
            </p>
          </div>
          
          <div className="cta-action">
            <button className="cta-btn">
              Đăng ký tập thử
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;