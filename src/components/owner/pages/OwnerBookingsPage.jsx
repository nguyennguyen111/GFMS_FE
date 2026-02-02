import React, { useState, useEffect } from "react";
import ownerTrainerService from "../../../services/ownerTrainerService";
import ownerBookingService from "../../../services/ownerBookingService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import "./OwnerBookingsPage.css";

const OwnerBookingsPage = () => {
  // PT Management
  const [trainers, setTrainers] = useState([]);
  const [filters, setFilters] = useState({ q: "", gymId: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [gyms, setGyms] = useState([]);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Data
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
      const params = {
        ...filters,
        page,
        limit: pagination.limit,
      };
      console.log("Loading trainers with params:", params);
      const response = await ownerTrainerService.getMyTrainers(params);
      console.log("Trainers response:", response);
      console.log("Trainers data:", response.data);
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
      console.log("Available users response:", response);
      console.log("Available users data:", response.data);
      setAvailableUsers(response.data || []);
    } catch (error) {
      console.error("Lỗi khi load users:", error);
      setAvailableUsers([]);
    }
  };

  const handleSearch = () => {
    loadTrainers(1);
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    loadAvailableUsers();
  };

  console.log("availableUsers state:", availableUsers);
  console.log("availableUsers length:", availableUsers.length);

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewTrainer({
      targetUserId: "",
      gymId: "",
      specialization: "",
      certification: "",
      hourlyRate: "",
      availableHours: {},
    });
  };

  const handleCreateTrainer = async () => {
    try {
      console.log("Creating trainer with data:", newTrainer);
      await ownerTrainerService.createTrainer(newTrainer);
      alert("Thêm huấn luyện viên thành công!");
      handleCloseCreateModal();
      loadTrainers();
    } catch (error) {
      console.error("Lỗi khi thêm huấn luyện viên:", error);
      console.error("Error response:", error.response?.data);
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
      console.error("Lỗi khi cập nhật huấn luyện viên:", error);
      alert(error.response?.data?.message || "Lỗi khi cập nhật huấn luyện viên");
    }
  };

  const handleViewDetail = async (trainer) => {
    try {
      const response = await ownerTrainerService.getTrainerDetail(trainer.id);
      setTrainerDetail(response.data);
      setSelectedTrainer(trainer);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Lỗi khi xem chi tiết:", error);
      alert("Lỗi khi tải thông tin huấn luyện viên");
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setTrainerDetail(null);
    setSelectedTrainer(null);
  };

  const handleToggleStatus = async (trainer) => {
    console.log("trainer.isActive:", trainer.isActive, "type:", typeof trainer.isActive);
    const isActivating = !trainer.isActive;
    const action = isActivating ? "hoạt động" : "ngừng hoạt động";

    // Only check for upcoming bookings if deactivating
    if (!isActivating) {
      try {
        const response = await ownerBookingService.getMyBookings({
          trainerId: trainer.id,
          status: "confirmed,in_progress"
        });
        
        const upcomingBookings = response.data?.filter(booking => {
          const bookingDate = new Date(booking.bookingDate);
          const today = new Date();
          return bookingDate >= today;
        }) || [];

        if (upcomingBookings.length > 0) {
          alert(`Không thể ngừng hoạt động! Huấn luyện viên còn ${upcomingBookings.length} lịch hẹn sắp tới.`);
          return;
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra lịch hẹn:", error);
      }
    }

    if (!window.confirm(`Bạn có chắc muốn ${action} huấn luyện viên "${trainer.User?.username}"?`)) {
      return;
    }

    try {
      const response = await ownerTrainerService.toggleTrainerStatus(trainer.id);
      alert(response.message || `Đã ${action} huấn luyện viên thành công!`);
      
      // Close detail modal if open
      if (showDetailModal) {
        handleCloseDetailModal();
      }
      
      // Reload trainers to update status
      await loadTrainers(pagination.page);
    } catch (error) {
      console.error(`Lỗi khi ${action} PT:`, error);
      alert(error.response?.data?.message || `Lỗi khi ${action} PT`);
    }
  };

  return (
    <div className="owner-bookings-page">
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
            <option key={gym.id} value={gym.id}>
              {gym.name}
            </option>
          ))}
        </select>
        <button onClick={handleSearch} className="search-button">
          Tìm
        </button>
      </div>

      <div className="bookings-table-wrapper">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Tên huấn luyện viên</th>
              <th>Email</th>
              <th>Điện thoại</th>
              <th>Phòng gym</th>
              <th>Chuyên môn</th>
              <th>Giá/giờ</th>
              <th>Hành động</th>
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
                  <td>{trainer.hourlyRate ? `${Number(trainer.hourlyRate).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}đ` : "N/A"}</td>
                  <td>
                    <button
                      onClick={() => handleViewDetail(trainer)}
                      className="btn-detail"
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(trainer)}
                      className="btn-edit"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleToggleStatus(trainer)}
                      className="btn-deactivate"
                    >
                      {trainer.isActive !== false ? "Ngừng hoạt động" : "Kích hoạt"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-bookings">
                  Không có huấn luyện viên nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <button
          disabled={pagination.page <= 1}
          onClick={() => loadTrainers(pagination.page - 1)}
          className="pagination-btn"
        >
          Trước
        </button>
        <span className="pagination-info">
          Trang {pagination.page} / {pagination.totalPages || 1}
        </span>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => loadTrainers(pagination.page + 1)}
          className="pagination-btn"
        >
          Sau
        </button>
      </div>

      
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseCreateModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <button className="modal-close" onClick={handleCloseCreateModal}>×</button>
            <h2>Thêm huấn luyện viên mới</h2>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Chọn user:</strong>
                <select
                  className="filter-select"
                  style={{ width: '100%', marginTop: '8px' }}
                  value={newTrainer.targetUserId}
                  onChange={(e) => setNewTrainer({ ...newTrainer, targetUserId: e.target.value })}
                >
                  <option value="">-- Chọn user chưa có vai trò huấn luyện viên --</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} - {user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="detail-row">
                <strong>Phòng gym:</strong>
                <select
                  className="filter-select"
                  style={{ width: '100%', marginTop: '8px' }}
                  value={newTrainer.gymId}
                  onChange={(e) => setNewTrainer({ ...newTrainer, gymId: e.target.value })}
                >
                  <option value="">-- Chọn phòng gym --</option>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="detail-row">
                <strong>Chuyên môn:</strong>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', marginTop: '8px' }}
                  value={newTrainer.specialization}
                  onChange={(e) => setNewTrainer({ ...newTrainer, specialization: e.target.value })}
                  placeholder="VD: Yoga, Gym, Boxing..."
                />
              </div>

              <div className="detail-row">
                <strong>Chứng chỉ:</strong>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', marginTop: '8px' }}
                  value={newTrainer.certification}
                  onChange={(e) => setNewTrainer({ ...newTrainer, certification: e.target.value })}
                  placeholder="VD: ACE-CPT, NASM..."
                />
              </div>

              <div className="detail-row">
                <strong>Giá/giờ (đ):</strong>
                <input
                  type="number"
                  className="search-input"
                  style={{ width: '100%', marginTop: '8px' }}
                  value={newTrainer.hourlyRate}
                  onChange={(e) => setNewTrainer({ ...newTrainer, hourlyRate: e.target.value })}
                  placeholder="VD: 200000"
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={handleCloseCreateModal} className="pagination-btn" style={{ background: '#6b7280' }}>
                  Hủy
                </button>
                <button onClick={handleCreateTrainer} className="search-button" style={{ margin: 0 }}>
                  Thêm huấn luyện viên
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

     
      {showEditModal && selectedTrainer && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content edit-trainer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chỉnh sửa huấn luyện viên</h2>
              <button className="modal-close" onClick={handleCloseEditModal}>×</button>
            </div>
            
            <div className="modal-body">
              {/* PT Name (read-only) */}
              <div className="edit-info-card">
                <div className="edit-label">Huấn luyện viên:</div>
                <div className="edit-value">{selectedTrainer.User?.username}</div>
              </div>

              {/* Chuyên môn */}
              <div className="edit-field">
                <label className="edit-field-label">Chuyên môn:</label>
                <input
                  type="text"
                  className="edit-field-input"
                  value={selectedTrainer.specialization}
                  onChange={(e) => setSelectedTrainer({ ...selectedTrainer, specialization: e.target.value })}
                />
              </div>

              {/* Chứng chỉ */}
              <div className="edit-field">
                <label className="edit-field-label">Chứng chỉ:</label>
                <input
                  type="text"
                  className="edit-field-input"
                  value={selectedTrainer.certification}
                  onChange={(e) => setSelectedTrainer({ ...selectedTrainer, certification: e.target.value })}
                />
              </div>

              {/* Giá/giờ */}
              <div className="edit-field">
                <label className="edit-field-label">Giá/giờ (đ):</label>
                <input
                  type="number"
                  className="edit-field-input"
                  value={selectedTrainer.hourlyRate}
                  onChange={(e) => setSelectedTrainer({ ...selectedTrainer, hourlyRate: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={handleCloseEditModal} className="btn-cancel">
                Hủy
              </button>
              <button onClick={handleUpdateTrainer} className="btn-submit">
                Cập nhật
              </button>
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
