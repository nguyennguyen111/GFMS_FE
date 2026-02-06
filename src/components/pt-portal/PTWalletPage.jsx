import React, { useEffect, useState } from "react";
import {
  getMyPTWithdrawals,
  getMyPTWalletSummary,
  requestPTWithdrawal,
} from "../../services/ptService";
import { connectSocket } from "../../services/socketClient";
import "./PTPortalPages.css";
import "./PTWalletPage.css";

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("vi-VN");
};

const statusLabel = {
  pending: "Chờ duyệt",
  completed: "Đã chi trả",
  rejected: "Từ chối",
};

const PTWalletPage = () => {
  const [summary, setSummary] = useState({ availableBalance: 0, totalWithdrawn: 0 });
  const [withdrawals, setWithdrawals] = useState([]);
  const [filters, setFilters] = useState({ status: "" });
  const [notice, setNotice] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    notes: "",
  });

  const loadSummary = async () => {
    try {
      const res = await getMyPTWalletSummary();
      setSummary(res.data || { availableBalance: 0, totalWithdrawn: 0 });
    } catch (e) {
      console.error("Lỗi khi tải ví PT:", e);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const res = await getMyPTWithdrawals();
      let list = Array.isArray(res.data) ? res.data : [];
      if (filters.status) {
        list = list.filter((w) => w.status === filters.status);
      }
      setWithdrawals(list);
    } catch (e) {
      console.error("Lỗi khi tải lịch sử rút tiền:", e);
      setWithdrawals([]);
    }
  };

  useEffect(() => {
    loadSummary();
    loadWithdrawals();
    const socket = connectSocket();
    const handleUpdate = () => {
      setNotice("Có cập nhật mới về yêu cầu rút tiền.");
      loadSummary();
      loadWithdrawals();
    };
    socket.on("withdrawal:created", handleUpdate);
    socket.on("withdrawal:approved", handleUpdate);
    socket.on("withdrawal:rejected", handleUpdate);
    return () => {
      socket.off("withdrawal:created", handleUpdate);
      socket.off("withdrawal:approved", handleUpdate);
      socket.off("withdrawal:rejected", handleUpdate);
    };
  }, []);

  const handleSubmit = async () => {
    const amount = Number(form.amount || 0);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (!form.bankName || !form.accountNumber || !form.accountHolder) {
      alert("Vui lòng nhập đủ thông tin ngân hàng");
      return;
    }
    try {
      await requestPTWithdrawal({
        amount,
        withdrawalMethod: "bank_transfer",
        accountInfo: {
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          accountHolder: form.accountHolder,
        },
        notes: form.notes,
      });
      setForm({ amount: "", bankName: "", accountNumber: "", accountHolder: "", notes: "" });
      setShowModal(false);
      loadWithdrawals();
    } catch (e) {
      console.error("Lỗi khi gửi yêu cầu:", e);
      alert(e.response?.data?.message || "Không thể gửi yêu cầu");
    }
  };

  const parseAccount = (value) => {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  };

  return (
    <div className="ptp-wrap ptw-wrap">
      <div className="ptw-head">
        <h2 className="ptp-title">Ví của tôi</h2>
        <div className="ptw-actions">
          <button className="ptp-btn" onClick={() => { setNotice(""); loadSummary(); loadWithdrawals(); }}>
            Làm mới
          </button>
          <button className="ptp-btn ptw-primary" onClick={() => setShowModal(true)}>
            Gửi yêu cầu rút tiền
          </button>
        </div>
      </div>

      <div className="ptw-cards">
        <div className="ptw-card">
          <div className="ptw-label">Số dư khả dụng</div>
          <div className="ptw-value">{formatMoney(summary.availableBalance)}</div>
        </div>
        <div className="ptw-card">
          <div className="ptw-label">Tổng đã rút</div>
          <div className="ptw-value">{formatMoney(summary.totalWithdrawn)}</div>
        </div>
      </div>

      {notice && (
        <div className="ptw-notice" onClick={() => setNotice("")}>
          {notice}
        </div>
      )}

      <div className="ptw-history-head">
        <div className="ptw-section-title">Lịch sử yêu cầu rút tiền</div>
        <select
          className="ptp-select"
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="completed">Đã chi trả</option>
          <option value="rejected">Từ chối</option>
        </select>
      </div>

      <div className="ptw-table">
        <table>
          <thead>
            <tr>
              <th>Ngày yêu cầu</th>
              <th>Số tiền</th>
              <th>Tài khoản</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length > 0 ? (
              withdrawals.map((w) => {
                const acc = parseAccount(w.accountInfo);
                return (
                  <tr key={w.id}>
                    <td>{formatDateTime(w.createdAt)}</td>
                    <td className="ptw-money">{formatMoney(w.amount)}</td>
                    <td>
                      {`${acc.bankName || ""} ${acc.accountNumber || ""} ${acc.accountHolder || ""}`.trim()}
                    </td>
                    <td>
                      <span className={`ptw-badge ptw-badge-${w.status || "pending"}`}>
                        {statusLabel[w.status] || w.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="ptw-empty">Chưa có yêu cầu nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="ptw-modal" onClick={() => setShowModal(false)}>
          <div className="ptw-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ptw-modal-header">
              <h3>Gửi yêu cầu rút tiền</h3>
              <button onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="ptw-modal-body">
              <div className="ptp-row">
                <label>Số tiền muốn rút</label>
                <input
                  className="ptp-input"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="VD: 500000"
                />
              </div>
              <div className="ptp-row">
                <label>Tên ngân hàng</label>
                <input
                  className="ptp-input"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                />
              </div>
              <div className="ptp-row">
                <label>Số tài khoản</label>
                <input
                  className="ptp-input"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                />
              </div>
              <div className="ptp-row">
                <label>Tên chủ tài khoản</label>
                <input
                  className="ptp-input"
                  value={form.accountHolder}
                  onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
                />
              </div>
              <div className="ptp-row">
                <label>Ghi chú (tùy chọn)</label>
                <input
                  className="ptp-input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="ptw-modal-actions">
              <button className="ptp-btn" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="ptp-btn ptw-primary" onClick={handleSubmit}>Gửi yêu cầu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PTWalletPage;
