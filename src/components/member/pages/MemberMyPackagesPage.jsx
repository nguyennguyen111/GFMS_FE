import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { memberGetMyPackages } from "../../../services/memberPackageService";
import "./MemberMyPackagesPage.css";

const fmtMoney = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("vi-VN") + " ₫";
};

export default function MemberMyPackagesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await memberGetMyPackages();
      setRows(res.data?.data || []);
    } catch (e) {
      setRows([]);
      setErr(e.response?.data?.message || "Không tải được danh sách gói.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mh-wrap">
      <div className="mh-head">
        <div>
          <h2 className="mh-title">🎫 Gói của tôi</h2>
          <div className="mh-sub">Danh sách tất cả gói bạn đã mua.</div>
        </div>
      </div>

      {err && <div className="m-error">{err}</div>}

      {loading ? (
        <div className="m-empty">Đang tải...</div>
      ) : rows.length === 0 ? (
        <div className="m-empty">Bạn chưa mua gói nào.</div>
      ) : (
        <div className="mypkg-grid">
          {rows.map((x) => {
            const isPending = String(x.id).startsWith("pending-");
            return (
              <div
                key={x.id}
                className={`mypkg-card ${isPending ? "pending" : ""}`}
                onClick={() => {
                  if (isPending) return;
                  navigate(`/member/my-packages/${x.id}`);
                }}
              >
                <div className="mypkg-top">
                  <div>
                    <div className="mypkg-name">{x.Package?.name}</div>
                    <div className="mypkg-gym">🏟️ {x.Gym?.name}</div>
                  </div>
                  <span className={`m-badge ${x.status === "active" ? "is-on" : "is-off"}`}>
                    {isPending ? "pending" : x.status}
                  </span>
                </div>

                <div className="mypkg-mid">
                  <div>
                    <span>Còn lại</span>
                    <b>{x.sessionsRemaining ?? "—"} buổi</b>
                  </div>
                  <div>
                    <span>Hết hạn</span>
                    <b>{x.expiryDate ? new Date(x.expiryDate).toLocaleDateString("vi-VN") : "—"}</b>
                  </div>
                  <div>
                    <span>Giá</span>
                    <b>{fmtMoney(x.Package?.price)}</b>
                  </div>
                </div>

                <div className="mypkg-foot">
                  {!isPending ? (
                    <button className="m-btn m-btn--small">Chi tiết →</button>
                  ) : (
                    <span className="mypkg-pending">⏳ Đang chờ thanh toán</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
