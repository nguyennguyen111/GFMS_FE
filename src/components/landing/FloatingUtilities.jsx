// src/components/landing/FloatingUtilities.jsx
import React, { useState } from "react";
import "./FloatingUtilities.css";

function calcBMI(heightCm, weightKg) {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return null;
  return +(w / (h * h)).toFixed(2);
}

function getBMIStatus(bmi) {
  if (bmi == null) return "Chưa có dữ liệu";
  if (bmi < 18.5) return "Thiếu cân";
  if (bmi < 25) return "Bình thường";
  if (bmi < 30) return "Thừa cân";
  return "Béo phì";
}

export default function FloatingUtilities() {
  const [openBMI, setOpenBMI] = useState(false);
  const [openAI, setOpenAI] = useState(false);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const bmi = calcBMI(heightCm, weightKg);

  return (
    <>
      <div className="floating-utils">
        <button
          className="floating-btn bmi"
          onClick={() => {
            setOpenBMI((v) => !v);
            setOpenAI(false);
          }}
        >
          BMI
        </button>

        <button
          className="floating-btn ai"
          onClick={() => {
            setOpenAI((v) => !v);
            setOpenBMI(false);
          }}
        >
          AI
        </button>
      </div>

      {openBMI && (
        <div className="floating-panel bmi-panel">
          <div className="floating-panel__head">
            <strong>Tính BMI nhanh</strong>
            <button onClick={() => setOpenBMI(false)}>×</button>
          </div>

          <div className="floating-panel__body">
            <input
              className="floating-input"
              placeholder="Chiều cao (cm)"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
            <input
              className="floating-input"
              placeholder="Cân nặng (kg)"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />

            <div className="bmi-result-box">
              <div className="bmi-result-box__value">{bmi ?? "--"}</div>
              <div className="bmi-result-box__label">{getBMIStatus(bmi)}</div>
            </div>
          </div>
        </div>
      )}

      {openAI && (
        <div className="floating-panel ai-panel">
          <div className="floating-panel__head">
            <strong>ChatBox AI</strong>
            <button onClick={() => setOpenAI(false)}>×</button>
          </div>

          <div className="floating-panel__body">
            <div className="ai-placeholder">
              AI Coach sẽ hỗ trợ tư vấn gói tập, lịch tập, BMI, dinh dưỡng và
              giải đáp nhanh cho hội viên.
            </div>
            <button className="lm-btn lm-btn--primary" style={{ width: "100%" }}>
              Bắt đầu trò chuyện
            </button>
          </div>
        </div>
      )}
    </>
  );
}