import React from "react";
import "./GymNetwork.css";
import { ArrowRight, Check, Flame, MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ImageWithFallback from "../common/ImageWithFallback";
import { getFirstImage } from "../../utils/image";

const getArea = (address) => {
  const parts = String(address || "").split(",").map((x) => x.trim()).filter(Boolean);
  return parts[parts.length - 1] || "Khu vực đang cập nhật";
};

const GymNetwork = ({ gyms = [], loading }) => {
  const navigate = useNavigate();
  const viewGyms = gyms.slice(0, 3);

  return (
    <section className="gfms-gym-network" id="gym">
      <div className="gfms-network-container">
        <div className="gfms-network-header">
          <div>
            <div className="gfms-network-label">Network</div>
            <h2 className="gfms-network-title">Hệ thống phòng tập thịnh hành</h2>
          </div>
          <button className="gfms-view-all-btn" onClick={() => navigate("/marketplace/gyms") }>
            Tất cả cơ sở <ArrowRight size={16} />
          </button>
        </div>

        <div className="gfms-gym-grid">
          {loading && !viewGyms.length ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="gfms-gym-card skeleton" />
          )) : viewGyms.map((gym, i) => (
            <button key={gym.id || i} className="gfms-gym-card" onClick={() => navigate(`/marketplace/gyms/${gym.id}`)}>
              <ImageWithFallback src={getFirstImage(gym.images, "/placeholder-gym.jpg")} alt={gym.name} className="gfms-gym-img" />
              <div className="gfms-gym-card-overlay" />
              <div className="gfms-gym-card-content">
                <div className="gfms-gym-loc"><MapPin size={13} /> {getArea(gym.address)}</div>
                <h3 className="gfms-gym-name">{gym.name}</h3>
                <div className="gfms-gym-features">
                  <span className="gfms-gym-feature"><Flame size={12} className="gfms-feature-check" /> {gym.bookingCount || 0} lượt đặt</span>
                  <span className="gfms-gym-feature"><Star size={12} className="gfms-feature-check" /> {(Number(gym.avgRating || 0)).toFixed(1)} / 5</span>
                  <span className="gfms-gym-feature"><Check size={12} className="gfms-feature-check" /> {gym.reviewCount || 0} đánh giá</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GymNetwork;
