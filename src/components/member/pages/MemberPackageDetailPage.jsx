import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { memberGetMyPackageDetail } from "../../../services/memberPackageService";
import "./MemberPackageDetailPage.css";

export default function MemberPackageDetailPage() {
  const { activationId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    memberGetMyPackageDetail(activationId).then((res) => {
      setData(res.data?.DT);
    });
  }, [activationId]);

  if (!data) return <div className="m-empty">Đang tải gói...</div>;

  return (
    <div className="mh-wrap">
      <div className="m-card padded mpd-header">
        <h2>{data.Package?.name}</h2>
        <div className="mpd-sub">
          {data.sessionsRemaining}/{data.totalSessions} buổi • Hết hạn{" "}
          {new Date(data.expiryDate).toLocaleDateString("vi-VN")}
        </div>
      </div>

      <div className="mpd-grid">
        <div className="m-card padded">
          <h4>🏟️ Gym</h4>
          <p
            className="mpd-link"
            onClick={() => navigate(`/marketplace/gyms/${data.Gym?.id}`)}
          >
            {data.Gym?.name}
          </p>
        </div>

        {data.Trainer && (
          <div className="m-card padded">
            <h4>🏋️ PT</h4>
            <p
              className="mpd-link"
              onClick={() =>
                navigate(`/marketplace/trainers/${data.Trainer.id}`)
              }
            >
              {data.Trainer.User?.username}
            </p>
          </div>
        )}
      </div>

      <div className="m-card padded mpd-actions">
        <button
          className="m-btn m-btn--primary"
          disabled={data.sessionsRemaining <= 0}
          onClick={() =>
            navigate(`/member/bookings/new?activationId=${data.id}`)
          }
        >
          📅 Đặt lịch
        </button>
        <button className="m-btn" onClick={() => navigate("/member/my-packages")}>
          ← Quay lại
        </button>
      </div>
    </div>
  );
}
