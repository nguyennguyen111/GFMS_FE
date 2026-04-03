import React from "react";
import "./Stats.css";
import { Dumbbell, Award, Timer } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(Number(n || 0));

const Stats = ({ stats, loading }) => {
  const totalMembers = Number(stats?.totalMembers || 0);
  const totalActiveGyms = Number(stats?.totalActiveGyms || 0);
  const totalActiveTrainers = Number(stats?.totalActiveTrainers || 0);

  return (
    <section className="gfms-stats">
      <div className="gfms-stats-container">
        <div className="gfms-stats-grid">
          <div className="gfms-stat-card-large">
            <Dumbbell className="gfms-stat-icon-bg" />
            <div className="gfms-stat-value">{loading ? "..." : `${fmt(totalMembers)}+`}</div>
            <div className="gfms-stat-label">Hội viên đang có trong hệ thống</div>
          </div>

          <div className="gfms-stat-card">
            <Award className="gfms-stat-icon" />
            <div className="gfms-stat-content">
              <div className="gfms-stat-title">{loading ? "..." : `${fmt(totalActiveGyms)} cơ sở hoạt động`}</div>
              <p className="gfms-stat-desc">
                Dữ liệu thật lấy trực tiếp từ hệ thống gym đang mở bán trên GFMS.
              </p>
            </div>
          </div>

          <div className="gfms-stat-card-accent">
            <Timer className="gfms-stat-icon-dark" />
            <div className="gfms-stat-content">
              <div className="gfms-stat-title-dark">{loading ? "..." : `${fmt(totalActiveTrainers)} PT sẵn sàng`}</div>
              <p className="gfms-stat-desc-dark">
                Danh sách huấn luyện viên active được đồng bộ realtime theo dữ liệu thật.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stats;
