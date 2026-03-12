// src/components/landing/StatsSection.jsx
import React, { useEffect, useState } from "react";
import "./StatsSection.css";

const stats = [
  { value: 12, suffix: "+", label: "Chi nhánh có thể quản lý" },
  { value: 2480, suffix: "+", label: "Hội viên trên hệ thống" },
  { value: 186, suffix: "/ngày", label: "Booking xử lý mỗi ngày" },
  { value: 98, suffix: "%", label: "Độ ổn định vận hành" },
];

function CountUp({ end, suffix = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const stepTime = Math.max(Math.floor(duration / end), 20);

    const timer = setInterval(() => {
      start += Math.ceil(end / 35);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [end]);

  return (
    <span>
      {count.toLocaleString("vi-VN")}
      {suffix}
    </span>
  );
}

export default function StatsSection() {
  return (
    <section className="lm-statsModern">
      <div className="lm-sectionHead center">
        <span className="lm-kicker">Dữ liệu nổi bật</span>
        <h2>Sức mạnh của một nền tảng quản lý tập trung</h2>
      </div>

      <div className="lm-statsModern__grid">
        {stats.map((item) => (
          <div className="lm-statModern" key={item.label}>
            <div className="lm-statModern__value">
              <CountUp end={item.value} suffix={item.suffix} />
            </div>
            <div className="lm-statModern__label">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}