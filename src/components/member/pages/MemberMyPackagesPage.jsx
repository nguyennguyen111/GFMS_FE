import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { memberGetMyPackages } from "../../../services/memberPackageService";
import { confirmPayosPayment } from "../../../services/paymentService";
import "./MemberMyPackagesPage.css";

const fmtMoney = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("vi-VN") + " ₫";
};

const fmtDate = (v) => {
  if (!v) return "—";
  const s = String(v);
  // nếu backend trả YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
};

export default function MemberMyPackagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const payosStatus = params.get("payos");
    const orderCode = params.get("orderCode");

    if (!payosStatus) return;

    const runConfirm = async () => {
      try {
        if (payosStatus === "success" && orderCode) {
          await confirmPayosPayment(orderCode);
        }
      } catch (e) {
        setErr(e.response?.data?.message || "Xác nhận thanh toán PayOS thất bại.");
      } finally {
        load();
        navigate(location.pathname, { replace: true });
      }
    };

    runConfirm();
  }, [location.pathname, location.search, navigate, load]);

  const stats = useMemo(() => {
    const s = { total: rows.length, active: 0, expired: 0, pending: 0 };
    rows.forEach((x) => {
      const isPending = String(x.id).startsWith("pending-");
      if (isPending) s.pending++;
      else if (x.status === "active") s.active++;
      else s.expired++;
    });
    return s;
  }, [rows]);

  return (
    <div className="mpkgs-page">
      <div className="mpkgs-hero">
        <div className="mpkgs-heroTop">
          <div>
            <div className="mpkgs-kicker">GÓI TẬP</div>
            <h2 className="mpkgs-title">Gói của tôi</h2>
            <p className="mpkgs-sub">
              Xem tất cả gói bạn đã mua, trạng thái, số buổi còn lại và hạn sử dụng.
            </p>
          </div>

          <div className="mpkgs-stats">
            <span className="mpkgs-pill">Tổng: <b>{stats.total}</b></span>
            <span className="mpkgs-pill">Active: <b>{stats.active}</b></span>
            <span className="mpkgs-pill">Pending: <b>{stats.pending}</b></span>
            <span className="mpkgs-pill">Khác: <b>{stats.expired}</b></span>
          </div>
        </div>

        <div className="mpkgs-actions">
          <button className="mpkgs-btn ghost" onClick={load} disabled={loading}>
            ↻ Tải lại
          </button>
          <button className="mpkgs-btn primary" onClick={() => navigate("/marketplace/gyms")}>
            + Mua gói mới
          </button>
        </div>
      </div>

      {err && <div className="mpkgs-alert">{err}</div>}

      {loading ? (
        <div className="mpkgs-empty">Đang tải...</div>
      ) : rows.length === 0 ? (
        <div className="mpkgs-empty">
          <div className="mpkgs-emptyIcon">🎫</div>
          <div className="mpkgs-emptyTitle">Bạn chưa mua gói nào</div>
          <div className="mpkgs-emptySub">Hãy vào Marketplace để chọn gói phù hợp.</div>
          <button className="mpkgs-btn primary" onClick={() => navigate("/marketplace/packages")}>
            Xem gói tập
          </button>
        </div>
      ) : (
        <div className="mpkgs-grid">
          {rows.map((x) => {
            const isPending = String(x.id).startsWith("pending-");
            const status = isPending ? "pending" : (x.status || "unknown");
            const sessionsRemaining = x.sessionsRemaining ?? x.sessionsLeft ?? "—";
            const totalSessions = x.totalSessions ?? x.Package?.sessions ?? "—";

            return (
              <div
                key={x.id}
                className={`mpkgs-card ${status}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && !isPending && navigate(`/member/my-packages/${x.id}`)}
                onClick={() => {
                  if (isPending) return;
                  navigate(`/member/my-packages/${x.id}`);
                }}
              >
                <div className="mpkgs-cardTop">
                  <div>
                    <div className="mpkgs-name" title={x.Package?.name}>{x.Package?.name || "—"}</div>
                    <div className="mpkgs-gym" title={x.Gym?.name}>
                      🏟️ {x.Gym?.name || "—"}
                    </div>
                  </div>

                  <span className={`mpkgs-badge ${status}`}>
                    {status === "active" ? "ACTIVE" : status === "pending" ? "PENDING" : status.toUpperCase()}
                  </span>
                </div>

                <div className="mpkgs-metrics">
                  <div className="mpkgs-metric">
                    <span>Còn lại</span>
                    <b>{sessionsRemaining}/{totalSessions}</b>
                  </div>
                  <div className="mpkgs-metric">
                    <span>Hết hạn</span>
                    <b>{fmtDate(x.expiryDate)}</b>
                  </div>
                  <div className="mpkgs-metric">
                    <span>Giá</span>
                    <b>{fmtMoney(x.Package?.price)}</b>
                  </div>
                </div>

                <div className="mpkgs-foot">
                  {isPending ? (
                    <div className="mpkgs-pendingNote">⏳ Đang chờ thanh toán</div>
                  ) : (
                    <div className="mpkgs-cta">
                      <span>Xem chi tiết</span>
                      <span className="mpkgs-arrow">→</span>
                    </div>
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