// src/components/landing/LogoStripSection.jsx
import React from "react";
import "./LogoStripSection.css";

const logos = [
  "GFMS Central",
  "GFMS Fitness",
  "Power Gym DN",
  "BlueFit Club",
  "Next Muscle",
  "Prime Branch",
];

export default function LogoStripSection() {
  return (
    <section className="logo-strip">
      <div className="logo-strip__label">Được thiết kế cho mô hình gym nhiều chi nhánh</div>
      <div className="logo-strip__track">
        {logos.concat(logos).map((item, idx) => (
          <div className="logo-chip" key={`${item}-${idx}`}>
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}