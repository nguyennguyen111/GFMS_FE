import React from "react";
import "./Stats.css";
import { Dumbbell, Award, Timer } from "lucide-react";

const Stats = () => {
  return (
    <section className="gfms-stats">
      <div className="gfms-stats-container">
        <div className="gfms-stats-grid">
          <div className="gfms-stat-card-large">
            <Dumbbell className="gfms-stat-icon-bg" />
            <div className="gfms-stat-value">15.000+</div>
            <div className="gfms-stat-label">Hội viên tin tưởng</div>
          </div>

          <div className="gfms-stat-card">
            <Award className="gfms-stat-icon" />
            <div className="gfms-stat-content">
              <div className="gfms-stat-title">Chất lượng 5★</div>
              <p className="gfms-stat-desc">
                Tiêu chuẩn quốc tế trong từng thiết bị và dịch vụ.
              </p>
            </div>
          </div>

          <div className="gfms-stat-card-accent">
            <Timer className="gfms-stat-icon-dark" />
            <div className="gfms-stat-content">
              <div className="gfms-stat-title-dark">Mở cửa 24/7</div>
              <p className="gfms-stat-desc-dark">
                Tập luyện bất kể thời gian, không giới hạn bứt phá.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stats;