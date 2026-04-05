import React, { useCallback, useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  ownerGetCommissions,
  ownerExportCommissions,
  ownerPreviewClosePayrollPeriod,
  ownerPreviewPayByTrainer,
  ownerClosePayrollPeriod,
  ownerGetPayrollPeriods,
  ownerPayPayrollPeriod,
  ownerPayByTrainer,
  ownerGetGymCommissionRate,
  ownerSetGymCommissionRate,
} from "../../../services/ownerCommissionService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import ownerTrainerService from "../../../services/ownerTrainerService";
import OwnerConfirmDialog from "../OwnerConfirmDialog";
import "./OwnerCommissionsPage.css";

const statusLabel = {
  pending: "Chờ chốt kỳ",
  calculated: "Đã trả",
  paid: "Đã chi trả",
};

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

const OwnerCommissionsPage = () => {
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    gymId: "",
    status: "",
    fromDate: "",
    toDate: "",
  });

  const [periodForm, setPeriodForm] = useState({
    gymId: "",
    startDate: "",
    endDate: "",
    notes: "",
  });

  const [payByTrainerForm, setPayByTrainerForm] = useState({
    gymId: "",
    trainerId: "",
    fromDate: "",
    toDate: "",
  });

  const [rateForm, setRateForm] = useState({
    gymId: "",
    ownerRate: "",
  });

  const [previewClose, setPreviewClose] = useState({ totalSessions: 0, totalAmount: 0 });
  const [previewPay, setPreviewPay] = useState({ totalSessions: 0, totalAmount: 0 });

  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const [dialog, setDialog] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const closeDialog = () => {
    if (!dialogBusy) setDialog(null);
  };

  const showAlert = (tone, title, message) => {
    setDialog({ kind: "alert", tone, title, message });
  };

  const loadGyms = useCallback(async () => {
    try {
      const response = await ownerGetMyGyms();
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      setGyms(list);
    } catch (error) {
      console.error("Lỗi khi tải phòng gym:", error);
      setGyms([]);
    }
  }, []);

  const loadTrainers = useCallback(async () => {
    try {
      const response = await ownerTrainerService.getMyTrainers({ page: 1, limit: 1000 });
      setTrainers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Lỗi khi tải huấn luyện viên:", error);
      setTrainers([]);
    }
  }, []);

  const loadCommissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ownerGetCommissions(filters);
      setCommissions(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi tải hoa hồng:", error);
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadPeriods = useCallback(async () => {
    try {
      const response = await ownerGetPayrollPeriods();
      setPeriods(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi tải kỳ lương:", error);
      setPeriods([]);
    }
  }, []);

  useEffect(() => {
    loadGyms();
    loadTrainers();
    loadCommissions();
    loadPeriods();
  }, [loadGyms, loadTrainers, loadCommissions, loadPeriods]);

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      if (!periodForm.gymId || !periodForm.startDate || !periodForm.endDate) {
        if (isMounted) setPreviewClose({ totalSessions: 0, totalAmount: 0 });
        return;
      }
      try {
        const res = await ownerPreviewClosePayrollPeriod({
          gymId: periodForm.gymId,
          startDate: periodForm.startDate,
          endDate: periodForm.endDate,
        });
        if (isMounted) {
          setPreviewClose({
            totalSessions: Number(res.data?.data?.totalSessions || 0),
            totalAmount: Number(res.data?.data?.totalAmount || 0),
          });
        }
      } catch (e) {
        if (isMounted) setPreviewClose({ totalSessions: 0, totalAmount: 0 });
      }
    };
    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [periodForm.gymId, periodForm.startDate, periodForm.endDate]);

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      if (!payByTrainerForm.gymId || !payByTrainerForm.trainerId || !payByTrainerForm.fromDate || !payByTrainerForm.toDate) {
        if (isMounted) setPreviewPay({ totalSessions: 0, totalAmount: 0 });
        return;
      }
      try {
        const res = await ownerPreviewPayByTrainer({
          gymId: payByTrainerForm.gymId,
          trainerId: payByTrainerForm.trainerId,
          fromDate: payByTrainerForm.fromDate,
          toDate: payByTrainerForm.toDate,
        });
        if (isMounted) {
          setPreviewPay({
            totalSessions: Number(res.data?.data?.totalSessions || 0),
            totalAmount: Number(res.data?.data?.totalAmount || 0),
          });
        }
      } catch (e) {
        if (isMounted) setPreviewPay({ totalSessions: 0, totalAmount: 0 });
      }
    };
    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [payByTrainerForm.gymId, payByTrainerForm.trainerId, payByTrainerForm.fromDate, payByTrainerForm.toDate]);

  const handleDialogConfirm = async () => {
    if (!dialog || dialog.kind !== "confirm") return;
    setDialogBusy(true);
    try {
      switch (dialog.action) {
        case "closePeriod": {
          await ownerClosePayrollPeriod(periodForm);
          setPeriodForm({ gymId: "", startDate: "", endDate: "", notes: "" });
          await loadCommissions();
          await loadPeriods();
          showAlert("success", "Hoàn tất", "Đã chốt kỳ lương thành công.");
          break;
        }
        case "payPeriod": {
          await ownerPayPayrollPeriod(dialog.periodId);
          await loadCommissions();
          await loadPeriods();
          showAlert("success", "Hoàn tất", "Chi trả kỳ lương thành công.");
          break;
        }
        case "payTrainer": {
          const result = await ownerPayByTrainer(payByTrainerForm);
          await loadCommissions();
          await loadPeriods();
          setPayByTrainerForm({ gymId: "", trainerId: "", fromDate: "", toDate: "" });
          showAlert(
            "success",
            "Hoàn tất",
            `Đã chi trả ${formatMoney(result.data?.totalAmount || 0)} cho huấn luyện viên.`
          );
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error(error);
      showAlert(
        "error",
        "Không thực hiện được",
        error.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại."
      );
    } finally {
      setDialogBusy(false);
    }
  };

  const handleClosePeriod = async () => {
    if (!periodForm.gymId || !periodForm.startDate || !periodForm.endDate) {
      showAlert("warning", "Thiếu thông tin", "Vui lòng chọn phòng tập và thời gian kỳ lương.");
      return;
    }
    try {
      const preview = await ownerPreviewClosePayrollPeriod({
        gymId: periodForm.gymId,
        startDate: periodForm.startDate,
        endDate: periodForm.endDate,
      });
      const prev = preview.data?.data || {};
      const totalAmount = Number(prev.totalAmount || 0);
      const totalSessions = Number(prev.totalSessions || 0);

      if (totalSessions <= 0) {
        showAlert("warning", "Không có dữ liệu", "Không có buổi nào để chốt trong khoảng này.");
        return;
      }

      const trainerBreakdown = (prev.trainers || []).map((t) => ({
        trainerId: t.trainerId,
        username: t.username || `PT #${t.trainerId}`,
        email: t.email || "",
        sessions: t.sessions,
        amountLabel: formatMoney(t.amount),
      }));

      setDialog({
        kind: "confirm",
        tone: "warning",
        title: "Xác nhận chốt kỳ lương",
        message:
          "Các buổi ở trạng thái «Chờ chốt kỳ» trong khoảng thời gian đã chọn sẽ được gom vào một kỳ lương. Bạn có chắc muốn tiếp tục?",
        meta: {
          gymName: prev.gymName || "",
          periodLabel: `${formatDate(periodForm.startDate)} — ${formatDate(periodForm.endDate)}`,
        },
        trainerBreakdown,
        stats: [
          { label: "Số buổi", value: String(totalSessions) },
          { label: "Tổng tiền", value: formatMoney(totalAmount) },
        ],
        action: "closePeriod",
      });
    } catch (error) {
      console.error("Lỗi khi chốt kỳ lương:", error);
      showAlert(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể chốt kỳ lương."
      );
    }
  };

  const handlePayPeriod = (periodId) => {
    setDialog({
      kind: "confirm",
      tone: "neutral",
      title: "Chi trả kỳ lương",
      message:
        "Xác nhận đánh dấu kỳ này đã chi trả? Hoa hồng liên quan chuyển sang «Đã chi trả» và (nếu áp dụng) cập nhật sổ sách theo quy tắc hệ thống.",
      stats: [],
      action: "payPeriod",
      periodId,
    });
  };

  const handlePayByTrainer = async () => {
    const { gymId, trainerId, fromDate, toDate } = payByTrainerForm;
    if (!gymId || !trainerId || !fromDate || !toDate) {
      showAlert("warning", "Thiếu thông tin", "Vui lòng chọn phòng tập, huấn luyện viên và khoảng thời gian.");
      return;
    }
    try {
      const preview = await ownerPreviewPayByTrainer({
        gymId,
        trainerId,
        fromDate,
        toDate,
      });
      const totalAmount = Number(preview.data?.data?.totalAmount || 0);
      const totalSessions = Number(preview.data?.data?.totalSessions || 0);

      if (totalSessions <= 0) {
        showAlert("warning", "Không có dữ liệu", "Không có buổi nào để chi trả trong khoảng này.");
        return;
      }

      const trainer = trainers.find((t) => Number(t.id) === Number(trainerId));
      const gym = gyms.find((g) => Number(g.id) === Number(gymId));
      const username = trainer?.User?.username || `PT #${trainerId}`;
      const email = trainer?.User?.email || "";

      setDialog({
        kind: "confirm",
        tone: "warning",
        title: "Xác nhận chi trả theo huấn luyện viên",
        message:
          "Các buổi «Chờ chốt kỳ» trong khoảng ngày đã chọn sẽ chuyển sang «Đã chi trả» và được ghi nhận vào số dư khả dụng của huấn luyện viên. Vui lòng kiểm tra đúng người nhận trước khi xác nhận.",
        meta: {
          gymName: gym?.name || "",
          periodLabel: `${formatDate(fromDate)} — ${formatDate(toDate)}`,
          periodCaption: "Khoảng ngày áp dụng",
        },
        trainerListTitle: "Huấn luyện viên nhận chi trả",
        trainerBreakdown: [
          {
            trainerId: Number(trainerId),
            username,
            idLabel: `Mã huấn luyện viên: #${trainerId}`,
            email,
            sessions: totalSessions,
            amountLabel: formatMoney(totalAmount),
          },
        ],
        stats: [
          { label: "Số buổi", value: String(totalSessions) },
          { label: "Tổng tiền", value: formatMoney(totalAmount) },
        ],
        action: "payTrainer",
      });
    } catch (error) {
      console.error("Lỗi khi chi trả theo huấn luyện viên:", error);
      showAlert(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể chi trả theo huấn luyện viên."
      );
    }
  };

  const handleLoadRate = async () => {
    if (!rateForm.gymId) {
      showAlert("warning", "Thiếu thông tin", "Vui lòng chọn phòng tập.");
      return;
    }
    try {
      const response = await ownerGetGymCommissionRate(rateForm.gymId);
      const ownerRate = Number(response.data?.data?.ownerRate ?? 0.15);
      setRateForm({ ...rateForm, ownerRate: String(Math.round(ownerRate * 100)) });
    } catch (error) {
      console.error("Lỗi khi tải tỷ lệ hoa hồng:", error);
      showAlert(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể tải tỷ lệ hoa hồng."
      );
    }
  };

  const handleSaveRate = async () => {
    if (!rateForm.gymId || rateForm.ownerRate === "") {
      showAlert("warning", "Thiếu thông tin", "Vui lòng chọn phòng tập và nhập % hoa hồng owner.");
      return;
    }
    const ownerRate = Number(rateForm.ownerRate) / 100;
    if (Number.isNaN(ownerRate) || ownerRate < 0 || ownerRate > 1) {
      showAlert("warning", "Giá trị không hợp lệ", "Tỷ lệ hoa hồng phải từ 0 đến 100%.");
      return;
    }
    try {
      await ownerSetGymCommissionRate({ gymId: Number(rateForm.gymId), ownerRate });
      showAlert("success", "Đã lưu", "Đã cập nhật tỷ lệ hoa hồng theo phòng tập.");
    } catch (error) {
      console.error("Lỗi khi cập nhật tỷ lệ hoa hồng:", error);
      showAlert(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật tỷ lệ."
      );
    }
  };

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format) => {
    try {
      const response = await ownerExportCommissions({ ...filters, format });
      const contentType = response.headers?.["content-type"] || "";
      const extension = format === "pdf" ? "pdf" : "xlsx";
      const filename = `commissions.${extension}`;
      downloadFile(new Blob([response.data], { type: contentType }), filename);
    } catch (error) {
      console.error("Lỗi khi xuất file:", error);
      let message = "Không thể xuất file";
      const response = error.response;
      if (response?.data instanceof Blob) {
        try {
          const text = await response.data.text();
          const parsed = JSON.parse(text);
          message = parsed?.message || parsed?.EM || message;
        } catch {
          message = "Không thể xuất file";
        }
      } else {
        message = response?.data?.message || response?.data?.EM || message;
      }
      showAlert("error", "Không xuất được file", message);
    }
  };

  const handleOpenPeriod = (period) => {
    setSelectedPeriod(period);
    setShowPeriodModal(true);
  };

  const handleClosePeriodModal = () => {
    setShowPeriodModal(false);
    setSelectedPeriod(null);
  };

  return (
    <div className="owner-commissions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chi trả lương huấn luyện viên</h1>
        </div>
      </div>

      <div className="commissions-header">
        <div className="section-title">Hoa hồng theo buổi hoàn thành</div>
        <div className="commissions-filters">
          <select
            className="filter-select"
            value={filters.gymId}
            onChange={(e) => setFilters({ ...filters, gymId: e.target.value })}
          >
            <option value="">Tất cả gym</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ chốt kỳ</option>
            <option value="calculated">Đã trả</option>
            <option value="paid">Đã chi trả</option>
          </select>
          <DatePicker
            selected={toDateValue(filters.fromDate)}
            onChange={(date) => setFilters({ ...filters, fromDate: toDateString(date) })}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            className="filter-select date-input"
            showPopperArrow={false}
          />
          <DatePicker
            selected={toDateValue(filters.toDate)}
            onChange={(date) => setFilters({ ...filters, toDate: toDateString(date) })}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            className="filter-select date-input"
            showPopperArrow={false}
          />
          <button className="search-button" onClick={loadCommissions}>
            Lọc
          </button>
          <button className="search-button" onClick={() => handleExport("xlsx")}>
            Xuất Excel
          </button>
        </div>
      </div>

      <div className="commissions-table-wrapper">
        <table className="commissions-table">
          <thead>
            <tr>
              <th>Ngày buổi tập</th>
              <th>Huấn luyện viên</th>
              <th>Phòng gym</th>
              <th>Gói tập</th>
              <th>Giá trị/buổi</th>
              <th>Hoa hồng Huấn luyện viên</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="empty-cell">Đang tải dữ liệu...</td>
              </tr>
            ) : commissions.length > 0 ? (
              commissions.map((c) => (
                <tr key={c.id}>
                  <td>{formatDate(c.sessionDate)}</td>
                  <td>
                    <div className="tx-user">
                      <div className="tx-user-name">{c.Trainer?.User?.username || "N/A"}</div>
                      <div className="tx-user-email">{c.Trainer?.User?.email || "N/A"}</div>
                    </div>
                  </td>
                  <td>{c.Gym?.name || "N/A"}</td>
                  <td>{c.PackageActivation?.Package?.name || "N/A"}</td>
                  <td className="tx-amount">{formatMoney(c.sessionValue)}</td>
                  <td className="tx-amount">{formatMoney(c.commissionAmount)}</td>
                  <td>
                    <span className={`tx-badge tx-badge-${c.status || "pending"}`}>
                      {statusLabel[c.status] || c.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-cell">Không có dữ liệu</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="owner-section-heading">Kỳ lương đã chốt</div>
      <div className="periods-table-wrapper">
        <table className="periods-table">
          <thead>
            <tr>
              <th>Kỳ lương</th>
              <th>Phòng gym</th>
              <th>Tổng buổi</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {periods.length > 0 ? (
              periods.map((period) => (
                <tr key={period.id} className="period-row">
                  <td onClick={() => handleOpenPeriod(period)}>
                    {formatDate(period.startDate)} - {formatDate(period.endDate)}
                  </td>
                  <td onClick={() => handleOpenPeriod(period)}>{period.Gym?.name || "N/A"}</td>
                  <td onClick={() => handleOpenPeriod(period)}>{period.totalSessions || 0}</td>
                  <td onClick={() => handleOpenPeriod(period)}>{formatMoney(period.totalAmount)}</td>
                  <td onClick={() => handleOpenPeriod(period)}>
                    <span className={`tx-badge tx-badge-${period.status === "paid" ? "paid" : "calculated"}`}>
                      {period.status === "paid" ? "Đã chi trả" : "Đã trả"}
                    </span>
                  </td>
                  <td>
                    {period.status !== "paid" ? (
                      <button className="btn-pay" onClick={() => handlePayPeriod(period.id)}>
                        Chi trả
                      </button>
                    ) : (
                      <span className="paid-text">Đã chi trả</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-cell">
                  Chưa có kỳ lương nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="owner-section-heading">Thao tác chốt kỳ & chi trả tiền cho Huấn luyện viên</div>
      <div className="owner-pay-tools">
      <div className="period-card">
        <div className="period-card-title">Chốt bảng lương kỳ</div>
        <div className="period-form">
          <select
            className="filter-select"
            value={periodForm.gymId}
            onChange={(e) => setPeriodForm({ ...periodForm, gymId: e.target.value })}
          >
            <option value="">Chọn phòng gym</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
          <DatePicker
            selected={toDateValue(periodForm.startDate)}
            onChange={(date) => setPeriodForm({ ...periodForm, startDate: toDateString(date) })}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            className="filter-select date-input"
            showPopperArrow={false}
          />
          <DatePicker
            selected={toDateValue(periodForm.endDate)}
            onChange={(date) => setPeriodForm({ ...periodForm, endDate: toDateString(date) })}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            className="filter-select date-input"
            showPopperArrow={false}
          />
          <input
            type="text"
            className="filter-select"
            placeholder="Ghi chú (tùy chọn)"
            value={periodForm.notes}
            onChange={(e) => setPeriodForm({ ...periodForm, notes: e.target.value })}
          />
          <button className="search-button" onClick={handleClosePeriod}>
            Chốt kỳ lương
          </button>
        </div>
        <div className="period-preview">
          <div className="period-preview-item">
            <span className="period-preview-label">Số buổi</span>
            <span className="period-preview-value">{previewClose.totalSessions || 0}</span>
          </div>
          <div className="period-preview-item">
            <span className="period-preview-label">Tổng tiền</span>
            <span className="period-preview-value">{formatMoney(previewClose.totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="period-card">
        <div className="period-card-title">Chi trả theo từng Huấn luyện viên</div>
        <div className="period-form">
          <select
            className="filter-select"
            value={payByTrainerForm.gymId}
            onChange={(e) => setPayByTrainerForm({ ...payByTrainerForm, gymId: e.target.value })}
          >
            <option value="">Chọn phòng gym</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={payByTrainerForm.trainerId}
            onChange={(e) => setPayByTrainerForm({ ...payByTrainerForm, trainerId: e.target.value })}
          >
            <option value="">Chọn Huấn luyện viên</option>
            {trainers
              .filter((t) => !payByTrainerForm.gymId || Number(t.gymId) === Number(payByTrainerForm.gymId))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.User?.username || `Huấn luyện viên #${t.id}`}
                </option>
              ))}
          </select>
          <DatePicker
            selected={toDateValue(payByTrainerForm.fromDate)}
            onChange={(date) => setPayByTrainerForm({ ...payByTrainerForm, fromDate: toDateString(date) })}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            className="filter-select date-input"
            showPopperArrow={false}
          />
          <DatePicker
            selected={toDateValue(payByTrainerForm.toDate)}
            onChange={(date) => setPayByTrainerForm({ ...payByTrainerForm, toDate: toDateString(date) })}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            className="filter-select date-input"
            showPopperArrow={false}
          />
          <button className="search-button" onClick={handlePayByTrainer}>
            Chi trả Huấn luyện viên
          </button>
        </div>
        <div className="period-preview">
          <div className="period-preview-item">
            <span className="period-preview-label">Số buổi</span>
            <span className="period-preview-value">{previewPay.totalSessions || 0}</span>
          </div>
          <div className="period-preview-item">
            <span className="period-preview-label">Tổng tiền</span>
            <span className="period-preview-value">{formatMoney(previewPay.totalAmount)}</span>
          </div>
        </div>
      </div>
      </div>

      <div className="owner-section-heading">Cài đặt — Tỷ lệ hoa hồng theo gym</div>
      <div className="period-card">
        <div className="period-card-title">Tỷ lệ hoa hồng theo gym</div>
        <div className="period-form">
          <select
            className="filter-select"
            value={rateForm.gymId}
            onChange={(e) => setRateForm({ ...rateForm, gymId: e.target.value })}
          >
            <option value="">Chọn phòng gym</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
          <div className="owner-rate-field" title="Phần trăm thuộc về chủ phòng tập (0–100%)">
            <input
              type="number"
              className="owner-rate-input"
              placeholder="vd: 15"
              aria-label="Tỷ lệ hoa hồng chủ phòng tập, phần trăm"
              value={rateForm.ownerRate}
              onChange={(e) => setRateForm({ ...rateForm, ownerRate: e.target.value })}
              min="0"
              max="100"
            />
            <span className="owner-rate-percent" aria-hidden>
              %
            </span>
          </div>
          <button className="search-button" onClick={handleLoadRate}>
            Tải tỷ lệ
          </button>
          <button className="search-button" onClick={handleSaveRate}>
            Lưu tỷ lệ
          </button>
        </div>
      </div>

      <OwnerConfirmDialog
        open={!!dialog}
        state={dialog}
        busy={dialogBusy}
        onClose={closeDialog}
        onConfirm={handleDialogConfirm}
      />

      {showPeriodModal && selectedPeriod && (
        <div className="tx-modal" onClick={handleClosePeriodModal}>
          <div className="tx-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="tx-modal-header">
              <h2>Chi tiết kỳ lương</h2>
              <button className="tx-modal-close" onClick={handleClosePeriodModal}>×</button>
            </div>
            <div className="tx-modal-body">
              <div className="period-summary">
                <div><strong>Kỳ:</strong> {formatDate(selectedPeriod.startDate)} - {formatDate(selectedPeriod.endDate)}</div>
                <div><strong>Phòng tập:</strong> {selectedPeriod.Gym?.name || "N/A"}</div>
                <div><strong>Tổng buổi:</strong> {selectedPeriod.totalSessions || 0}</div>
                <div><strong>Tổng tiền:</strong> {formatMoney(selectedPeriod.totalAmount)}</div>
              </div>
              <div className="period-items">
                <table>
                  <thead>
                    <tr>
                      <th>Huấn luyện viên</th>
                      <th>Số buổi</th>
                      <th>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPeriod.items || []).length > 0 ? (
                      selectedPeriod.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.Trainer?.User?.username || "N/A"}</td>
                          <td>{item.totalSessions || 0}</td>
                          <td>{formatMoney(item.totalAmount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="empty-cell">Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="tx-modal-footer">
              <button className="pagination-btn" onClick={handleClosePeriodModal}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerCommissionsPage;
