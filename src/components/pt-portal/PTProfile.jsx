import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { getTrainerId, setTrainerId } from "./ptStorage";
import "./PTPortalPages.css";

const PTProfile = () => {
  const tid = getTrainerId();
  const [input, setInput] = useState("");

  if (tid) return <Navigate to={`/pt/${tid}/details`} replace />;

  return (
    <div className="ptp-wrap">
      <div className="ptp-card">
        <h2>Chưa có Trainer ID</h2>
        <p>Nhập Trainer ID 1 lần để nối Profile/Lịch/Kỹ năng. (Tạm thời, chưa có middleware)</p>

        <div className="ptp-row">
          <input
            className="ptp-input"
            placeholder="Ví dụ: 1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            className="ptp-btn"
            onClick={() => {
              const n = Number(input);
              if (!n || n <= 0) return alert("Trainer ID không hợp lệ");
              setTrainerId(n);
              window.location.reload();
            }}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export default PTProfile;
