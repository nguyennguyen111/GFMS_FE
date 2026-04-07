import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock3, Home, LoaderCircle, XCircle } from "lucide-react";
import { confirmPayosPayment } from "../../../services/paymentService";
import "./MemberPaymentSuccessPage.css";

const REDIRECT_SECONDS = 5;

export default function MemberPaymentSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search || ""), [location.search]);
  const payosStatus = String(params.get("payos") || "").toLowerCase();
  const orderCode = params.get("orderCode");

  const [phase, setPhase] = useState(payosStatus === "success" ? "confirming" : "cancelled");
  const [message, setMessage] = useState(
    payosStatus === "success"
      ? "Đang xác nhận giao dịch PayOS của bạn..."
      : "Thanh toán chưa được hoàn tất hoặc đã bị hủy."
  );
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (payosStatus !== "success" || !orderCode) {
        if (mounted) setPhase("cancelled");
        return;
      }

      try {
        await confirmPayosPayment(orderCode);
        if (!mounted) return;
        setPhase("success");
        setMessage("Thanh toán thành công. Gói tập của bạn đã được kích hoạt và thông báo đã được gửi.");
      } catch (error) {
        if (!mounted) return;
        setPhase("error");
        setMessage(error?.response?.data?.message || "Không thể xác nhận giao dịch PayOS.");
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [orderCode, payosStatus]);

  useEffect(() => {
    if (!["success", "cancelled", "error"].includes(phase)) return undefined;

    setCountdown(REDIRECT_SECONDS);

    const intervalId = window.setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      navigate("/", { replace: true });
    }, REDIRECT_SECONDS * 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [phase, navigate]);

  const icon = useMemo(() => {
    if (phase === "confirming") return <LoaderCircle className="mps-icon spin" size={64} />;
    if (phase === "success") return <CheckCircle2 className="mps-icon success" size={64} />;
    return <XCircle className="mps-icon error" size={64} />;
  }, [phase]);

  const title =
    phase === "confirming"
      ? "Đang xác nhận thanh toán"
      : phase === "success"
      ? "Thanh toán thành công"
      : phase === "cancelled"
      ? "Thanh toán chưa hoàn tất"
      : "Xác nhận thanh toán thất bại";

  return (
    <div className="mps-wrap">
      <div className={`mps-card ${phase}`}>
        <div className="mps-icon-wrap">{icon}</div>
        <div className="mps-badge">PayOS</div>
        <h1 className="mps-title">{title}</h1>
        <p className="mps-message">{message}</p>

        {orderCode ? <div className="mps-order">Mã giao dịch: <strong>{orderCode}</strong></div> : null}

        {phase !== "confirming" ? (
          <div className="mps-countdown">
            <Clock3 size={16} />
            <span>Tự động quay về trang chủ sau {countdown}s</span>
          </div>
        ) : null}

        <div className="mps-actions">
          <button type="button" className="mps-btn primary" onClick={() => navigate("/", { replace: true })}>
            <Home size={16} />
            <span>Về landing page</span>
          </button>
          <button type="button" className="mps-btn" onClick={() => navigate("/member/my-packages", { replace: true })}>
            Xem gói tập của tôi
          </button>
        </div>
      </div>
    </div>
  );
}