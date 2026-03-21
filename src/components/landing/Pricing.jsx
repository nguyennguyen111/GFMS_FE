import React from 'react';
import './Pricing.css';
import { Check, X } from 'lucide-react';

const Pricing = () => {
  return (
    <section className="pricing" id="goi-tap">
      <div className="pricing-container">
        <div className="pricing-header">
          <div className="pricing-label">Investment</div>
          <h2 className="pricing-title">Gói tập phổ biến</h2>
        </div>

        <div className="pricing-grid">
          {/* Essential */}
          <div className="price-card">
            <div className="price-tag">Standard</div>
            <h3 className="price-name">Essential</h3>
            <div className="price-value-container">
              <span className="price-amount">990.000</span>
              <span className="price-currency">VNĐ / Tháng</span>
            </div>
            <ul className="price-features">
              <li className="feature-item"><Check size={16} className="feature-check" /> Truy cập 1 CLB cố định</li>
              <li className="feature-item"><Check size={16} className="feature-check" /> Đầy đủ thiết bị Gym & Cardio</li>
              <li className="feature-item"><Check size={16} className="feature-check" /> Tủ đồ cá nhân & Tắm hơi</li>
              <li className="feature-item feature-disabled"><X size={16} /> Huấn luyện viên cá nhân</li>
            </ul>
            <button className="price-btn-secondary">
              Đăng ký ngay
            </button>
          </div>

          {/* Elite */}
          <div className="price-card price-card-featured">
            <div className="featured-badge">Recommended</div>
            <div className="price-tag-accent">Professional</div>
            <h3 className="price-name">Elite Performance</h3>
            <div className="price-value-container">
              <span className="price-amount-accent">1.850.000</span>
              <span className="price-currency">VNĐ / Tháng</span>
            </div>
            <ul className="price-features">
              <li className="feature-item"><Check size={16} className="feature-check" /> Toàn quyền truy cập hệ thống</li>
              <li className="feature-item"><Check size={16} className="feature-check" /> Tất cả các lớp GroupX & Yoga</li>
              <li className="feature-item"><Check size={16} className="feature-check" /> 02 buổi PT định hướng</li>
              <li className="feature-item"><Check size={16} className="feature-check" /> GFMS Mobile App Pro</li>
            </ul>
            <button className="price-btn-primary">
              Bắt đầu ngay
            </button>
          </div>

          {/* Black */}
          <div className="price-card">
            <div className="price-tag">Prestige</div>
            <h3 className="price-name">Black Membership</h3>
            <div className="price-value-container">
              <span className="price-amount">4.500.000</span>
              <span className="price-currency">VNĐ / Tháng</span>
            </div>
            <ul className="price-features">
              <li className="feature-item"><Check size={16} className="feature-check" /> Đặc quyền VIP Lounge</li>
              <li className="feature-item"><Check size={16} className="feature-check" /> PT riêng 8 buổi / tháng</li>
              <li className="feature-item"><Check size={16} className="feature-check" /> Chế độ dinh dưỡng riêng</li>
              <li className="feature-item"><Check size={16} className="feature-check" /> Mời 1 người bạn đi cùng</li>
            </ul>
            <button className="price-btn-secondary">
              Liên hệ tư vấn
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;