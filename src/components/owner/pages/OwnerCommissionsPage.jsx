import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ownerGetCommissions,
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
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import "./OwnerCommissionsPage.css";
import useSelectedGym from "../../../hooks/useSelectedGym";

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

const formatTimeRange = (startTime, endTime) => {
  const start = String(startTime || "").slice(0, 5);
  const end = String(endTime || "").slice(0, 5);
  if (!start && !end) return "N/A";
  if (start && end) return `${start} - ${end}`;
  return start || end;
};

const OwnerCommissionsPage = () => {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionPagination, setCommissionPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
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
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  const [dialog, setDialog] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  useEffect(() => {
    const scopedGymId = selectedGymId ? String(selectedGymId) : "";
    setFilters((prev) => ({ ...prev, gymId: scopedGymId }));
    setPeriodForm((prev) => ({ ...prev, gymId: scopedGymId }));
    setPayByTrainerForm((prev) => ({ ...prev, gymId: scopedGymId, trainerId: selectedGymId ? "" : prev.trainerId }));
    setRateForm((prev) => ({ ...prev, gymId: scopedGymId }));
  }, [selectedGymId]);

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

  const loadCommissions = useCallback(async (page = commissionPage) => {
    try {
      setLoading(true);
      const activeFilters = {
        ...filters,
        gymId: selectedGymId ? String(selectedGymId) : filters.gymId || undefined,
      };
      const response = await ownerGetCommissions({
        ...activeFilters,
        page,
        limit: 20,
      });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const pagination = response.data?.pagination || {};
      setCommissions(
        selectedGymId
          ? rows.filter((item) => String(item?.gymId || item?.Gym?.id || item?.gym?.id || "") === String(selectedGymId))
          : rows
      );
      setCommissionPagination({
        total: Number(pagination.total || 0),
        page: Number(pagination.page || page || 1),
        limit: Number(pagination.limit || 20),
        totalPages: Number(pagination.totalPages || 0),
      });
      setCommissionPage(Number(pagination.page || page || 1));
    } catch (error) {
      console.error("Lỗi khi tải hoa hồng:", error);
      setCommissions([]);
      setCommissionPagination({ total: 0, page: 1, limit: 20, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [filters, selectedGymId, commissionPage]);

  const filteredPeriods = useMemo(() => {
    if (!selectedGymId) return periods;
    return periods.filter((period) => String(period?.gymId || period?.Gym?.id || "") === String(selectedGymId));
  }, [periods, selectedGymId]);

  const loadPeriods = useCallback(async () => {
    try {
      const response = await ownerGetPayrollPeriods();
      setPeriods(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi tải kỳ lương:", error);
      setPeriods([]);
    }
  }, []);

  const loadRateForGym = useCallback(async (gymId) => {
    if (!gymId) return;
    try {
      const response = await ownerGetGymCommissionRate(gymId);
      const ownerRate = Number(response.data?.data?.ownerRate ?? 0.15);
      setRateForm((prev) => ({
        ...prev,
        gymId: prev.gymId || String(gymId),
        ownerRate: String(Math.round(ownerRate * 100)),
      }));
    } catch (error) {
      console.error("Lỗi khi tải tỷ lệ hoa hồng:", error);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadGyms(), loadTrainers(), loadPeriods()]);
  }, [loadGyms, loadTrainers, loadPeriods]);

  useEffect(() => {
    loadCommissions(commissionPage);
  }, [loadCommissions, commissionPage]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await Promise.all([loadCommissions(commissionPage), loadPeriods()]);
      if (rateForm.gymId) {
        await loadRateForGym(rateForm.gymId);
      }
    },
    events: ["commission:changed", "booking:status-changed"],
  });

  useEffect(() => {
    setCommissionPage(1);
  }, [filters.gymId, filters.status, filters.fromDate, filters.toDate, selectedGymId]);

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
          await ownerPayByTrainer(payByTrainerForm);
          await loadCommissions();
          await loadPeriods();
          setPayByTrainerForm({ gymId: "", trainerId: "", fromDate: "", toDate: "" });
          showAlert("success", "Hoàn tất", "Đã chi trả cho huấn luyện viên.");
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
        username: t.username || `Huấn luyện viên #${t.trainerId}`,
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
      const username = trainer?.User?.username || `Huấn luyện viên #${trainerId}`;
      const email = trainer?.User?.email || "";

      setDialog({
        kind: "confirm",
        tone: "warning",
        title: "Xác nhận chi trả theo huấn luyện viên",
        message: "",
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
      await loadRateForGym(rateForm.gymId);
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

  const handleOpenPeriod = (period) => {
    setSelectedPeriod(period);
    setShowPeriodModal(true);
  };

  const handleClosePeriodModal = () => {
    setShowPeriodModal(false);
    setSelectedPeriod(null);
  };

  const handleOpenCommission = (commission) => {
    setSelectedCommission(commission);
    setShowCommissionModal(true);
  };

  const handleCloseCommissionModal = () => {
    setShowCommissionModal(false);
    setSelectedCommission(null);
  };

  return (
    <div className="owner-commissions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Doanh thu từ huấn luyện viên</h1>
          {selectedGymName ? <div className="page-subtitle">Chi nhánh đang quản lý: {selectedGymName}</div> : null}
        </div>
      </div>

      <div className="commissions-header">
        <div className="section-title">Doanh thu theo buổi từ huấn luyện viên</div>
        <div className="commissions-filters">
          <select
            className="filter-select"
            value={filters.gymId}
            onChange={(e) => setFilters({ ...filters, gymId: e.target.value })}
            disabled={Boolean(selectedGymId)}
          >
            <option value="">{selectedGymId ? (selectedGymName || "Chi nhánh đang quản lý") : "Tất cả gym"}</option>
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
          <div className="date-range-group">
            <label className="date-field">
              <span className="date-label">Từ ngày</span>
              <input
                type="date"
                value={filters.fromDate || ""}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="filter-select date-input"
              />
            </label>
            <label className="date-field">
              <span className="date-label">Đến ngày</span>
              <input
                type="date"
                value={filters.toDate || ""}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="filter-select date-input"
              />
            </label>
          </div>
          <button
            className="search-button"
            onClick={() => {
              setCommissionPage(1);
              loadCommissions(1);
            }}
          >
            Lọc
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
              <th>Doanh thu chủ (buổi)</th>
              <th>Ghi chú</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="empty-cell">Đang tải dữ liệu...</td>
              </tr>
            ) : commissions.length > 0 ? (
              commissions.map((c) => {
                const isOwnerRetention = String(c.payee || "") === "owner";
                return (
                <tr key={c.id} className="commission-row" onClick={() => handleOpenCommission(c)}>
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
                  <td className="tx-amount">
                    {isOwnerRetention ? "—" : formatMoney(c.commissionAmount)}
                  </td>
                  <td className="tx-amount">
                    {isOwnerRetention ? formatMoney(c.sessionValue) : "—"}
                  </td>
                  <td className="tx-note-cell">{c.retentionReason || (isOwnerRetention ? "" : "—")}</td>
                  <td>
                    {isOwnerRetention ? (
                      <span className="tx-badge tx-badge-owner">Doanh thu chủ</span>
                    ) : (
                      <span className={`tx-badge tx-badge-${c.status || "pending"}`}>
                        {statusLabel[c.status] || c.status}
                      </span>
                    )}
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="empty-cell">Không có dữ liệu</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="commissions-pagination">
        <button
          className="pagination-btn"
          disabled={loading || commissionPage <= 1}
          onClick={() => setCommissionPage((p) => Math.max(1, p - 1))}
        >
          Trang trước
        </button>
        <span className="pagination-meta">
          Trang {commissionPagination.page || 1}/{Math.max(1, commissionPagination.totalPages || 1)}
          {" · "}
          Tổng {commissionPagination.total || 0} dòng
        </span>
        <button
          className="pagination-btn"
          disabled={loading || commissionPage >= (commissionPagination.totalPages || 1)}
          onClick={() => setCommissionPage((p) => Math.min(commissionPagination.totalPages || 1, p + 1))}
        >
          Trang sau
        </button>
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
            </tr>
          </thead>
          <tbody>
            {filteredPeriods.length > 0 ? (
              filteredPeriods.map((period) => (
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
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-cell">
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
            disabled={Boolean(selectedGymId)}
          >
            <option value="">Chọn phòng gym</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={periodForm.startDate || ""}
            onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
            className="filter-select date-input"
          />
          <input
            type="date"
            value={periodForm.endDate || ""}
            onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
            className="filter-select date-input"
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
            disabled={Boolean(selectedGymId)}
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
          <input
            type="date"
            value={payByTrainerForm.fromDate || ""}
            onChange={(e) => setPayByTrainerForm({ ...payByTrainerForm, fromDate: e.target.value })}
            className="filter-select date-input"
          />
          <input
            type="date"
            value={payByTrainerForm.toDate || ""}
            onChange={(e) => setPayByTrainerForm({ ...payByTrainerForm, toDate: e.target.value })}
            className="filter-select date-input"
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

      <div className="owner-section-heading">Cài đặt — Tỷ lệ chia sẻ theo gym</div>
      <div className="period-card">
        <div className="period-card-title">Tỷ lệ hoa hồng theo gym</div>
        <div className="period-form">
          <select
            className="filter-select"
            value={rateForm.gymId}
            onChange={(e) => setRateForm({ ...rateForm, gymId: e.target.value })}
            disabled={Boolean(selectedGymId)}
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

      {showCommissionModal && selectedCommission && (
        <div className="tx-modal" onClick={handleCloseCommissionModal}>
          <div className="tx-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="tx-modal-header">
              <h2>Chi tiết buổi tập</h2>
              <button className="tx-modal-close" onClick={handleCloseCommissionModal}>×</button>
            </div>
            <div className="tx-modal-body">
              <div className="period-summary">
                <div><strong>Ngày buổi tập:</strong> {formatDate(selectedCommission.sessionDate || selectedCommission.Booking?.bookingDate)}</div>
                <div><strong>Giờ dạy:</strong> {formatTimeRange(selectedCommission.Booking?.startTime, selectedCommission.Booking?.endTime)}</div>
                <div><strong>Huấn luyện viên:</strong> {selectedCommission.Trainer?.User?.username || "N/A"}</div>
                <div><strong>Hội viên:</strong> {selectedCommission.Booking?.Member?.User?.username || "N/A"}</div>
                <div><strong>Email hội viên:</strong> {selectedCommission.Booking?.Member?.User?.email || "N/A"}</div>
                <div><strong>Phòng gym:</strong> {selectedCommission.Gym?.name || "N/A"}</div>
                <div><strong>Gói tập:</strong> {selectedCommission.PackageActivation?.Package?.name || "N/A"}</div>
                <div><strong>Giá trị buổi:</strong> {formatMoney(selectedCommission.sessionValue)}</div>
              </div>
            </div>
            <div className="tx-modal-footer">
              <button className="pagination-btn" onClick={handleCloseCommissionModal}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerCommissionsPage;
