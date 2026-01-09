import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { memberGetMyPackages } from "../../../services/memberPackageService";

const fmtMoney = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("vi-VN") + " ₫";
};
const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");

export default function MemberMyPackagesPage() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await memberGetMyPackages();
      setData(res.data?.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || "Không tải được gói của bạn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const active = useMemo(() => {
    return data.find((x) => x.status === "active" && (x.sessionsRemaining ?? 0) > 0) || null;
  }, [data]);

  const history = useMemo(() => data.filter((x) => x.id !== active?.id), [data, active]);

  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">🎫 Gói của tôi</h2>
          <div className="op-sub">Xem gói đã mua, số buổi còn lại, thời hạn và lịch sử giao dịch.</div>
        </div>

        <div className="op-toolbar">
          <button className="op-btn op-btn--small" onClick={() => navigate("/member/packages")}>
            + Mua gói
          </button>
          <button className="op-btn op-btn--small" onClick={load} disabled={loading}>
            ↻ Tải lại
          </button>
        </div>
      </div>

      {err && <div className="op-error">{err}</div>}

      {loading ? (
        <div className="op-card padded">
          <div className="op-empty">Đang tải dữ liệu...</div>
        </div>
      ) : (
        <>
          <div className="op-card padded" style={{ marginBottom: 14 }}>
            <div className="mp-head">
              <div>
                <div className="mp-title">Gói đang sử dụng</div>
                <div className="op-sub">Gói active sẽ được dùng để booking PT.</div>
              </div>

              <div className="mp-actions">
                <button className="op-btn op-btn--small" onClick={() => navigate("/member/bookings/new")}>
                  Đặt lịch PT
                </button>
              </div>
            </div>

            {!active ? (
              <div className="op-empty">
                Bạn chưa có gói active. Hãy{" "}
                <button className="op-btn op-btn--small op-btn--primary" onClick={() => navigate("/member/packages")}>
                  mua gói
                </button>{" "}
                để bắt đầu đặt lịch.
              </div>
            ) : (
              <div className="mp-card">
                <div className="mp-card__top">
                  <div>
                    <div className="mp-name">{active.Package?.name || "Gói tập"}</div>
                    <div className="mp-meta">
                      <span className="op-badge is-on">Active</span>
                      <span style={{ opacity: 0.75, marginLeft: 10 }}>
                        Kích hoạt: <b>{fmtDate(active.activationDate)}</b>
                      </span>
                      <span style={{ opacity: 0.75, marginLeft: 12 }}>
                        Hết hạn: <b>{active.expiryDate ? fmtDate(active.expiryDate) : "Không giới hạn"}</b>
                      </span>
                    </div>
                  </div>

                  <div className="mp-price">{fmtMoney(active.Transaction?.amount ?? active.Package?.price)}</div>
                </div>

                <div className="mp-stats">
                  <div className="mp-stat">
                    <div className="mp-k">Tổng buổi</div>
                    <div className="mp-v">{active.totalSessions ?? active.Package?.sessions ?? "—"}</div>
                  </div>
                  <div className="mp-stat">
                    <div className="mp-k">Đã dùng</div>
                    <div className="mp-v">{active.sessionsUsed ?? 0}</div>
                  </div>
                  <div className="mp-stat">
                    <div className="mp-k">Còn lại</div>
                    <div className="mp-v">{active.sessionsRemaining ?? 0}</div>
                  </div>
                  <div className="mp-stat">
                    <div className="mp-k">Giá/buổi</div>
                    <div className="mp-v">{fmtMoney(active.pricePerSession)}</div>
                  </div>
                </div>

                <div className="mp-tx">
                  <div style={{ opacity: 0.75 }}>
                    Giao dịch: <b>{active.Transaction?.transactionCode || "—"}</b>
                  </div>
                  <div style={{ opacity: 0.75 }}>
                    Thanh toán: <b>{active.Transaction?.paymentMethod || "—"}</b> •{" "}
                    <b>{active.Transaction?.paymentStatus || "—"}</b>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="op-card">
            <div style={{ padding: "12px 14px" }}>
              <div className="mp-title">Lịch sử gói đã mua</div>
              <div className="op-sub">Các gói đã hoàn thành/hết hạn hoặc gói cũ.</div>
            </div>

            {data.length === 0 ? (
              <div className="op-empty">Chưa có giao dịch mua gói nào.</div>
            ) : history.length === 0 ? (
              <div className="op-empty">Chưa có lịch sử (chỉ có gói active hiện tại).</div>
            ) : (
              <table className="op-table">
                <thead>
                  <tr>
                    <th>Gói</th>
                    <th>Kích hoạt</th>
                    <th>Hết hạn</th>
                    <th>Buổi</th>
                    <th>Trạng thái</th>
                    <th>Giao dịch</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <div className="op-name">{x.Package?.name || "—"}</div>
                        <div className="op-desc">{x.Transaction?.description || ""}</div>
                      </td>
                      <td>{fmtDate(x.activationDate)}</td>
                      <td>{x.expiryDate ? fmtDate(x.expiryDate) : "Không giới hạn"}</td>
                      <td>
                        {x.sessionsUsed ?? 0}/{x.totalSessions ?? x.Package?.sessions ?? "—"} (còn{" "}
                        <b>{x.sessionsRemaining ?? 0}</b>)
                      </td>
                      <td>
                        <span className={`op-badge ${x.status === "active" ? "is-on" : "is-off"}`}>
                          {x.status || "—"}
                        </span>
                      </td>
                      <td>
                        <div className="op-name">{x.Transaction?.transactionCode || "—"}</div>
                        <div className="op-desc">
                          {fmtMoney(x.Transaction?.amount)} • {fmtDate(x.Transaction?.transactionDate)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <style>{`
            .mp-head{
              display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
              margin-bottom: 10px;
            }
            .mp-title{ font-weight: 1000; font-size: 14px; }
            .mp-card{
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.10);
              border-radius: 18px;
              padding: 14px;
            }
            .mp-card__top{
              display:flex; justify-content:space-between; gap:12px; align-items:flex-start;
              padding-bottom: 12px;
              border-bottom: 1px solid rgba(255,255,255,0.08);
            }
            .mp-name{ font-size: 18px; font-weight: 1000; }
            .mp-meta{ margin-top: 6px; }
            .mp-price{ font-weight: 1000; opacity: 0.95; white-space: nowrap; }
            .mp-stats{
              margin-top: 12px;
              display:grid;
              grid-template-columns: repeat(4, minmax(0,1fr));
              gap: 10px;
            }
            @media (max-width: 900px){ .mp-stats{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
            .mp-stat{
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              padding: 10px;
            }
            .mp-k{ opacity: 0.7; font-size: 12px; }
            .mp-v{ font-weight: 1000; margin-top: 4px; }
            .mp-tx{
              margin-top: 12px;
              display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;
              padding-top: 10px;
              border-top: 1px solid rgba(255,255,255,0.08);
            }
          `}</style>
        </>
      )}
    </div>
  );
}
