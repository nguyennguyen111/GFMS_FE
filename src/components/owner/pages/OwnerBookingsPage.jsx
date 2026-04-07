import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
// Import Services
import ownerTrainerService from "../../../services/ownerTrainerService";
import ownerBookingService from "../../../services/ownerBookingService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { approveRequest, rejectRequest, getRequests } from "../../../services/ownerRequestService";
import { specializationToVietnamese } from "../../../utils/specializationI18n";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

// Import CSS
import "./OwnerBookingsPage.css";
import "./OwnerRequestApprovalPage.css";

const OwnerBookingsPage = () => {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const REQUEST_TYPE_LABELS = {
    LEAVE: "Nghỉ phép",
    SHIFT_CHANGE: "Đổi ca",
    TRANSFER_BRANCH: "Chuyển chi nhánh",
    OVERTIME: "Tăng ca",
    BECOME_TRAINER: "Đăng ký trở thành huấn luyện viên",
    BUSY_SLOT: "Báo bận khung giờ dạy",
  };

  const SPECIALIZATION_OPTIONS = [
    "Yoga",
    "Pilates",
    "HIIT",
    "CrossFit",
    "Thể hình",
    "Tăng sức mạnh",
    "Tập chức năng",
    "Giảm mỡ",
    "Huấn luyện dinh dưỡng",
    "Phục hồi chức năng",
    "Quyền anh",
    "Tập cardio",
    "Chạy bộ",
    "Đạp xe",
  ];

  const parseSpecializationSelections = (input) => {
    if (Array.isArray(input)) return input.filter(Boolean);
    return String(input || "")
      .split(/[\n,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const normalizeSpecializations = (input) => {
    const tokens = parseSpecializationSelections(input);

    if (!tokens.length) return { ok: false, message: "Vui lòng nhập ít nhất 1 chuyên môn" };
    if (tokens.length > 6) return { ok: false, message: "Tối đa 6 chuyên môn" };

    const invalid = tokens.find(
      (token) => token.length < 2 || token.length > 60 || /[^A-Za-z0-9\u00C0-\u1EF9\s+&/()-]/.test(token)
    );
    if (invalid) return { ok: false, message: `Chuyên môn không hợp lệ: ${invalid}` };

    const unique = [...new Map(tokens.map((v) => [v.toLowerCase(), v])).values()];
    return { ok: true, value: specializationToVietnamese(unique.join(", ")) };
  };

  const normalizeCertificateLinks = (input) => {
    const raw = Array.isArray(input)
      ? input
      : String(input || "")
          .split(/[\n,;]+/)
          .map((v) => v.trim())
          .filter(Boolean);

    const unique = [...new Set(raw)];
    if (unique.length > 10) return { ok: false, message: "Tối đa 10 link chứng chỉ" };

    for (const link of unique) {
      try {
        const u = new URL(link);
        if (!["http:", "https:"].includes(u.protocol)) {
          return { ok: false, message: `Link không hợp lệ: ${link}` };
        }
      } catch (_e) {
        return { ok: false, message: `Link không hợp lệ: ${link}` };
      }
    }

    return { ok: true, value: unique };
  };

  const getTrainerGymId = (trainer) => trainer?.gymId || trainer?.Gym?.id || null;

  const getRequestGymIds = (request) => {
    const candidateIds = [
      request?.gymId,
      request?.Gym?.id,
      request?.gym?.id,
      request?.requestApplication?.gymId,
      request?.requestData?.gymId,
      request?.requestData?.application?.gymId,
      request?.requestData?.fromGymId,
      request?.requestData?.toGymId,
      request?.requestData?.targetGymId,
    ];

    return [...new Set(
      candidateIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )];
  };

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "approval" ? "approval" : "management");

  // --- PT Management State (Giữ nguyên từ file 1) ---
  const [trainers, setTrainers] = useState([]);
  const [filters, setFilters] = useState({ q: "", gymId: selectedGymId ? String(selectedGymId) : "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [gyms, setGyms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [trainerDetail, setTrainerDetail] = useState(null);
  const [highlightTrainerId, setHighlightTrainerId] = useState(null);
  const [newTrainer, setNewTrainer] = useState({
    targetUserId: "",
    gymId: selectedGymId ? String(selectedGymId) : "",
    specializationSelections: [],
    certification: "",
    certificationLinksText: "",
    certificateFiles: [],
    hourlyRate: "",
    availableHours: {},
  });

  // --- Approval State (Giữ nguyên từ file 2) ---
  const [requests, setRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [requestPagination, setRequestPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const latestRequestTotalRef = useRef(0);

  useEffect(() => {
    const scopedGymId = selectedGymId ? String(selectedGymId) : "";
    setFilters((prev) => ({ ...prev, gymId: scopedGymId }));
    setNewTrainer((prev) => ({ ...prev, gymId: scopedGymId || prev.gymId }));
  }, [selectedGymId]);

  useEffect(() => {
    if (activeTab !== "management") return;
    loadTrainers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedGymId]);

  const getRequestTypeLabel = (requestType) => {
    const key = String(requestType || "").trim().toUpperCase();
    return REQUEST_TYPE_LABELS[key] || String(requestType || "Không xác định");
  };

  const formatRequestDataValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (Array.isArray(value)) {
      if (value.length === 0) return "N/A";
      return value
        .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
        .join(" | ");
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch (_e) {
        return "[Object]";
      }
    }
    return String(value);
  };

  const getRequestDataEntries = (requestData) => {
    if (!requestData || typeof requestData !== "object") return [];
    return Object.entries(requestData)
      .filter(([key]) => key !== "application")
      .map(([key, value]) => ({ key, value: formatRequestDataValue(value) }));
  };

  const getGymNameById = (gymId) => {
    const id = Number(gymId || 0);
    if (!id) return null;
    const matched = gyms.find((gym) => Number(gym.id) === id);
    return matched?.name || null;
  };

  const toHm = (timeValue) => {
    const s = String(timeValue || "");
    if (!s) return "";
    return s.slice(0, 5);
  };

  // --- Effect & Logic PT Management ---
  useEffect(() => {
    loadGyms();
    loadTrainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!highlightTrainerId) return undefined;
    const timer = setTimeout(() => setHighlightTrainerId(null), 3200);
    return () => clearTimeout(timer);
  }, [highlightTrainerId]);

  const loadGyms = async () => {
    try {
      const response = await ownerGetMyGyms();
      setGyms(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi load gyms:", error);
      setGyms([]);
    }
  };

  const loadTrainers = async (page = 1) => {
    try {
      const activeGymId = selectedGymId ? String(selectedGymId) : filters.gymId || undefined;
      const params = { ...filters, gymId: activeGymId, page, limit: pagination.limit };
      const response = await ownerTrainerService.getMyTrainers(params);
      const nextRows = Array.isArray(response.data) ? response.data : [];
      const filteredRows = activeGymId
        ? nextRows.filter((trainer) => String(getTrainerGymId(trainer) || "") === String(activeGymId))
        : nextRows;
      setTrainers(filteredRows);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0 });
    } catch (error) {
      console.error("Lỗi khi load trainers:", error);
      setTrainers([]);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await ownerTrainerService.getUsersWithoutPTRole();
      setAvailableUsers(response.data || []);
    } catch (error) {
      console.error("Lỗi khi load users:", error);
      setAvailableUsers([]);
    }
  };

  const handleSearch = () => loadTrainers(1);

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    loadAvailableUsers();
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewTrainer({
      targetUserId: "", gymId: selectedGymId ? String(selectedGymId) : "", specializationSelections: [],
      certification: "", certificationLinksText: "", certificateFiles: [], hourlyRate: "", availableHours: {},
    });
  };

  const toggleNewTrainerSpecialization = (option) => {
    setNewTrainer((prev) => {
      const selected = Array.isArray(prev.specializationSelections) ? prev.specializationSelections : [];
      const exists = selected.includes(option);
      return {
        ...prev,
        specializationSelections: exists
          ? selected.filter((item) => item !== option)
          : [...selected, option],
      };
    });
  };

  const toggleSelectedTrainerSpecialization = (option) => {
    setSelectedTrainer((prev) => {
      if (!prev) return prev;
      const selected = Array.isArray(prev.specializationSelections) ? prev.specializationSelections : [];
      const exists = selected.includes(option);
      return {
        ...prev,
        specializationSelections: exists
          ? selected.filter((item) => item !== option)
          : [...selected, option],
      };
    });
  };

  const handleCreateTrainer = async () => {
    try {
      const spec = normalizeSpecializations(newTrainer.specializationSelections);
      if (!spec.ok) {
        alert(spec.message);
        return;
      }

      const certLinks = normalizeCertificateLinks(newTrainer.certificationLinksText);
      if (!certLinks.ok) {
        alert(certLinks.message);
        return;
      }

      const response = await ownerTrainerService.createTrainer({
        targetUserId: newTrainer.targetUserId,
        gymId: newTrainer.gymId,
        specialization: spec.value,
        certification: newTrainer.certification,
        certificationLinks: certLinks.value,
        hourlyRate: newTrainer.hourlyRate,
        availableHours: newTrainer.availableHours,
      });

      const createdTrainerId = response?.data?.id;
      if (createdTrainerId && Array.isArray(newTrainer.certificateFiles) && newTrainer.certificateFiles.length > 0) {
        await ownerTrainerService.uploadTrainerCertificates(createdTrainerId, newTrainer.certificateFiles);
      }

      if (createdTrainerId) {
        setHighlightTrainerId(createdTrainerId);
      }

      alert("Thêm huấn luyện viên thành công!");
      handleCloseCreateModal();
      loadTrainers(1);
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi thêm huấn luyện viên");
    }
  };

  const handleOpenEditModal = (trainer) => {
    const initialSelections = parseSpecializationSelections(
      specializationToVietnamese(trainer?.specialization || "")
    );

    setSelectedTrainer({
      ...trainer,
      specializationSelections: initialSelections,
      certificationLinksText: Array.isArray(trainer?.socialLinks?.certificateLinks)
        ? trainer.socialLinks.certificateLinks.join("\n")
        : "",
      certificateFiles: [],
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedTrainer(null);
  };

  const handleUpdateTrainer = async () => {
    try {
      const spec = normalizeSpecializations(selectedTrainer.specializationSelections);
      if (!spec.ok) {
        alert(spec.message);
        return;
      }

      const certLinks = normalizeCertificateLinks(selectedTrainer.certificationLinksText);
      if (!certLinks.ok) {
        alert(certLinks.message);
        return;
      }

      await ownerTrainerService.updateTrainer(selectedTrainer.id, {
        specialization: spec.value,
        certification: selectedTrainer.certification,
        certificationLinks: certLinks.value,
        hourlyRate: selectedTrainer.hourlyRate,
        availableHours: selectedTrainer.availableHours,
      });

      if (Array.isArray(selectedTrainer.certificateFiles) && selectedTrainer.certificateFiles.length > 0) {
        await ownerTrainerService.uploadTrainerCertificates(selectedTrainer.id, selectedTrainer.certificateFiles);
      }

      alert("Cập nhật huấn luyện viên thành công!");
      handleCloseEditModal();
      loadTrainers();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi cập nhật");
    }
  };

  const handleViewDetail = async (trainer) => {
    try {
      const response = await ownerTrainerService.getTrainerDetail(trainer.id);
      setTrainerDetail(response.data);
      setSelectedTrainer(trainer);
      setShowDetailModal(true);
    } catch (error) {
      alert("Lỗi khi tải thông tin huấn luyện viên");
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setTrainerDetail(null);
    setSelectedTrainer(null);
  };

  const handleToggleStatus = async (trainer) => {
    const isActivating = !trainer.isActive;
    const action = isActivating ? "hoạt động" : "ngừng hoạt động";

    if (!isActivating) {
      try {
        const response = await ownerBookingService.getMyBookings({
          trainerId: trainer.id,
          status: "confirmed,in_progress"
        });
        const upcomingBookings = response.data?.filter(booking => {
          return new Date(booking.bookingDate) >= new Date();
        }) || [];

        if (upcomingBookings.length > 0) {
          alert(`Không thể ngừng hoạt động! Huấn luyện viên còn ${upcomingBookings.length} lịch hẹn sắp tới.`);
          return;
        }
      } catch (error) { console.error(error); }
    }

    if (!window.confirm(`Bạn có chắc muốn ${action} huấn luyện viên "${trainer.User?.username}"?`)) return;

    try {
      const response = await ownerTrainerService.toggleTrainerStatus(trainer.id);
      alert(response.message || `Đã ${action} huấn luyện viên thành công!`);
      if (showDetailModal) handleCloseDetailModal();
      await loadTrainers(pagination.page);
    } catch (error) {
      alert(error.response?.data?.message || `Lỗi khi ${action} huấn luyện viên`);
    }
  };

  // --- Approval Logic (Giữ nguyên từ file 2) ---
  const fetchRequests = useCallback(async (page = 1, options = {}) => {
    const { silent = false, autoRefresh = false } = options;
    if (!silent) setLoadingReq(true);
    try {
      const response = await getRequests({
        page,
        limit: requestPagination.limit,
        gymId: selectedGymId ? String(selectedGymId) : undefined,
      });
      const nextData = Array.isArray(response.data) ? response.data : [];
      const filteredData = selectedGymId
        ? nextData.filter((request) => getRequestGymIds(request).includes(Number(selectedGymId)))
        : nextData;
      const nextPagination = response.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
      const hasNewIncomingRequest =
        latestRequestTotalRef.current > 0 && Number(nextPagination.total) > Number(latestRequestTotalRef.current);

      latestRequestTotalRef.current = Number(nextPagination.total) || 0;

      if (autoRefresh && hasNewIncomingRequest && page !== 1) {
        await fetchRequests(1, { silent: true, autoRefresh: false });
        return;
      }

      setRequests(filteredData);
      setRequestPagination(nextPagination);
    } catch (error) {
      console.error("Error fetching requests:", error);
      setRequests([]);
    } finally {
      if (!silent) setLoadingReq(false);
    }
  }, [requestPagination.limit, selectedGymId]);

  useEffect(() => {
    if (activeTab === "approval") {
      fetchRequests(1);
    }
  }, [activeTab, fetchRequests]);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    if (nextTab === "approval" && activeTab !== "approval") {
      setActiveTab("approval");
    }
  }, [activeTab, searchParams]);

  useOwnerRealtimeRefresh({
    enabled: activeTab === "approval",
    onRefresh: async () => {
      await fetchRequests(requestPagination.page || 1, { silent: true, autoRefresh: true });
    },
    events: ["notification:new", "request:changed"],
    notificationTypes: ["trainer_request"],
  });

  const handleApprove = async (requestId) => {
    try {
      await approveRequest(requestId, "Approved by Gym Owner");
      await fetchRequests(requestPagination.page);
    } catch (error) { console.error(error); }
  };

  const handleReject = async (requestId) => {
    try {
      const rejectReason = window.prompt("Nhập lý do từ chối đơn này:", "");
      if (rejectReason === null) return;
      const note = String(rejectReason || "").trim();
      if (!note) {
        alert("Vui lòng nhập lý do từ chối.");
        return;
      }

      await rejectRequest(requestId, note);
      await fetchRequests(requestPagination.page);
    } catch (error) { console.error(error); }
  };

  const handleOpenRequestDetail = (request) => {
    setSelectedRequest(request);
    setShowRequestDetailModal(true);
  };

  const handleCloseRequestDetail = () => {
    setShowRequestDetailModal(false);
    setSelectedRequest(null);
  };

  return (
    <div className="owner-bookings-page">
      {/* TABS NAVIGATION */}
      <div className="trainer-tabs-wrap">
          <button
            onClick={() => setActiveTab("management")}
            className={`trainer-tab-btn ${activeTab === "management" ? "is-active" : ""}`}
          >
            Quản lý huấn luyện viên
          </button>
          <button
            onClick={() => setActiveTab("approval")}
            className={`trainer-tab-btn ${activeTab === "approval" ? "is-active" : ""}`}
          >
            Duyệt yêu cầu Huấn luyện viên
          </button>
      </div>

      {activeTab === "management" ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1 className="page-title">Quản lý huấn luyện viên {selectedGymName ? `- ${selectedGymName}` : ""}</h1>
              {selectedGymName ? <div className="page-subtitle">Chi nhánh đang quản lý: {selectedGymName}</div> : null}
            </div>
            <button onClick={handleOpenCreateModal} className="search-button" style={{ marginBottom: 0 }}>
              + Thêm huấn luyện viên mới
            </button>
          </div>

          <div className="bookings-search-filters">
            <input
              type="text"
              placeholder="Tìm theo tên, email, chuyên môn..."
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              className="search-input"
            />
            <select
              value={filters.gymId}
              onChange={(e) => setFilters({ ...filters, gymId: e.target.value })}
              className="filter-select"
              disabled={Boolean(selectedGymId)}
            >
              <option value="">{selectedGymId ? (selectedGymName || "Chi nhánh đang quản lý") : "Tất cả phòng tập"}</option>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>{gym.name}</option>
              ))}
            </select>
            <button onClick={handleSearch} className="search-button">Tìm</button>
          </div>

          <div className="bookings-table-wrapper">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Tên huấn luyện viên</th><th>Email</th><th>Điện thoại</th><th>Phòng tập</th><th>Chuyên môn</th><th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {trainers.length > 0 ? (
                  trainers.map((trainer) => (
                    <tr
                      key={trainer.id}
                      className={highlightTrainerId === trainer.id ? "new-trainer-row" : ""}
                    >
                      <td>{trainer.User?.username || "N/A"}</td>
                      <td>{trainer.User?.email || "N/A"}</td>
                      <td>{trainer.User?.phone || "N/A"}</td>
                      <td>{trainer.Gym?.name || "N/A"}</td>
                      <td>{specializationToVietnamese(trainer.specialization || "") || "N/A"}</td>
                      <td>
                        <div className="trainer-actions">
                          <button onClick={() => handleViewDetail(trainer)} className="btn-detail">Chi tiết</button>
                          <button onClick={() => handleOpenEditModal(trainer)} className="btn-edit">Sửa</button>
                          <button onClick={() => handleToggleStatus(trainer)} className="btn-deactivate">
                            {trainer.isActive !== false ? "Ngừng hoạt động" : "Kích hoạt"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="no-bookings">Không có huấn luyện viên nào</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <button disabled={pagination.page <= 1} onClick={() => loadTrainers(pagination.page - 1)} className="pagination-btn">Trước</button>
            <span className="pagination-info">Trang {pagination.page} / {pagination.totalPages || 1}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => loadTrainers(pagination.page + 1)} className="pagination-btn">Sau</button>
          </div>
        </>
      ) : (
        /* UI DUYỆT YÊU CẦU (Giữ nguyên từ file 2) */
        <div className="owner-request-approval" style={{ padding: 0 }}>
          <div className="od2-main">
            <div className="od2-topbar">
              <div>
                <h1 className="od2-h1">Duyệt yêu cầu Huấn luyện viên {selectedGymName ? `- ${selectedGymName}` : ""}</h1>
                {selectedGymName ? <div className="page-subtitle">Chi nhánh đang quản lý: {selectedGymName}</div> : null}
              </div>
            </div>
            <div className="od2-content">
              {loadingReq ? (
                <p className="loading-text">Đang tải...</p>
              ) : requests.length === 0 ? (
                <p className="empty-text">Không có yêu cầu nào</p>
              ) : (
                <div className="table-container">
                  <table className="approval-table">
                    <thead>
                      <tr>
                        <th>Người yêu cầu</th><th>Loại yêu cầu</th><th>Người duyệt</th><th>Lý do / Nội dung</th><th>Trạng thái</th><th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.id}>
                          <td>{request.requesterUsername}</td>
                          <td>
                            <button type="button" className="type-badge type-badge-btn" disabled>
                              {getRequestTypeLabel(request.requestType)}
                            </button>
                          </td>
                          <td>{request.approverUsername || '—'}</td>
                          <td className="reason-cell">
                            <div className="request-content-wrap">
                              <div><b>Lý do:</b> {request.reason || "N/A"}</div>
                              <div><b>Nội dung:</b> {request.requestContent || "N/A"}</div>
                            </div>
                          </td>
                          <td>
                            {request.status === 'PENDING' && <span className="status-pending">Chờ duyệt</span>}
                            {request.status === 'APPROVED' && <span className="status-approved">Đã duyệt</span>}
                            {request.status === 'REJECTED' && <span className="status-rejected">Đã từ chối</span>}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn-detail" onClick={() => handleOpenRequestDetail(request)}>Chi tiết đơn</button>
                              {request.status === 'PENDING' ? (
                                <>
                                  <button className="btn-approve" onClick={() => handleApprove(request.id)}>Duyệt</button>
                                  <button className="btn-reject" onClick={() => handleReject(request.id)}>Từ chối</button>
                                </>
                              ) : (
                                <span className="action-done">Hoàn tất</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loadingReq && requestPagination.totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    disabled={requestPagination.page <= 1}
                    onClick={() => fetchRequests(requestPagination.page - 1)}
                    className="pagination-btn"
                  >
                    Trước
                  </button>
                  <span className="pagination-info">
                    Trang {requestPagination.page} / {requestPagination.totalPages}
                  </span>
                  <button
                    disabled={requestPagination.page >= requestPagination.totalPages}
                    onClick={() => fetchRequests(requestPagination.page + 1)}
                    className="pagination-btn"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- RENDER CÁC MODALS PT MANAGEMENT (Giữ nguyên logic) --- */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseCreateModal}>
          <div className="modal-content modal-create" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Thêm huấn luyện viên mới</h2>
              <button className="modal-close" onClick={handleCloseCreateModal}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateTrainer(); }} className="modal-form">
                <div className="form-group">
                  <label>Chọn người dùng *</label>
                  <select value={newTrainer.targetUserId} onChange={(e) => setNewTrainer({ ...newTrainer, targetUserId: e.target.value })} required className="form-select">
                    <option value="">-- Chọn user --</option>
                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Chọn phòng tập *</label>
                  <select value={newTrainer.gymId} onChange={(e) => setNewTrainer({ ...newTrainer, gymId: e.target.value })} required className="form-select" disabled={Boolean(selectedGymId)}>
                    <option value="">{selectedGymId ? (selectedGymName || "Chi nhánh đang quản lý") : "-- Chọn phòng tập --"}</option>
                    {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Chuyên môn</label>
                  <div className="specialization-picker">
                    {SPECIALIZATION_OPTIONS.map((option) => {
                      const checked = Array.isArray(newTrainer.specializationSelections)
                        ? newTrainer.specializationSelections.includes(option)
                        : false;
                      return (
                        <label key={option} className={`spec-option ${checked ? "is-selected" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleNewTrainerSpecialization(option)}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                  <small style={{ color: "#9ca3af" }}>Chọn 1 hoặc nhiều chuyên môn từ danh sách.</small>
                </div>
                <div className="form-group">
                  <label>Chứng chỉ</label>
                  <input type="text" className="form-input" value={newTrainer.certification} onChange={(e) => setNewTrainer({ ...newTrainer, certification: e.target.value })} placeholder="VD: NASM..."/>
                </div>
                <div className="form-group">
                  <label>Link chứng chỉ (mỗi dòng 1 link)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={newTrainer.certificationLinksText}
                    onChange={(e) => setNewTrainer({ ...newTrainer, certificationLinksText: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="form-group">
                  <label>Ảnh chứng chỉ</label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setNewTrainer({ ...newTrainer, certificateFiles: Array.from(e.target.files || []) })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Giá/giờ (đ)</label>
                  <input type="number" className="form-input" value={newTrainer.hourlyRate} onChange={(e) => setNewTrainer({ ...newTrainer, hourlyRate: e.target.value })}/>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={handleCloseCreateModal} className="btn-cancel">Hủy</button>
                  <button type="submit" className="btn-submit">Thêm huấn luyện viên</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedTrainer && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content edit-trainer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Sửa huấn luyện viên: {selectedTrainer?.User?.username || "N/A"}</h2>
              <button className="modal-close" onClick={handleCloseEditModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="edit-info-card">
                <span className="edit-label">Email</span>
                <span className="edit-value">{selectedTrainer?.User?.email || "N/A"}</span>
              </div>

              <div className="edit-info-card">
                <span className="edit-label">Phòng tập</span>
                <span className="edit-value">{selectedTrainer?.Gym?.name || "N/A"}</span>
              </div>

              <div className="edit-field">
                <p className="edit-field-label">Chuyên môn</p>
                <div className="specialization-picker">
                  {SPECIALIZATION_OPTIONS.map((option) => {
                    const checked = Array.isArray(selectedTrainer?.specializationSelections)
                      ? selectedTrainer.specializationSelections.includes(option)
                      : false;
                    return (
                      <label key={option} className={`spec-option ${checked ? "is-selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectedTrainerSpecialization(option)}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
                <small style={{ color: "#9ca3af" }}>Chọn 1 hoặc nhiều chuyên môn từ danh sách.</small>
              </div>

              <div className="edit-field">
                <p className="edit-field-label">Chứng chỉ</p>
                <input
                  className="edit-field-input"
                  type="text"
                  value={selectedTrainer?.certification || ""}
                  onChange={(e) =>
                    setSelectedTrainer((prev) => ({ ...prev, certification: e.target.value }))
                  }
                  placeholder="VD: ACE, NASM"
                />
              </div>

              <div className="edit-field">
                <p className="edit-field-label">Link chứng chỉ (mỗi dòng 1 link)</p>
                <textarea
                  className="edit-field-input"
                  rows={3}
                  value={selectedTrainer?.certificationLinksText || ""}
                  onChange={(e) =>
                    setSelectedTrainer((prev) => ({ ...prev, certificationLinksText: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="edit-field">
                <p className="edit-field-label">Tải thêm ảnh chứng chỉ</p>
                <input
                  className="edit-field-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setSelectedTrainer((prev) => ({ ...prev, certificateFiles: Array.from(e.target.files || []) }))
                  }
                />
              </div>

              <div className="edit-field">
                <p className="edit-field-label">Giá/giờ (VND)</p>
                <input
                  className="edit-field-input"
                  type="number"
                  value={selectedTrainer?.hourlyRate ?? ""}
                  onChange={(e) =>
                    setSelectedTrainer((prev) => ({ ...prev, hourlyRate: e.target.value }))
                  }
                  placeholder="VD: 200000"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={handleCloseEditModal}>Hủy</button>
              <button type="button" className="btn-submit" onClick={handleUpdateTrainer}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {showRequestDetailModal && selectedRequest && (
        <div className="modal-overlay" onClick={handleCloseRequestDetail}>
          <div className="modal-content request-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết đơn: {getRequestTypeLabel(selectedRequest.requestType)}</h2>
              <button className="modal-close" onClick={handleCloseRequestDetail}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3 className="detail-section-title">Thông tin người gửi</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Người yêu cầu:</span>
                    <span className="detail-value">{selectedRequest.requesterUsername || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Loại yêu cầu:</span>
                    <span className="detail-value">{getRequestTypeLabel(selectedRequest.requestType)}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3 className="detail-section-title">Nội dung đã gửi</h3>
                <div className="request-content-wrap">
                  <div><b>Lý do:</b> {selectedRequest.reason || "N/A"}</div>
                  <div><b>Nội dung:</b> {selectedRequest.requestContent || "N/A"}</div>
                </div>
              </div>

              {String(selectedRequest?.requestType || "").toUpperCase() === "BECOME_TRAINER" ? (
                <div className="detail-section">
                  <h3 className="detail-section-title">Thông tin ứng tuyển PT</h3>
                  <div className="detail-item detail-item--block">
                    <span className="detail-label">Phòng gym:</span>
                    <span className="detail-value">
                      {selectedRequest?.requestApplication?.gymName
                        || (selectedRequest?.requestApplication?.gymId ? `Gym #${selectedRequest.requestApplication.gymId}` : "N/A")}
                    </span>
                  </div>
                  <div className="detail-item detail-item--block">
                    <span className="detail-label">Giá/giờ:</span>
                    <span className="detail-value">
                      {selectedRequest?.requestApplication?.hourlyRate
                        ? `${selectedRequest.requestApplication.hourlyRate.toLocaleString("vi-VN")} đ`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="detail-item detail-item--block">
                    <span className="detail-label">Chuyên môn:</span>
                    <span className="detail-value">
                      {Array.isArray(selectedRequest?.requestApplication?.specializations)
                        && selectedRequest.requestApplication.specializations.length > 0
                        ? selectedRequest.requestApplication.specializations.join(", ")
                        : "N/A"}
                    </span>
                  </div>
                  <div className="detail-item detail-item--block">
                    <span className="detail-label">Chứng chỉ:</span>
                    <span className="detail-value">{selectedRequest?.requestApplication?.certification || "N/A"}</span>
                  </div>
                  <div className="detail-item detail-item--block">
                    <span className="detail-label">Link chứng chỉ:</span>
                    <span className="detail-value">
                      {Array.isArray(selectedRequest?.requestApplication?.certificationLinks)
                        && selectedRequest.requestApplication.certificationLinks.length > 0
                        ? selectedRequest.requestApplication.certificationLinks.join(" | ")
                        : "N/A"}
                    </span>
                  </div>
                </div>
              ) : String(selectedRequest?.requestType || "").toUpperCase() === "BUSY_SLOT" ? (
                <div className="detail-section">
                  <h3 className="detail-section-title">Thông tin khung giờ báo bận</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Huấn luyện viên:</span>
                      <span className="detail-value">{selectedRequest.requesterUsername || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Hội viên:</span>
                      <span className="detail-value">
                        {selectedRequest?.requestData?.memberName
                          || (selectedRequest?.requestData?.memberId ? `Hội viên #${selectedRequest.requestData.memberId}` : "Chưa gắn hội viên")}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Ngày báo bận:</span>
                      <span className="detail-value">{selectedRequest?.requestData?.bookingDate || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Khung giờ:</span>
                      <span className="detail-value">
                        {toHm(selectedRequest?.requestData?.startTime) && toHm(selectedRequest?.requestData?.endTime)
                          ? `${toHm(selectedRequest.requestData.startTime)} - ${toHm(selectedRequest.requestData.endTime)}`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="detail-item detail-item--block">
                      <span className="detail-label">Phòng tập:</span>
                      <span className="detail-value">
                        {selectedRequest?.requestData?.gymName
                          || getGymNameById(selectedRequest?.requestData?.gymId)
                          || (selectedRequest?.requestData?.gymId ? `Phòng tập #${selectedRequest.requestData.gymId}` : "N/A")}
                      </span>
                    </div>
                    <div className="detail-item detail-item--block">
                      <span className="detail-label">Gói hội viên:</span>
                      <span className="detail-value">
                        {selectedRequest?.requestData?.packageName
                          || (selectedRequest?.requestData?.packageId ? `Gói #${selectedRequest.requestData.packageId}` : "N/A")}
                        {selectedRequest?.requestData?.packageActivationId
                          ? ` (Activation #${selectedRequest.requestData.packageActivationId})`
                          : ""}
                      </span>
                    </div>
                    <div className="detail-item detail-item--block">
                      <span className="detail-label">Mẹo thao tác nhanh:</span>
                      <span className="detail-value">
                        Dùng đúng ngày + khung giờ này để tạo phiếu xin mượn huấn luyện viên ở màn Chia sẻ huấn luyện viên.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="detail-section">
                  <h3 className="detail-section-title">Dữ liệu chi tiết của đơn</h3>
                  {getRequestDataEntries(selectedRequest?.requestData).length === 0 ? (
                    <div className="detail-item detail-item--block">
                      <span className="detail-value">Không có dữ liệu bổ sung.</span>
                    </div>
                  ) : (
                    <div className="request-data-grid">
                      {getRequestDataEntries(selectedRequest?.requestData).map((entry) => (
                        <div key={entry.key} className="detail-item detail-item--block">
                          <span className="detail-label">{entry.key}:</span>
                          <span className="detail-value">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={handleCloseRequestDetail}>Đóng</button>
            </div>
          </div>
        </div>
      )}

 {/* Modal Chi tiết PT */}
      {showDetailModal && trainerDetail && (
        <div className="modal-overlay" onClick={handleCloseDetailModal}>
          <div className="modal-content trainer-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết huấn luyện viên: {selectedTrainer?.User?.username}</h2>
              <button className="modal-close" onClick={handleCloseDetailModal}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Thông tin cơ bản */}
              <div className="detail-section">
                <h3 className="detail-section-title">Thông tin cơ bản</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Họ tên:</span>
                    <span className="detail-value">{selectedTrainer?.User?.username || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedTrainer?.User?.email || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Số điện thoại:</span>
                    <span className="detail-value">{selectedTrainer?.User?.phone || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phòng tập:</span>
                    <span className="detail-value">{selectedTrainer?.Gym?.name || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Chuyên môn:</span>
                    <span className="detail-value">{specializationToVietnamese(selectedTrainer?.specialization || "") || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Chứng chỉ:</span>
                    <span className="detail-value">{selectedTrainer?.certification || "N/A"}</span>
                  </div>
                  <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                    <span className="detail-label">Link/ảnh chứng chỉ:</span>
                    <div className="detail-value detail-cert-list" style={{ display: "flex", flexDirection: "column" }}>
                      {(() => {
                        const certs = Array.isArray(trainerDetail?.socialLinks?.certificates)
                          ? trainerDetail.socialLinks.certificates
                          : [];
                        const links = Array.isArray(trainerDetail?.socialLinks?.certificateLinks)
                          ? trainerDetail.socialLinks.certificateLinks
                          : [];
                        const merged = certs.length > 0 ? certs.map((c) => c.url).filter(Boolean) : links;
                        if (!merged.length) return <span>N/A</span>;
                        return merged.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="detail-cert-link">
                            {url}
                          </a>
                        ));
                      })()}
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Giá/giờ:</span>
                    <span className="detail-value">
                      {selectedTrainer?.hourlyRate 
                        ? `${Number(selectedTrainer.hourlyRate).toLocaleString("vi-VN")}đ` 
                        : "N/A"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Trạng thái:</span>
                    <span className={`detail-value ${selectedTrainer?.isActive ? 'status-active' : 'status-inactive'}`}>
                      {selectedTrainer?.isActive !== false ? "Đang hoạt động" : "Không hoạt động"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thống kê */}
              <div className="detail-section">
                <h3 className="detail-section-title">Thống kê</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-content">
                      <div className="stat-value">{trainerDetail.totalBookings || 0}</div>
                      <div className="stat-label">Tổng lịch</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-content">
                      <div className="stat-value">{trainerDetail.completedBookings || 0}</div>
                      <div className="stat-label">Hoàn thành</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-content">
                      <div className="stat-value">{trainerDetail.upcomingBookings || 0}</div>
                      <div className="stat-label">Sắp tới</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-content">
                      <div className="stat-value">{trainerDetail.averageRating?.toFixed(1) || "N/A"}</div>
                      <div className="stat-label">Đánh giá TB</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-close-modal" onClick={handleCloseDetailModal}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerBookingsPage;