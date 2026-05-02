import React, { useCallback, useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  getMyPTCommissions,
  getMyPTPayrollPeriods,
  getMyPTPayrollPeriodCommissions,
  requestPTWithdrawal,
  getMyPTWalletSummary,
  getMyPTWithdrawals,
} from "../../services/ptService";
import { connectSocket } from "../../services/socketClient";
import NiceModal from "../common/NiceModal";
import "./PTPortalPages.css";
import "./PTPayrollPage.css";

const formatMoney = (value) => {
  const num = Number(value || 0);
  return `${num.toLocaleString("vi-VN")}đ`;
};

const formatMoneyInput = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
};

const toNumberFromMoneyInput = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return Number(digits || 0);
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
};

const parseWithdrawalAccountInfo = (raw) => {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const withdrawalStatusLabel = {
  pending: "Chờ duyệt",
  completed: "Đã chi trả",
  rejected: "Từ chối",
};

const withdrawalMethodLabel = {
  bank_transfer: "Chuyển khoản NH",
};

/** Bỏ tiền tố cũ khi hiển thị (dữ liệu đã lưu trước đây). */
const displayWithdrawalNotes = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s
    .replace(/\[Chủ gym khi duyệt\]\s*/g, "")
    .replace(/\[Ghi chú chủ gym khi duyệt\]\s*/g, "")
    .trim();
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
  calculated: "Đã trả",
  paid: "Đã chi trả",
};

const isOwnerRetainedCommission = (commission) =>
  Number(commission?.commissionAmount || 0) <= 0;

const PTPayrollPage = () => {
  const [commissions, setCommissions] = useState([]);
  const [periodItems, setPeriodItems] = useState([]);
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionPagination, setCommissionPagination] = useState({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });
  const [walletSummary, setWalletSummary] = useState({
    availableBalance: 0,
    totalWithdrawn: 0,
  });
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    withdrawalMethod: "bank_transfer",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    notes: "",
  });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodCommissions, setPeriodCommissions] = useState([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [filters, setFilters] = useState({ status: "", fromDate: "", toDate: "" });
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null);

  const loadCommissions = async (page = commissionPage) => {
    try {
      setLoading(true);
      const res = await getMyPTCommissions({
        ...filters,
        page,
        limit: commissionPagination.limit || 15,
      });
      setCommissions(Array.isArray(res.data) ? res.data : []);
      const pg = res?.pagination || {};
      setCommissionPagination({
        total: Number(pg.total || 0),
        page: Number(pg.page || page || 1),
        limit: Number(pg.limit || commissionPagination.limit || 15),
        totalPages: Math.max(1, Number(pg.totalPages || 1)),
      });
      setCommissionPage(Number(pg.page || page || 1));
    } catch (e) {
      console.error("Lỗi khi tải hoa hồng PT:", e);
      setCommissions([]);
      setCommissionPagination((prev) => ({
        ...prev,
        total: 0,
        page: 1,
        totalPages: 1,
      }));
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

  const loadWalletSummary = async () => {
    try {
      const res = await getMyPTWalletSummary();
      setWalletSummary(res?.data || { availableBalance: 0, totalWithdrawn: 0 });
    } catch (e) {
      console.error("Lỗi khi tải tổng quan ví PT:", e);
      setWalletSummary({ availableBalance: 0, totalWithdrawn: 0 });
    }
  };

  const loadWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true);
      const res = await getMyPTWithdrawals();
      setWithdrawals(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error("Lỗi khi tải lịch sử rút tiền:", e);
      setWithdrawals([]);
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  useEffect(() => {
    loadCommissions(commissionPage);
    loadPayrollPeriods();
    loadWalletSummary();
    loadWithdrawals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commissionPage]);

  useEffect(() => {
    setCommissionPage(1);
  }, [filters.status, filters.fromDate, filters.toDate]);

  useEffect(() => {
    const socket = connectSocket();
    const handleUpdate = () => {
      loadWalletSummary();
      loadCommissions();
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
    const sum = (arr) => arr.reduce((acc, c) => acc + Number(c.commissionAmount || 0), 0);
    return {
      pendingCount: pending.length,
      pendingAmount: sum(pending),
      calculatedCount: calculated.length,
      calculatedAmount: sum(calculated),
    };
  }, [commissions]);

  const availableBalance = Number(walletSummary.availableBalance || 0);

  const fillWithdrawAll = () => {
    if (availableBalance <= 0) return;
    const n = Math.floor(availableBalance);
    setWithdrawForm((f) => ({ ...f, amount: n.toLocaleString("vi-VN") }));
  };

  const openWithdrawModal = () => {
    if (availableBalance <= 0) return;
    setShowWithdrawModal(true);
  };

  const closeWithdrawModal = useCallback(() => {
    if (withdrawSubmitting) return;
    setShowWithdrawModal(false);
    setWithdrawForm({
      amount: "",
      withdrawalMethod: "bank_transfer",
      bankName: "",
      accountNumber: "",
      accountHolder: "",
      notes: "",
    });
  }, [withdrawSubmitting]);

  const handleRequestWithdrawal = async () => {
    const amount = toNumberFromMoneyInput(withdrawForm.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setFeedbackModal({
        title: "Thiếu thông tin",
        message: "Vui lòng nhập số tiền hợp lệ.",
        tone: "info",
      });
      return;
    }
    if (availableBalance <= 0) {
      setFeedbackModal({
        title: "Chưa có số dư",
        message: "Chưa có số dư khả dụng. Chủ gym cần chi trả hoa hồng trước khi bạn có thể rút.",
        tone: "info",
      });
      return;
    }
    if (amount > availableBalance) {
      setFeedbackModal({
        title: "Số tiền không hợp lệ",
        message: `Số tiền rút không được vượt số dư khả dụng (${formatMoney(availableBalance)}).`,
        tone: "danger",
      });
      return;
    }
    const bankName = withdrawForm.bankName?.trim();
    if (!bankName) {
      setFeedbackModal({
        title: "Thiếu thông tin",
        message: "Vui lòng nhập tên ngân hàng.",
        tone: "info",
      });
      return;
    }
    if (!withdrawForm.accountNumber?.trim() || !withdrawForm.accountHolder?.trim()) {
      setFeedbackModal({
        title: "Thiếu thông tin",
        message: "Vui lòng nhập số tài khoản và tên chủ tài khoản.",
        tone: "info",
      });
      return;
    }
    setWithdrawSubmitting(true);
    try {
      await requestPTWithdrawal({
        amount,
        withdrawalMethod: withdrawForm.withdrawalMethod,
        accountInfo: {
          bankName,
          bankFullName: bankName,
          bankCode: "",
          accountNumber: withdrawForm.accountNumber.trim(),
          accountHolder: withdrawForm.accountHolder.trim(),
        },
        notes: withdrawForm.notes || "",
      });
      setFeedbackModal({
        title: "Đã gửi yêu cầu",
        message: "Đã gửi yêu cầu rút tiền.",
        tone: "success",
      });
      setShowWithdrawModal(false);
      setWithdrawForm({
        amount: "",
        withdrawalMethod: "bank_transfer",
        bankName: "",
        accountNumber: "",
        accountHolder: "",
        notes: "",
      });
      loadWalletSummary();
      loadWithdrawals();
    } catch (e) {
      console.error("Lỗi khi yêu cầu rút tiền:", e);
      setFeedbackModal({
        title: "Không gửi được yêu cầu",
        message: e.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại.",
        tone: "danger",
      });
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  useEffect(() => {
    if (!showWithdrawModal) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !withdrawSubmitting) closeWithdrawModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showWithdrawModal, withdrawSubmitting, closeWithdrawModal]);

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
          <h2 className="ptp-title">Doanh thu theo buổi</h2>
        </div>
      </div>

      <div className="ptpay-cards">
        <div className="ptpay-card">
          <div className="ptpay-label">Số dư khả dụng</div>
          <div className="ptpay-value">{formatMoney(walletSummary.availableBalance)}</div>
        </div>
        <div className="ptpay-card">
          <div className="ptpay-label">Tổng đã rút</div>
          <div className="ptpay-value">{formatMoney(walletSummary.totalWithdrawn)}</div>
        </div>
        <div className="ptpay-card">
          <div className="ptpay-label">Chờ chốt kỳ</div>
          <div className="ptpay-value">{formatMoney(summary.pendingAmount)}</div>
        </div>
        <div className="ptpay-card">
          <div className="ptpay-label">Đã chốt kỳ</div>
          <div className="ptpay-value">{formatMoney(summary.calculatedAmount)}</div>
        </div>
      </div>

      <div className="ptpay-section">
        <div className="ptpay-section-title">Rút tiền về ngân hàng</div>
        <div className="ptw-withdraw-card">
          <div className="ptw-withdraw-card-row">
            <div>
              <div className="ptw-withdraw-balance-label">Số dư khả dụng</div>
              <div className="ptw-withdraw-balance-value">{formatMoney(availableBalance)}</div>
            </div>
            <button
              type="button"
              className="ptw-withdraw-open-btn"
              onClick={openWithdrawModal}
              disabled={availableBalance <= 0}
            >
              Gửi yêu cầu rút tiền
            </button>
          </div>
          {availableBalance <= 0 && (
            <p className="ptw-withdraw-disabled-hint">Khi có số dư, bấm nút trên để mở biểu mẫu rút tiền.</p>
          )}
        </div>
      </div>

      <div className="ptpay-section">
        <div className="ptpay-section-title">Lịch sử rút tiền về ngân hàng</div>
        <div className="ptpay-table">
          <table>
            <thead>
              <tr>
                <th>Ngày gửi</th>
                <th>Số tiền</th>
                <th>Phương thức</th>
                <th>Ngân hàng</th>
                <th>Số TK</th>
                <th>Trạng thái</th>
                <th>Ngày xử lý</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {withdrawalsLoading ? (
                <tr>
                  <td colSpan="8" className="ptpay-empty">
                    Đang tải lịch sử...
                  </td>
                </tr>
              ) : withdrawals.length > 0 ? (
                withdrawals.map((w) => {
                  const acc = parseWithdrawalAccountInfo(w.accountInfo);
                  const bank = acc.bankName || acc.bankFullName || "—";
                  const acct = acc.accountNumber || "—";
                  const st = w.status || "pending";
                  const noteShown = displayWithdrawalNotes(w.notes);
                  return (
                    <tr key={w.id}>
                      <td>{formatDateTime(w.createdAt)}</td>
                      <td className="ptpay-money">{formatMoney(w.amount)}</td>
                      <td>{withdrawalMethodLabel[w.withdrawalMethod] || w.withdrawalMethod || "—"}</td>
                      <td>{bank}</td>
                      <td>{acct}</td>
                      <td>
                        <span className={`ptpay-badge ptpay-badge-withdraw-${st}`}>
                          {withdrawalStatusLabel[st] || st}
                        </span>
                      </td>
                      <td>{formatDateTime(w.processedDate)}</td>
                      <td className="ptpay-withdraw-notes">{noteShown || "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="ptpay-empty">
                    Chưa có yêu cầu rút tiền nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showWithdrawModal && (
        <div className="ptw-modal-overlay" role="presentation" onClick={withdrawSubmitting ? undefined : closeWithdrawModal}>
          <div
            className="ptw-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ptw-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="ptw-modal-title" className="ptw-modal-title">
              Gửi yêu cầu rút tiền
            </h2>
            <p className="ptw-modal-balance">
              Số dư khả dụng: <strong>{formatMoney(availableBalance)}</strong>
              <button type="button" className="ptw-modal-fill" onClick={fillWithdrawAll} disabled={withdrawSubmitting}>
                Điền toàn bộ
              </button>
            </p>
            <div className="ptw-modal-fields">
              <label className="ptw-field">
                <span className="ptw-field-label">Ngân hàng</span>
                <input
                  className="ptw-input"
                  type="text"
                  placeholder="VD: Vietcombank"
                  value={withdrawForm.bankName}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, bankName: e.target.value })}
                  disabled={withdrawSubmitting}
                  autoComplete="off"
                />
              </label>
              <label className="ptw-field">
                <span className="ptw-field-label">Số tài khoản</span>
                <input
                  className="ptw-input"
                  type="text"
                  placeholder="0123456789"
                  value={withdrawForm.accountNumber}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
                  disabled={withdrawSubmitting}
                  autoComplete="off"
                />
              </label>
              <label className="ptw-field">
                <span className="ptw-field-label">Tên chủ tài khoản</span>
                <input
                  className="ptw-input"
                  type="text"
                  placeholder="Nguyen Van A"
                  value={withdrawForm.accountHolder}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, accountHolder: e.target.value })}
                  disabled={withdrawSubmitting}
                  autoComplete="name"
                />
              </label>
              <label className="ptw-field">
                <span className="ptw-field-label">Số tiền muốn rút (VND)</span>
                <input
                  className="ptw-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="VD: 200.000"
                  value={withdrawForm.amount}
                  onChange={(e) =>
                    setWithdrawForm({ ...withdrawForm, amount: formatMoneyInput(e.target.value) })
                  }
                  disabled={withdrawSubmitting}
                />
              </label>
            </div>
            <div className="ptw-modal-actions">
              <button
                type="button"
                className="ptw-btn ptw-btn-ghost"
                onClick={closeWithdrawModal}
                disabled={withdrawSubmitting}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="ptw-btn ptw-btn-submit"
                onClick={handleRequestWithdrawal}
                disabled={withdrawSubmitting}
              >
                {withdrawSubmitting ? "Đang gửi…" : "Gửi yêu cầu"}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <button className="ptp-btn" onClick={() => {
          setCommissionPage(1);
          loadCommissions(1);
        }}>Lọc</button>
      </div>

      <div className="ptpay-section">
        <div className="ptpay-section-title">Doanh thu theo buổi</div>
        <div className="ptpay-table">
          <table>
            <thead>
              <tr>
                <th>Ngày buổi tập</th>
                <th>Phòng gym</th>
                <th>Gói tập</th>
                <th>Giá trị/buổi</th>
                <th>Doanh thu</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="ptpay-empty">Đang tải dữ liệu...</td></tr>
              ) : commissions.length > 0 ? (
                commissions.map((c) => {
                  const ownerRetained = isOwnerRetainedCommission(c);
                  return (
                    <tr key={c.id}>
                      <td>{formatDate(c.sessionDate)}</td>
                      <td>{c.Gym?.name || "—"}</td>
                      <td>{c.PackageActivation?.Package?.name || "—"}</td>
                      <td className="ptpay-money">{formatMoney(c.sessionValue)}</td>
                      <td className="ptpay-money">{formatMoney(c.commissionAmount)}</td>
                      <td>
                        <span
                          className={`ptpay-badge ${
                            ownerRetained
                              ? "ptpay-badge-owner-retained"
                              : (c.status || "pending") === "pending"
                                ? "ptpay-badge-pending"
                                : "ptpay-badge-paid"
                          }`}
                        >
                          {ownerRetained ? "Chủ phòng gym thu tiền" : (statusLabel[c.status] || c.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="6" className="ptpay-empty">Không có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="ptpay-pagination">
          <button
            className="ptpay-pagination-btn"
            disabled={loading || commissionPage <= 1}
            onClick={() => setCommissionPage((p) => Math.max(1, p - 1))}
          >
            Trang trước
          </button>
          <span className="ptpay-pagination-meta">
            Trang {commissionPagination.page || 1}/{Math.max(1, commissionPagination.totalPages || 1)}
            {" · "}
            Tổng {commissionPagination.total || 0} dòng
          </span>
          <button
            className="ptpay-pagination-btn"
            disabled={loading || commissionPage >= (commissionPagination.totalPages || 1)}
            onClick={() =>
              setCommissionPage((p) => Math.min(commissionPagination.totalPages || 1, p + 1))
            }
          >
            Trang sau
          </button>
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
                periodItems.map((item) => {
                  const ps = item.PayrollPeriod?.status;
                  const periodPaidOut = ps === "paid" || ps === "closed";
                  const periodStatusLabel =
                    ps === "paid" ? "Đã chi trả" : ps === "closed" ? "Đã trả" : "—";
                  return (
                  <tr key={item.id} className="ptpay-row" onClick={() => handleOpenPeriod(item)}>
                    <td>
                      {formatDate(item.PayrollPeriod?.startDate)} - {formatDate(item.PayrollPeriod?.endDate)}
                    </td>
                    <td>{item.PayrollPeriod?.Gym?.name || "—"}</td>
                    <td>{item.totalSessions || 0}</td>
                    <td className="ptpay-money">{formatMoney(item.totalAmount)}</td>
                    <td>
                      <span
                        className={`ptpay-badge ${
                          periodPaidOut ? "ptpay-badge-paid" : "ptpay-badge-calculated"
                        }`}
                      >
                        {periodStatusLabel}
                      </span>
                    </td>
                  </tr>
                  );
                })
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
                <div><strong>Phòng gym:</strong> {selectedPeriod?.PayrollPeriod?.Gym?.name || "—"}</div>
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
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodCommissions.length > 0 ? (
                      periodCommissions.map((c) => (
                        <tr key={c.id}>
                          <td>{formatDate(c.sessionDate)}</td>
                          <td>{c.PackageActivation?.Package?.name || "—"}</td>
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

      <NiceModal
        open={Boolean(feedbackModal)}
        onClose={() => setFeedbackModal(null)}
        zIndex={1200}
        tone={feedbackModal?.tone || "info"}
        title={feedbackModal?.title || "Thông báo"}
        footer={
          <button type="button" className="nice-modal__btn nice-modal__btn--primary" onClick={() => setFeedbackModal(null)}>
            Đã hiểu
          </button>
        }
      >
        <p>{feedbackModal?.message}</p>
      </NiceModal>
    </div>
  );
};

export default PTPayrollPage;
