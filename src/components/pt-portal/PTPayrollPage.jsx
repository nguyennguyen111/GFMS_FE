import React, { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  getMyPTCommissions,
  getMyPTPayrollPeriods,
  getMyPTPayrollPeriodCommissions,
  exportMyPTCommissions,
  requestPTWithdrawal,
  getMyPTWithdrawals,
} from "../../services/ptService";
import { connectSocket } from "../../services/socketClient";
import "./PTPortalPages.css";
import "./PTPayrollPage.css";

const formatMoney = (value) => {
  const num = Number(value || 0);
  return `${num.toLocaleString("vi-VN")}đ`;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("vi-VN");
};

const toDateValue = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateString = (date) => {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const statusLabel = {
  pending: "Chờ chốt kỳ",
  calculated: "Đã chốt",
  paid: "Đã chi trả",
};

const withdrawalStatusLabel = {
  pending: "Chờ duyệt",
  completed: "Đã chi trả",
  rejected: "Từ chối",
};

const PTPayrollPage = () => {
  const [commissions, setCommissions] = useState([]);
  const [periodItems, setPeriodItems] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [notice, setNotice] = useState("");
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    withdrawalMethod: "bank_transfer",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    notes: "",
  });
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodCommissions, setPeriodCommissions] = useState([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [filters, setFilters] = useState({ status: "", fromDate: "", toDate: "" });
  const [loading, setLoading] = useState(false);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const res = await getMyPTCommissions(filters);
      setCommissions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Lỗi khi tải hoa hồng PT:", e);
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollPeriods = async () => {
    try {
      const res = await getMyPTPayrollPeriods();
      setPeriodItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Lỗi khi tải kỳ lương PT:", e);
      setPeriodItems([]);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const res = await getMyPTWithdrawals();
      const list = Array.isArray(res.data) ? res.data : [];
      setWithdrawals(list);
    } catch (e) {
      console.error("Lỗi khi tải yêu cầu chi trả:", e);
      setWithdrawals([]);
    }
  };

  useEffect(() => {
    loadCommissions();
    loadPayrollPeriods();
    loadWithdrawals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = connectSocket();
    const handleUpdate = () => {
      setNotice("Có cập nhật mới về yêu cầu chi trả.");
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

  const summary = useMemo(() => {
    const pending = commissions.filter((c) => c.status === "pending");
    const calculated = commissions.filter((c) => c.status === "calculated");
    const paid = commissions.filter((c) => c.status === "paid");
    const sum = (arr) => arr.reduce((acc, c) => acc + Number(c.commissionAmount || 0), 0);
    return {
      pendingCount: pending.length,
      pendingAmount: sum(pending),
      calculatedCount: calculated.length,
      calculatedAmount: sum(calculated),
      paidCount: paid.length,
      paidAmount: sum(paid),
    };
  }, [commissions]);

  const handleExport = async () => {
    try {
      const res = await exportMyPTCommissions(filters);
      const contentType = res.headers?.["content-type"] || "";
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "pt_commissions.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Lỗi khi xuất file:", e);
      alert("Không thể xuất file");
    }
  };

  const handleRequestWithdrawal = async () => {
    const amount = Number(withdrawForm.amount || 0);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    try {
      await requestPTWithdrawal({
        amount,
        withdrawalMethod: withdrawForm.withdrawalMethod,
        accountInfo: {
          bankName: withdrawForm.bankName,
          accountNumber: withdrawForm.accountNumber,
          accountHolder: withdrawForm.accountHolder,
        },
        notes: withdrawForm.notes,
      });
      alert("Đã gửi yêu cầu chi trả");
      setWithdrawForm({
        amount: "",
        withdrawalMethod: "bank_transfer",
        bankName: "",
        accountNumber: "",
        accountHolder: "",
        notes: "",
      });
      loadWithdrawals();
    } catch (e) {
      console.error("Lỗi khi yêu cầu chi trả:", e);
      alert(e.response?.data?.message || "Không thể gửi yêu cầu");
    }
  };

  const handleOpenPeriod = async (item) => {
    try {
      setSelectedPeriod(item);
      const res = await getMyPTPayrollPeriodCommissions(item.PayrollPeriod?.id);
      setPeriodCommissions(Array.isArray(res.data) ? res.data : []);
      setShowPeriodModal(true);
    } catch (e) {
      console.error("Lỗi khi tải chi tiết kỳ lương:", e);
      setPeriodCommissions([]);
      setShowPeriodModal(true);
    }
  };

  const handleClosePeriod = () => {
    setShowPeriodModal(false);
    setSelectedPeriod(null);
    setPeriodCommissions([]);
  };

  return (
    <div className="ptp-wrap ptpay-wrap">
      <div className="ptp-head">
        <div>
          <h2 className="ptp-title">Bảng lương & hoa hồng</h2>
          <div className="ptp-sub">Theo dõi hoa hồng theo buổi và các kỳ lương đã chốt</div>
        </div>
      </div>

      <div className="ptpay-cards">
        <div className="ptpay-card">
          <div className="ptpay-label">Chờ chốt kỳ</div>
          <div className="ptpay-value">{formatMoney(summary.pendingAmount)}</div>
          <div className="ptpay-meta">{summary.pendingCount} buổi</div>
        </div>
        <div className="ptpay-card">
          <div className="ptpay-label">Đã chốt</div>
          <div className="ptpay-value">{formatMoney(summary.calculatedAmount)}</div>
          <div className="ptpay-meta">{summary.calculatedCount} buổi</div>
        </div>
        <div className="ptpay-card">
          <div className="ptpay-label">Đã chi trả</div>
          <div className="ptpay-value">{formatMoney(summary.paidAmount)}</div>
          <div className="ptpay-meta">{summary.paidCount} buổi</div>
        </div>
      </div>

      <div className="ptp-toolbar">
        <select
          className="ptp-select"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ chốt kỳ</option>
          <option value="calculated">Đã chốt</option>
          <option value="paid">Đã chi trả</option>
        </select>
        <DatePicker
          selected={toDateValue(filters.fromDate)}
          onChange={(date) => setFilters({ ...filters, fromDate: toDateString(date) })}
          dateFormat="dd/MM/yyyy"
          placeholderText="Từ ngày"
          className="ptp-input"
          showPopperArrow={false}
        />
        <DatePicker
          selected={toDateValue(filters.toDate)}
          onChange={(date) => setFilters({ ...filters, toDate: toDateString(date) })}
          dateFormat="dd/MM/yyyy"
          placeholderText="Đến ngày"
          className="ptp-input"
          showPopperArrow={false}
        />
        <button className="ptp-btn" onClick={loadCommissions}>Lọc</button>
        <button className="ptp-btn" onClick={handleExport}>Xuất Excel</button>
      </div>

      <div className="ptpay-section">
        <div className="ptpay-section-title">Yêu cầu chi trả</div>
        {notice && (
          <div className="ptpay-notice" onClick={() => setNotice("")}>
            {notice}
          </div>
        )}
        <div className="ptpay-request">
          <input
            className="ptp-input"
            type="number"
            placeholder="Số tiền muốn rút"
            value={withdrawForm.amount}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
          />
          <select
            className="ptp-select"
            value={withdrawForm.withdrawalMethod}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, withdrawalMethod: e.target.value })}
          >
            <option value="bank_transfer">Chuyển khoản</option>
          </select>
          <input
            className="ptp-input"
            type="text"
            placeholder="Tên ngân hàng"
            value={withdrawForm.bankName}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, bankName: e.target.value })}
          />
          <input
            className="ptp-input"
            type="text"
            placeholder="Số tài khoản"
            value={withdrawForm.accountNumber}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
          />
          <input
            className="ptp-input"
            type="text"
            placeholder="Tên chủ tài khoản"
            value={withdrawForm.accountHolder}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, accountHolder: e.target.value })}
          />
          <input
            className="ptp-input"
            type="text"
            placeholder="Ghi chú (tùy chọn)"
            value={withdrawForm.notes}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, notes: e.target.value })}
          />
          <button className="ptp-btn" onClick={handleRequestWithdrawal}>Gửi yêu cầu</button>
        </div>

        <div className="ptpay-table">
          <table>
            <thead>
              <tr>
                <th>Ngày yêu cầu</th>
                <th>Số tiền</th>
                <th>Phương thức</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length > 0 ? (
                withdrawals.map((w) => {
                  let account = {};
                  try {
                    account = w.accountInfo ? JSON.parse(w.accountInfo) : {};
                  } catch {
                    account = {};
                  }
                  return (
                  <tr key={w.id}>
                    <td>{formatDate(w.createdAt)}</td>
                    <td className="ptpay-money">{formatMoney(w.amount)}</td>
                    <td>
                      {w.withdrawalMethod === "bank_transfer"
                        ? `${account.bankName || ""} ${account.accountNumber || ""} ${account.accountHolder || ""}`.trim()
                        : w.withdrawalMethod || "N/A"}
                    </td>
                    <td>
                      <span className={`ptpay-badge ptpay-badge-${w.status || "pending"}`}>
                        {withdrawalStatusLabel[w.status] || w.status || "pending"}
                      </span>
                    </td>
                  </tr>
                );
                })
              ) : (
                <tr><td colSpan="4" className="ptpay-empty">Chưa có yêu cầu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ptpay-section">
        <div className="ptpay-section-title">Hoa hồng theo buổi</div>
        <div className="ptpay-table">
          <table>
            <thead>
              <tr>
                <th>Ngày buổi tập</th>
                <th>Phòng gym</th>
                <th>Gói tập</th>
                <th>Giá trị/buổi</th>
                <th>Hoa hồng</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="ptpay-empty">Đang tải dữ liệu...</td></tr>
              ) : commissions.length > 0 ? (
                commissions.map((c) => (
                  <tr key={c.id}>
                    <td>{formatDate(c.sessionDate)}</td>
                    <td>{c.Gym?.name || "N/A"}</td>
                    <td>{c.PackageActivation?.Package?.name || "N/A"}</td>
                    <td className="ptpay-money">{formatMoney(c.sessionValue)}</td>
                    <td className="ptpay-money">{formatMoney(c.commissionAmount)}</td>
                    <td>
                      <span className={`ptpay-badge ptpay-badge-${c.status || "pending"}`}>
                        {statusLabel[c.status] || c.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="ptpay-empty">Không có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ptpay-section">
        <div className="ptpay-section-title">Kỳ lương đã chốt</div>
        <div className="ptpay-table">
          <table>
            <thead>
              <tr>
                <th>Kỳ lương</th>
                <th>Phòng gym</th>
                <th>Số buổi</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {periodItems.length > 0 ? (
                periodItems.map((item) => (
                  <tr key={item.id} className="ptpay-row" onClick={() => handleOpenPeriod(item)}>
                    <td>
                      {formatDate(item.PayrollPeriod?.startDate)} - {formatDate(item.PayrollPeriod?.endDate)}
                    </td>
                    <td>{item.PayrollPeriod?.Gym?.name || "N/A"}</td>
                    <td>{item.totalSessions || 0}</td>
                    <td className="ptpay-money">{formatMoney(item.totalAmount)}</td>
                    <td>
                      <span className={`ptpay-badge ptpay-badge-${item.PayrollPeriod?.status || "calculated"}`}>
                        {item.PayrollPeriod?.status === "paid" ? "Đã chi trả" : "Đã chốt"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="ptpay-empty">Chưa có kỳ lương</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPeriodModal && (
        <div className="ptpay-modal" onClick={handleClosePeriod}>
          <div className="ptpay-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ptpay-modal-header">
              <h3>Chi tiết kỳ lương</h3>
              <button onClick={handleClosePeriod}>×</button>
            </div>
            <div className="ptpay-modal-body">
              <div className="ptpay-modal-summary">
                <div><strong>Kỳ:</strong> {formatDate(selectedPeriod?.PayrollPeriod?.startDate)} - {formatDate(selectedPeriod?.PayrollPeriod?.endDate)}</div>
                <div><strong>Gym:</strong> {selectedPeriod?.PayrollPeriod?.Gym?.name || "N/A"}</div>
                <div><strong>Số buổi:</strong> {selectedPeriod?.totalSessions || 0}</div>
                <div><strong>Tổng tiền:</strong> {formatMoney(selectedPeriod?.totalAmount)}</div>
              </div>
              <div className="ptpay-table">
                <table>
                  <thead>
                    <tr>
                      <th>Ngày buổi tập</th>
                      <th>Gói tập</th>
                      <th>Giá trị/buổi</th>
                      <th>Hoa hồng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodCommissions.length > 0 ? (
                      periodCommissions.map((c) => (
                        <tr key={c.id}>
                          <td>{formatDate(c.sessionDate)}</td>
                          <td>{c.PackageActivation?.Package?.name || "N/A"}</td>
                          <td className="ptpay-money">{formatMoney(c.sessionValue)}</td>
                          <td className="ptpay-money">{formatMoney(c.commissionAmount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" className="ptpay-empty">Không có dữ liệu</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PTPayrollPage;
