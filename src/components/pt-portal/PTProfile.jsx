import React, { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { getTrainerId, setTrainerId, clearTrainerId } from "./ptStorage";
import { getMyPTProfile } from "../../services/ptService";
import "./PTPortalPages.css";

const PTProfile = () => {
  const cachedId = getTrainerId();
  const [resolvedId, setResolvedId] = useState(cachedId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);

        // ✅ luôn hỏi /me để chắc chắn đúng PT của user hiện tại
        const data = await getMyPTProfile();
        const me = data?.DT || data;

        const myId =
          me?.id ||
          me?.trainerId ||
          me?.trainer?.id ||
          me?.PT?.id ||
          null;

        if (myId) {
          // nếu cache sai (ví dụ 1), override lại cho đúng
          setTrainerId(Number(myId));
          setResolvedId(Number(myId));
        } else {
          // user trainer nhưng chưa có PT profile
          clearTrainerId();
          setResolvedId(null);
        }
      } catch (e) {
        // nếu lỗi (vd backend chưa có /me) thì fallback cache
        console.error("getMyPTProfile failed:", e);
        setResolvedId(cachedId || null);
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loading && resolvedId) {
    return <Navigate to={`/pt/${resolvedId}/details`} replace />;
  }

  return (
    <div className="ptp-wrap">
      <div className="ptp-card">
        <h2>Hồ sơ PT</h2>
        <p>
          {loading
            ? "Đang kiểm tra hồ sơ..."
            : "Tài khoản Trainer của bạn chưa có hồ sơ PT. Hãy tạo hồ sơ trước."}
        </p>

        {!loading && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/pt/profile/create" style={{ textDecoration: "none" }}>
              <button className="ptp-btn">Tạo hồ sơ</button>
            </Link>

            <button
              className="ptp-btn"
              style={{
                background: "transparent",
                border: "1px solid rgba(244,137,21,0.45)",
              }}
              onClick={() => {
                clearTrainerId();
                window.location.reload();
              }}
            >
              Xóa cache trainerId
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PTProfile;
