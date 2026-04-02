import React from "react";
import "./GymNetwork.css";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "motion/react";

const GymNetwork = () => {
  const gyms = [
    {
      name: "GFMS The Central",
      loc: "District 1, HCMC",
      img: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2070&auto=format&fit=crop",
      features: ["2500m2", "Sauna & Pool"],
    },
    {
      name: "GFMS Capital Peak",
      loc: "Cau Giay, Hanoi",
      img: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=1975&auto=format&fit=crop",
      features: ["1800m2", "Boxing Ring"],
    },
    {
      name: "GFMS Ocean View",
      loc: "Son Tra, Da Nang",
      img: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?q=80&w=2069&auto=format&fit=crop",
      features: ["2000m2", "Yoga Zenith"],
    },
  ];

  return (
    <section className="gfms-gym-network" id="gym">
      <div className="gfms-network-container">
        <div className="gfms-network-header">
          <div>
            <div className="gfms-network-label">Network</div>
            <h2 className="gfms-network-title">Hệ thống phòng tập</h2>
          </div>
          <button className="gfms-view-all-btn">
            Tất cả cơ sở <ArrowRight size={16} />
          </button>
        </div>

        <div className="gfms-gym-grid">
          {gyms.map((gym, i) => (
            <motion.div key={i} whileHover={{ y: -10 }} className="gfms-gym-card">
              <img src={gym.img} alt={gym.name} className="gfms-gym-img" />
              <div className="gfms-gym-card-overlay" />
              <div className="gfms-gym-card-content">
                <div className="gfms-gym-loc">{gym.loc}</div>
                <h3 className="gfms-gym-name">{gym.name}</h3>
                <div className="gfms-gym-features">
                  {gym.features.map((f, j) => (
                    <span key={j} className="gfms-gym-feature">
                      <Check size={12} className="gfms-feature-check" /> {f}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GymNetwork;