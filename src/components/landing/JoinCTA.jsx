import React from "react";
import { useNavigate } from "react-router-dom";
import "./JoinCTA.css";

const JoinCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="joincta" id="join-us">
      <div className="joincta-card">
        <div className="joincta-title">
          Sẵn sàng trải nghiệm GFMS?
        </div>
        <div className="joincta-desc">
          Đăng nhập để xem dashboard theo vai trò, hoặc tạo tài khoản để thử luồng nghiệp vụ.
        </div>
        <div className="joincta-actions">
          <button className="btn" onClick={() => navigate("/login")}>Đăng nhập</button>
          <button className="btn btn-outline" onClick={() => navigate("/register")}>Tạo tài khoản</button>
        </div>
      </div>
    </section>
  );
};

export default JoinCTA;
