// src/components/landing/ModulesSectionModern.jsx
import React from "react";
import "./ModulesSectionModern.css";

const modules = [
  {
    title: "Quản lý chi nhánh",
    desc: "Chuẩn hóa dữ liệu và vận hành nhiều gym trên cùng một nền tảng.",
  },
  {
    title: "Gói tập & thanh toán",
    desc: "Tạo gói tập, quản lý quyền lợi, xử lý thanh toán và gia hạn.",
  },
  {
    title: "Booking / Slot",
    desc: "Tối ưu lịch tập, giới hạn suất, tránh trùng và quá tải.",
  },
  {
    title: "PT & lịch làm việc",
    desc: "Quản lý hồ sơ PT, lịch dạy, chia sẻ PT giữa chi nhánh.",
  },
  {
    title: "BMI & tiến trình",
    desc: "Theo dõi cơ thể, chỉ số BMI và sự thay đổi qua thời gian.",
  },
  {
    title: "Báo cáo doanh thu",
    desc: "Theo dõi hiệu suất vận hành, doanh thu và tăng trưởng theo gym.",
  },
];

export default function ModulesSectionModern() {
  return (
    <section className="modules-modern">
      <div className="lm-sectionHead center">
        <span className="lm-kicker">Phân hệ nổi bật</span>
        <h2>Tối ưu toàn bộ hành trình vận hành gym</h2>
      </div>

      <div className="modules-modern__grid">
        {modules.map((item, idx) => (
          <div className="module-modern-card" key={item.title}>
            <div className="module-modern-card__index">0{idx + 1}</div>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}