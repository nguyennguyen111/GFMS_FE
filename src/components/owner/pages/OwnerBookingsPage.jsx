import React, { useState, useEffect } from "react";
// Import Services
import ownerTrainerService from "../../../services/ownerTrainerService";
import ownerBookingService from "../../../services/ownerBookingService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { approveRequest, rejectRequest, getRequests } from "../../../services/ownerRequestService";

// Import CSS
import "./OwnerBookingsPage.css";
import "./OwnerRequestApprovalPage.css";

const OwnerBookingsPage = () => {
  const [activeTab, setActiveTab] = useState("management");

  // --- PT Management State (Giữ nguyên từ file 1) ---
  const [trainers, setTrainers] = useState([]);
  const [filters, setFilters] = useState({ q: "", gymId: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [gyms, setGyms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [trainerDetail, setTrainerDetail] = useState(null);
  const [newTrainer, setNewTrainer] = useState({
    targetUserId: "",
    gymId: "",
    specialization: "",
    certification: "",
    hourlyRate: "",
    availableHours: {},
  });

  // --- Approval State (Giữ nguyên từ file 2) ---
  const [requests, setRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);

  // --- Effect & Logic PT Management ---
  useEffect(() => {
    loadGyms();
    loadTrainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const params = { ...filters, page, limit: pagination.limit };
      const response = await ownerTrainerService.getMyTrainers(params);
      setTrainers(response.data || []);
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
      targetUserId: "", gymId: "", specialization: "",
      certification: "", hourlyRate: "", availableHours: {},
    });
  };

  const handleCreateTrainer = async () => {
    try {
      await ownerTrainerService.createTrainer(newTrainer);
      alert("Thêm huấn luyện viên thành công!");
      handleCloseCreateModal();
      loadTrainers();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi thêm huấn luyện viên");
    }
  };

  const handleOpenEditModal = (trainer) => {
    setSelectedTrainer(trainer);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedTrainer(null);
  };

  const handleUpdateTrainer = async () => {
    try {
      await ownerTrainerService.updateTrainer(selectedTrainer.id, {
        specialization: selectedTrainer.specialization,
        certification: selectedTrainer.certification,
        hourlyRate: selectedTrainer.hourlyRate,
        availableHours: selectedTrainer.availableHours,
      });
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
      alert(error.response?.data?.message || `Lỗi khi ${action} PT`);
    }
  };

  // --- Approval Logic (Giữ nguyên từ file 2) ---
  const fetchRequests = async () => {
    setLoadingReq(true);
    try {
      const response = await getRequests();
      setRequests(response);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoadingReq(false);
    }
  };

  useEffect(() => {
    if (activeTab === "approval") {
      fetchRequests();
    }
  }, [activeTab]);

  const handleApprove = async (requestId) => {
    try {
      await approveRequest(requestId, "Approved by Gym Owner");
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: "APPROVED" } : r));
    } catch (error) { console.error(error); }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectRequest(requestId, "Rejected by Gym Owner");
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: "REJECTED" } : r));
    } catch (error) { console.error(error); }
  };

  return (
    <div className="owner-bookings-page">
      {/* TABS NAVIGATION */}
      <div className="tabs-container" style={{ marginBottom: '20px', borderBottom: '1px solid #333', display: 'flex', gap: '20px' }}>
        <button 
          onClick={() => setActiveTab("management")}
          style={{ 
            padding: '10px 20px', background: 'none', border: 'none', 
            color: activeTab === "management" ? '#ff9800' : '#ccc',
            borderBottom: activeTab === "management" ? '2px solid #ff9800' : 'none',
            cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          Quản lý huấn luyện viên
        </button>
        <button 
          onClick={() => setActiveTab("approval")}
          style={{ 
            padding: '10px 20px', background: 'none', border: 'none', 
            color: activeTab === "approval" ? '#ff9800' : '#ccc',
            borderBottom: activeTab === "approval" ? '2px solid #ff9800' : 'none',
            cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          Duyệt yêu cầu PT
        </button>
      </div>

      {activeTab === "management" ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1 className="page-title">Quản lý huấn luyện viên</h1>
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
            >
              <option value="">Tất cả phòng gym</option>
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
                  <th>Tên huấn luyện viên</th><th>Email</th><th>Điện thoại</th><th>Phòng gym</th><th>Chuyên môn</th><th>Giá/giờ</th><th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {trainers.length > 0 ? (
                  trainers.map((trainer) => (
                    <tr key={trainer.id}>
                      <td>{trainer.User?.username || "N/A"}</td>
                      <td>{trainer.User?.email || "N/A"}</td>
                      <td>{trainer.User?.phone || "N/A"}</td>
                      <td>{trainer.Gym?.name || "N/A"}</td>
                      <td>{trainer.specialization || "N/A"}</td>
                      <td>{trainer.hourlyRate ? `${Number(trainer.hourlyRate).toLocaleString("vi-VN")}đ` : "N/A"}</td>
                      <td>
                        <button onClick={() => handleViewDetail(trainer)} className="btn-detail">Chi tiết</button>
                        <button onClick={() => handleOpenEditModal(trainer)} className="btn-edit">Sửa</button>
                        <button onClick={() => handleToggleStatus(trainer)} className="btn-deactivate">
                          {trainer.isActive !== false ? "Ngừng hoạt động" : "Kích hoạt"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7" className="no-bookings">Không có huấn luyện viên nào</td></tr>
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
              <h1 className="od2-h1">Duyệt yêu cầu PT</h1>
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
                        <th>Người yêu cầu</th><th>Loại yêu cầu</th><th>Người duyệt</th><th>Lý do</th><th>Trạng thái</th><th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.id}>
                          <td>{request.requesterUsername}</td>
                          <td><span className="type-badge">{request.requestType.toLowerCase()}</span></td>
                          <td>{request.approverUsername || '—'}</td>
                          <td className="reason-cell">{request.reason || 'N/A'}</td>
                          <td>
                            {request.status === 'PENDING' && <span className="status-pending">Chờ duyệt</span>}
                            {request.status === 'APPROVED' && <span className="status-approved">Đã duyệt</span>}
                            {request.status === 'REJECTED' && <span className="status-rejected">Đã từ chối</span>}
                          </td>
                          <td>
                            <div className="action-buttons">
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
                  <label>Chọn phòng gym *</label>
                  <select value={newTrainer.gymId} onChange={(e) => setNewTrainer({ ...newTrainer, gymId: e.target.value })} required className="form-select">
                    <option value="">-- Chọn phòng gym --</option>
                    {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Chuyên môn</label>
                  <input type="text" className="form-input" value={newTrainer.specialization} onChange={(e) => setNewTrainer({ ...newTrainer, specialization: e.target.value })} placeholder="VD: Yoga, Gym..."/>
                </div>
                <div className="form-group">
                  <label>Chứng chỉ</label>
                  <input type="text" className="form-input" value={newTrainer.certification} onChange={(e) => setNewTrainer({ ...newTrainer, certification: e.target.value })} placeholder="VD: NASM..."/>
                </div>
                <div className="form-group">
                  <label>Giá/giờ (đ)</label>
                  <input type="number" className="form-input" value={newTrainer.hourlyRate} onChange={(e) => setNewTrainer({ ...newTrainer, hourlyRate: e.target.value })}/>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={handleCloseCreateModal} className="btn-cancel">Hủy</button>
                  <button type="submit" className="btn-submit">✓ Thêm huấn luyện viên</button>
                </div>
              </form>
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
                <h3 className="detail-section-title">📋 Thông tin cơ bản</h3>
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
                    <span className="detail-label">Phòng gym:</span>
                    <span className="detail-value">{selectedTrainer?.Gym?.name || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Chuyên môn:</span>
                    <span className="detail-value">{selectedTrainer?.specialization || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Chứng chỉ:</span>
                    <span className="detail-value">{selectedTrainer?.certification || "N/A"}</span>
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
                <h3 className="detail-section-title">📊 Thống kê</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">🏋️</div>
                    <div className="stat-content">
                      <div className="stat-value">{trainerDetail.totalBookings || 0}</div>
                      <div className="stat-label">Tổng lịch</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                      <div className="stat-value">{trainerDetail.completedBookings || 0}</div>
                      <div className="stat-label">Hoàn thành</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                      <div className="stat-value">{trainerDetail.upcomingBookings || 0}</div>
                      <div className="stat-label">Sắp tới</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⭐</div>
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