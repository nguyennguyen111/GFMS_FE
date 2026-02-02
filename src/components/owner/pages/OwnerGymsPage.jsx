import React, { useState, useEffect, useCallback } from "react";
import { ownerGetMyGyms, ownerUpdateGym } from "../../../services/ownerGymService";
import "./OwnerGymsPage.css";

const OwnerGymsPage = () => {
  const [gyms, setGyms] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGym, setEditGym] = useState({
    id: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
  });

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = async () => {
    try {
      const response = await ownerGetMyGyms();
      setGyms(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi load danh sách gym:", error);
      setGyms([]);
    }
  };

  const handleViewDetail = useCallback((gym) => {
    setSelectedGym(gym);
    setShowDetailModal(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedGym(null);
  }, []);

  const handleOpenEditModal = useCallback((gym) => {
    setEditGym({
      id: gym.id,
      name: gym.name || "",
      address: gym.address || "",
      phone: gym.phone || "",
      email: gym.email || "",
      description: gym.description || "",
    });
    setShowEditModal(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditGym({ id: "", name: "", address: "", phone: "", email: "", description: "" });
  }, []);

  const handleUpdateGym = useCallback(async (e) => {
    e.preventDefault();
    try {
      await ownerUpdateGym(editGym.id, {
        name: editGym.name,
        address: editGym.address,
        phone: editGym.phone,
        email: editGym.email,
        description: editGym.description,
      });
      alert("Cập nhật gym thành công!");
      handleCloseEditModal();
      loadGyms();
    } catch (error) {
      console.error("Lỗi khi cập nhật gym:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra khi cập nhật gym");
    }
  }, [editGym, handleCloseEditModal]);

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase();
    const statusMap = {
      active: { text: "Hoạt động", className: "status-active" },
      inactive: { text: "Ngừng hoạt động", className: "status-inactive" },
      suspended: { text: "Tạm ngưng", className: "status-suspended" },
    };
    const statusInfo = statusMap[normalizedStatus] || { text: status, className: "status-active" };
    return <span className={`status-badge ${statusInfo.className}`}>{statusInfo.text}</span>;
  };

  const getGymImage = (gym) => {
    if (gym.images) {
      try {
        const imageArray = JSON.parse(gym.images);
        if (Array.isArray(imageArray) && imageArray.length > 0) {
          return imageArray[0];
        }
      } catch (e) {
        // If images is a string URL
        if (typeof gym.images === 'string' && gym.images.startsWith('http')) {
          return gym.images;
        }
      }
    }
    return null;
  };

  return (
    <div className="owner-gyms-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Gym của tôi</h1>
          <p className="page-subtitle">Xem và quản lý thông tin các phòng gym</p>
        </div>
      </div>

      <div className="gyms-grid">
        {gyms.length === 0 ? (
          <div className="no-gyms">
            <div className="no-gyms-icon">🏋️</div>
            <p>Bạn chưa có gym nào</p>
          </div>
        ) : (
          gyms.map((gym) => (
            <div key={gym.id} className="gym-card">
              <div className="gym-image-container">
                {getGymImage(gym) ? (
                  <img src={getGymImage(gym)} alt={gym.name} className="gym-image" />
                ) : (
                  <div className="gym-image-placeholder">
                    <span className="gym-placeholder-icon">🏋️‍♂️</span>
                  </div>
                )}
              </div>
              
              <div className="gym-card-header">
                <h3 className="gym-name">{gym.name}</h3>
                {getStatusBadge(gym.status)}
              </div>
              
              <div className="gym-info">
                <div className="info-item">
                  <span className="info-icon">📍</span>
                  <span className="info-text">{gym.address || "Chưa có địa chỉ"}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-icon">📞</span>
                  <span className="info-text">{gym.phone || "Chưa có số điện thoại"}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-icon">✉️</span>
                  <span className="info-text">{gym.email || "Chưa có email"}</span>
                </div>
              </div>

              <div className="gym-stats">
                <div className="stat-item">
                  <div className="stat-value">{gym.totalMembers || 0}</div>
                  <div className="stat-label">Hội viên</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{gym.totalTrainers || 0}</div>
                  <div className="stat-label">Trainer</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{gym.totalPackages || 0}</div>
                  <div className="stat-label">Gói tập</div>
                </div>
              </div>

              <div className="gym-actions">
                <button onClick={() => handleViewDetail(gym)} className="btn-view">
                  👁️ Chi tiết
                </button>
                <button onClick={() => handleOpenEditModal(gym)} className="btn-edit">
                  ✏️ Chỉnh sửa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Chi tiết */}
      {showDetailModal && selectedGym && (
        <div className="modal-overlay" onClick={handleCloseDetailModal}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết Gym</h2>
              <button className="modal-close" onClick={handleCloseDetailModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="gym-detail-info">
                <div className="info-card">
                  <div className="info-label">Tên Gym:</div>
                  <div className="info-value">{selectedGym.name}</div>
                </div>

                <div className="info-card">
                  <div className="info-label">Địa chỉ:</div>
                  <div className="info-value">{selectedGym.address || "Chưa cập nhật"}</div>
                </div>

                <div className="info-card">
                  <div className="info-label">Số điện thoại:</div>
                  <div className="info-value">{selectedGym.phone || "Chưa cập nhật"}</div>
                </div>

                <div className="info-card">
                  <div className="info-label">Email:</div>
                  <div className="info-value">{selectedGym.email || "Chưa cập nhật"}</div>
                </div>

                <div className="info-card highlight">
                  <div className="info-label">Trạng thái:</div>
                  <div className="info-value">{getStatusBadge(selectedGym.status)}</div>
                </div>

                {selectedGym.description && (
                  <div className="info-card full-width">
                    <div className="info-label">Mô tả:</div>
                    <div className="info-value">{selectedGym.description}</div>
                  </div>
                )}

                <div className="info-card">
                  <div className="info-label">Ngày tạo:</div>
                  <div className="info-value">
                    {selectedGym.createdAt ? new Date(selectedGym.createdAt).toLocaleDateString('vi-VN') : "N/A"}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleCloseDetailModal} className="btn-cancel">
                Đóng
              </button>
              <button 
                onClick={() => {
                  handleCloseDetailModal();
                  handleOpenEditModal(selectedGym);
                }} 
                className="btn-submit"
              >
                ✏️ Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa */}
      {showEditModal && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content modal-edit" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chỉnh sửa thông tin Gym</h2>
              <button className="modal-close" onClick={handleCloseEditModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateGym} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Tên Gym *</label>
                  <input
                    type="text"
                    value={editGym.name}
                    onChange={(e) => setEditGym({ ...editGym, name: e.target.value })}
                    required
                    className="form-input"
                    placeholder="Nhập tên gym"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ *</label>
                  <input
                    type="text"
                    value={editGym.address}
                    onChange={(e) => setEditGym({ ...editGym, address: e.target.value })}
                    required
                    className="form-input"
                    placeholder="Nhập địa chỉ"
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="tel"
                      value={editGym.phone}
                      onChange={(e) => setEditGym({ ...editGym, phone: e.target.value })}
                      className="form-input"
                      placeholder="Nhập số điện thoại"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={editGym.email}
                      onChange={(e) => setEditGym({ ...editGym, email: e.target.value })}
                      className="form-input"
                      placeholder="Nhập email"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    value={editGym.description}
                    onChange={(e) => setEditGym({ ...editGym, description: e.target.value })}
                    className="form-textarea"
                    rows="4"
                    placeholder="Mô tả về gym..."
                  />
                </div>

                <div className="renew-note">
                  <div className="note-icon">ℹ️</div>
                  <div className="note-text">
                    <strong>Lưu ý:</strong> Thông tin gym sẽ được hiển thị công khai cho người dùng. Vui lòng cập nhật đầy đủ và chính xác.
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleCloseEditModal} className="btn-cancel">
                    Hủy
                  </button>
                  <button type="submit" className="btn-submit">
                    ✓ Cập nhật
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerGymsPage;
