import React, { useState, useEffect } from "react";
import ownerTrainerService from "../../../services/ownerTrainerService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import "./OwnerBookingsPage.css";

const OwnerBookingsPage = () => {
  const [trainers, setTrainers] = useState([]);
  const [filters, setFilters] = useState({ q: "", gymId: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [gyms, setGyms] = useState([]);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Data
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [trainerSchedule, setTrainerSchedule] = useState(null);
  
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
      alert("Tạo PT thành công!");
      handleCloseCreateModal();
      loadTrainers();
    } catch (error) {
      console.error("Lỗi khi tạo PT:", error);
      console.error("Error response:", error.response?.data);
      alert(error.response?.data?.message || "Lỗi khi tạo PT");
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
      alert("Cập nhật PT thành công!");
      handleCloseEditModal();
      loadTrainers();
    } catch (error) {
      console.error("Lỗi khi cập nhật PT:", error);
      alert(error.response?.data?.message || "Lỗi khi cập nhật PT");
    }
  };

  const handleDeleteTrainer = async (trainerId) => {
    if (!window.confirm("Bạn có chắc muốn xóa PT này? Role PT sẽ bị gỡ khỏi user.")) {
      return;
    }
    try {
      await ownerTrainerService.deleteTrainer(trainerId);
      alert("Xóa PT thành công!");
      loadTrainers();
    } catch (error) {
      console.error("Lỗi khi xóa PT:", error);
      alert(error.response?.data?.message || "Lỗi khi xóa PT");
    }
  };

  const handleViewSchedule = async (trainer) => {
    try {
      const response = await ownerTrainerService.getTrainerSchedule(trainer.id);
      setTrainerSchedule(response.data);
      setShowScheduleModal(true);
    } catch (error) {
      console.error("Lỗi khi xem lịch:", error);
      alert("Lỗi khi tải lịch PT");
    }
  };

  const handleCloseScheduleModal = () => {
    setShowScheduleModal(false);
    setTrainerSchedule(null);
  };

  return (
    <div className="owner-bookings-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="page-title">Quản lý PT</h1>
        <button onClick={handleOpenCreateModal} className="search-button" style={{ marginBottom: 0 }}>
          + Tạo PT mới
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
              <th>Tên PT</th>
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
                      onClick={() => handleViewSchedule(trainer)}
                      className="btn-view-schedule"
                    >
                      Xem lịch
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(trainer)}
                      className="btn-edit"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDeleteTrainer(trainer.id)}
                      className="btn-delete"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-bookings">
                  Không có PT nào
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

      {/* Modal Tạo PT */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseCreateModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <button className="modal-close" onClick={handleCloseCreateModal}>×</button>
            <h2>Tạo PT mới</h2>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Chọn user:</strong>
                <select
                  className="filter-select"
                  style={{ width: '100%', marginTop: '8px' }}
                  value={newTrainer.targetUserId}
                  onChange={(e) => setNewTrainer({ ...newTrainer, targetUserId: e.target.value })}
                >
                  <option value="">-- Chọn user chưa có role PT --</option>
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
                  Tạo PT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa PT */}
      {showEditModal && selectedTrainer && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <button className="modal-close" onClick={handleCloseEditModal}>×</button>
            <h2>Chỉnh sửa PT</h2>
            <div className="modal-body">
              <div className="detail-row">
                <strong>PT:</strong> {selectedTrainer.User?.username}
              </div>

              <div className="detail-row">
                <strong>Chuyên môn:</strong>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', marginTop: '8px' }}
                  value={selectedTrainer.specialization}
                  onChange={(e) => setSelectedTrainer({ ...selectedTrainer, specialization: e.target.value })}
                />
              </div>

              <div className="detail-row">
                <strong>Chứng chỉ:</strong>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', marginTop: '8px' }}
                  value={selectedTrainer.certification}
                  onChange={(e) => setSelectedTrainer({ ...selectedTrainer, certification: e.target.value })}
                />
              </div>

              <div className="detail-row">
                <strong>Giá/giờ (đ):</strong>
                <input
                  type="number"
                  className="search-input"
                  style={{ width: '100%', marginTop: '8px' }}
                  value={selectedTrainer.hourlyRate}
                  onChange={(e) => setSelectedTrainer({ ...selectedTrainer, hourlyRate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={handleCloseEditModal} className="pagination-btn" style={{ background: '#6b7280' }}>
                  Hủy
                </button>
                <button onClick={handleUpdateTrainer} className="search-button" style={{ margin: 0 }}>
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Lịch PT */}
      {showScheduleModal && trainerSchedule && (
        <div className="modal-overlay" onClick={handleCloseScheduleModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <button className="modal-close" onClick={handleCloseScheduleModal}>×</button>
            <h2>Lịch tập của PT {trainerSchedule.trainer?.User?.username}</h2>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Chuyên môn:</strong> {trainerSchedule.trainer?.specialization || "N/A"}
              </div>

              <div className="detail-row" style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '12px', borderRadius: '8px' }}>
                <strong>📅 Lịch rảnh:</strong>
                <div style={{ marginTop: '8px' }}>
                  {trainerSchedule.trainer?.availableHours && typeof trainerSchedule.trainer.availableHours === 'object' && Object.keys(trainerSchedule.trainer.availableHours).length > 0 ? (
                    Object.entries(trainerSchedule.trainer.availableHours).map(([day, hours]) => (
                      <p key={day} style={{ margin: '4px 0' }}>
                        <strong style={{ textTransform: 'capitalize' }}>{day}:</strong>{' '}
                        {Array.isArray(hours) && hours.length > 0 
                          ? hours.map((h, i) => `${h.start} - ${h.end}`).join(', ')
                          : 'Không có'}
                      </p>
                    ))
                  ) : (
                    <p>PT chưa cập nhật lịch rảnh</p>
                  )}
                </div>
              </div>

              <div className="detail-row">
                <strong>📋 Lịch đã đặt:</strong>
                {trainerSchedule.bookings && trainerSchedule.bookings.length > 0 ? (
                  <table className="bookings-table" style={{ marginTop: '10px' }}>
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Giờ</th>
                        <th>Hội viên</th>
                        <th>Phòng gym</th>
                        <th>Gói tập</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainerSchedule.bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>
                            {booking.bookingDate 
                              ? new Date(booking.bookingDate).toLocaleDateString('vi-VN')
                              : "N/A"}
                          </td>
                          <td>
                            {booking.startTime && booking.endTime
                              ? `${booking.startTime} - ${booking.endTime}`
                              : "N/A"}
                          </td>
                          <td>{booking.Member?.User?.username || "N/A"}</td>
                          <td>{booking.Gym?.name || "N/A"}</td>
                          <td>{booking.Package?.name || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ marginTop: '10px' }}>Chưa có lịch nào</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerBookingsPage;
