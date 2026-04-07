import React from 'react';
import './Pricing.css';
import { Check, ArrowRight, Star, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const priceFmt = (n) => `${new Intl.NumberFormat('vi-VN').format(Number(n || 0))} VNĐ`;

const buildFeatures = (pkg) => {
  const features = [];
  if (pkg.sessions) features.push(`${pkg.sessions} buổi trong gói`);
  if (pkg.durationDays) features.push(`Hiệu lực ${pkg.durationDays} ngày`);
  if (pkg.type) features.push(`Loại: ${pkg.type}`);
  if (pkg.Gym?.name) features.push(`Áp dụng tại ${pkg.Gym.name}`);
  return features.slice(0, 4);
};

const Pricing = ({ packages = [], loading }) => {
  const navigate = useNavigate();
  const items = packages.slice(0, 3);

  return (
    <section className="pricing" id="goi-tap">
      <div className="pricing-container">
        <div className="pricing-header">
          <div>
            <div className="pricing-label">Package</div>
            <h2 className="pricing-title">Gói tập phổ biến trong hệ thống</h2>
          </div>
          <button className="gfms-view-all-btn" onClick={() => navigate('/marketplace/gyms')}>
            Khám phá thêm <ArrowRight size={16} />
          </button>
        </div>

        <div className="pricing-grid">
          {loading && !items.length ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="price-card" />) : items.map((pkg, index) => {
            const featured = index === 1;
            return (
              <div key={pkg.id || index} className={`price-card ${featured ? 'price-card-featured' : ''}`}>
                {featured ? <div className="featured-badge">Trending</div> : null}
                <div className={featured ? 'price-tag-accent' : 'price-tag'}>{pkg.packageType === 'personal_training' ? 'Personal Training' : 'Membership'}</div>
                <h3 className="price-name">{pkg.name}</h3>
                <div className="price-value-container">
                  <span className={featured ? 'price-amount-accent' : 'price-amount'}>{priceFmt(pkg.price)}</span>
                  <span className="price-currency">{pkg.Gym?.name || 'GFMS'}</span>
                </div>
                <ul className="price-features">
                  {buildFeatures(pkg).map((feature, idx) => (
                    <li key={idx} className="feature-item"><Check size={16} className="feature-check" /> {feature}</li>
                  ))}
                  <li className="feature-item"><Flame size={16} className="feature-check" /> {pkg.purchaseCount || 0} lượt mua</li>
                  <li className="feature-item"><Star size={16} className="feature-check" /> {(Number(pkg.avgRating || 0)).toFixed(1)} / 5 ({pkg.reviewCount || 0} đánh giá)</li>
                </ul>
                <button className={featured ? 'price-btn-primary' : 'price-btn-secondary'} onClick={() => navigate(`/marketplace/packages/${pkg.id}`)}>
                  Xem chi tiết
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
