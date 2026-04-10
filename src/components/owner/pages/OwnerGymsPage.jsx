import React, { useState, useEffect, useCallback } from "react";
import { ownerGetMyGyms, ownerUpdateGym, ownerUploadGymImage } from "../../../services/ownerGymService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";
import "./OwnerGymsPage.css";

const sortGymsByStatus = (gyms = []) =>
  [...gyms].sort((a, b) => {
    const aActive = a.status?.toLowerCase() === "active" ? 0 : 1;
    const bActive = b.status?.toLowerCase() === "active" ? 0 : 1;
    return aActive - bActive;
  });

const OwnerGymsPage = () => {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [gyms, setGyms] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 4;
  const [selectedGym, setSelectedGym] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [editGym, setEditGym] = useState({
    id: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    images: [],
    avatarIndex: 0,
  });

  useEffect(() => {
    setPage(1);
  }, [gyms.length]);

  const syncGymState = useCallback((nextGyms) => {
    const scopedGyms = selectedGymId
      ? nextGyms.filter((gym) => Number(gym.id) === Number(selectedGymId))
      : nextGyms;
    const sortedGyms = sortGymsByStatus(scopedGyms);
    setGyms(sortedGyms);
    setSelectedGym((prev) => {
      if (!prev?.id) return prev;
      return sortedGyms.find((gym) => Number(gym.id) === Number(prev.id)) || prev;
    });
  }, [selectedGymId]);

  const loadGyms = useCallback(async () => {
    try {
      const response = await ownerGetMyGyms();
      const gymsData = Array.isArray(response.data?.data) ? response.data.data : [];

      syncGymState(gymsData);
    } catch (error) {
      console.error("Lỗi khi load danh sách phòng tập:", error);
      setGyms([]);
    }
  }, [syncGymState]);

  useEffect(() => {
    loadGyms();
  }, [loadGyms]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await loadGyms();
    },
    events: ["gym:changed"],
  });

  const handleViewDetail = useCallback((gym) => {
    setSelectedGym(gym);
    setShowDetailModal(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedGym(null);
  }, []);

  const handleOpenEditModal = useCallback((gym) => {
    const parsedImages = parseGymImages(gym.images);
    setEditGym({
      id: gym.id,
      name: gym.name || "",
      address: gym.address || "",
      phone: gym.phone || "",
      email: gym.email || "",
      description: gym.description || "",
      images: parsedImages,
      avatarIndex: parsedImages.length > 0 ? 0 : -1,
    });
    setShowEditModal(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditGym({ id: "", name: "", address: "", phone: "", email: "", description: "", images: [], avatarIndex: 0 });
  }, []);

  const handleUpdateGym = useCallback(async (e) => {
    e.preventDefault();
    try {
      const images = Array.isArray(editGym.images) ? [...editGym.images] : [];
      let orderedImages = images;
      if (images.length > 0 && editGym.avatarIndex >= 0) {
        const avatar = images[editGym.avatarIndex] || images[0];
        orderedImages = [avatar, ...images.filter((img) => img !== avatar)].slice(0, 10);
      }
      const payload = {
        name: editGym.name,
        address: editGym.address,
        images: orderedImages,
      };
      const phoneValue = (editGym.phone || "").trim();
      const emailValue = (editGym.email || "").trim();
      const descriptionValue = (editGym.description || "").trim();
      if (phoneValue) payload.phone = phoneValue;
      if (emailValue) payload.email = emailValue;
      if (descriptionValue) payload.description = descriptionValue;
      
      const response = await ownerUpdateGym(editGym.id, payload);
      const updatedGym = response.data?.data;
      handleCloseEditModal();

      if (updatedGym?.id) {
        setGyms((prev) => {
          const nextGyms = prev.map((gym) =>
            Number(gym.id) === Number(updatedGym.id) ? { ...gym, ...updatedGym } : gym
          );
          const sortedGyms = sortGymsByStatus(nextGyms);
          setSelectedGym((prevSelected) => {
            if (!prevSelected?.id) return prevSelected;
            return sortedGyms.find((gym) => Number(gym.id) === Number(prevSelected.id)) || prevSelected;
          });
          return sortedGyms;
        });
      } else {
        await loadGyms();
      }
      
      alert("Cập nhật phòng tập thành công!");
    } catch (error) {
      console.error("Lỗi khi cập nhật phòng tập:", error);
      alert(error.response?.data?.message || error.message || "Có lỗi xảy ra khi cập nhật phòng tập");
    }
  }, [editGym, handleCloseEditModal, loadGyms]);

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
  const parseGymImages = (imagesValue) => {
    if (!imagesValue) return [];
    if (Array.isArray(imagesValue)) return imagesValue.filter(Boolean);
    if (typeof imagesValue === "string") {
      try {
        const parsed = JSON.parse(imagesValue);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch (e) {
        return imagesValue.startsWith("http") ? [imagesValue] : [];
      }
    }
    return [];
  };

  const getGymImage = (gym) => {
    const images = parseGymImages(gym.images);
    if (images.length === 0) return null;
    
    const url = images[0];
    if (gym.updatedAt) {
      const timestamp = new Date(gym.updatedAt).getTime();
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}v=${timestamp}`;
    }
    return url;
  };

  const handleSelectImages = async (files) => {
    if (!files || files.length === 0) return;
    const currentImages = Array.isArray(editGym.images) ? editGym.images : [];
    if (currentImages.length >= 10) {
      alert("Tối đa 10 ảnh (1 đại diện + 9 ảnh)");
      return;
    }
    setUploadingImages(true);
    try {
      const remain = 10 - currentImages.length;
      const slice = Array.from(files).slice(0, remain);
      
      // Validate file types trước khi upload
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const invalidFiles = slice.filter(f => !validTypes.includes(f.type));
      if (invalidFiles.length > 0) {
        alert(`File không hợp lệ: ${invalidFiles.map(f => f.name).join(', ')}\nChỉ chấp nhận: JPG, PNG, WEBP, GIF`);
        setUploadingImages(false);
        return;
      }
      
      // Validate file size trước khi upload
      const maxSize = 5 * 1024 * 1024; // 5MB
      const oversizedFiles = slice.filter(f => f.size > maxSize);
      if (oversizedFiles.length > 0) {
        alert(`File quá lớn: ${oversizedFiles.map(f => f.name).join(', ')}\nTối đa 5MB mỗi ảnh`);
        setUploadingImages(false);
        return;
      }
      
      const uploaded = await Promise.all(
        slice.map(async (file) => {
          try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await ownerUploadGymImage(fd);
            return res?.data?.url;
          } catch (err) {
            console.error(`Lỗi upload ${file.name}:`, err);
            throw err;
          }
        })
      );
      
      const unique = uploaded.filter((img) => img && !currentImages.includes(img));
      
      setEditGym((prev) => {
        const nextImages = [...currentImages, ...unique].slice(0, 10);
        const nextAvatarIndex = prev.avatarIndex >= 0 ? prev.avatarIndex : (nextImages.length ? 0 : -1);
        return { ...prev, images: nextImages, avatarIndex: nextAvatarIndex };
      });
    } catch (e) {
      console.error("Upload ảnh phòng tập thất bại:", e);
      const errorMsg = e?.response?.data?.error || e?.response?.data?.message || e?.message || "Upload ảnh thất bại";
      alert(errorMsg);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (idx) => {
    setEditGym((prev) => {
      const nextImages = prev.images.filter((_, i) => i !== idx);
      let nextAvatarIndex = prev.avatarIndex;
      if (idx === prev.avatarIndex) {
        nextAvatarIndex = nextImages.length ? 0 : -1;
      } else if (idx < prev.avatarIndex) {
        nextAvatarIndex = prev.avatarIndex - 1;
      }
      return { ...prev, images: nextImages, avatarIndex: nextAvatarIndex };
    });
  };

  const totalPages = Math.max(1, Math.ceil(gyms.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleGyms = gyms.slice(startIndex, startIndex + pageSize);

  return (
    <div className="owner-gyms-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Phòng tập của tôi</h1>
          <p className="page-subtitle">
            {selectedGymName ? `Đang quản lý chi nhánh ${selectedGymName}` : "Xem và quản lý thông tin các phòng tập"}
          </p>
        </div>
      </div>

      <div className="gyms-grid">
        {gyms.length === 0 ? (
          <div className="no-gyms">
            <div className="no-gyms-icon">🏋️</div>
            <p>{selectedGymName ? `Không tìm thấy chi nhánh ${selectedGymName}` : "Bạn chưa có phòng tập nào"}</p>
          </div>
        ) : (
          visibleGyms.map((gym) => (
            <div key={gym.id} className="gym-card">
              <div className="gym-image-container">
                {getGymImage(gym) ? (
                  <img 
                    src={getGymImage(gym)} 
                    alt={gym.name} 
                    className="gym-image"
                  />
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
                  <div className="stat-label">Huấn luyện viên</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{gym.totalPackages || 0}</div>
                  <div className="stat-label">Gói tập</div>
                </div>
              </div>

              <div className="gym-actions">
                <button onClick={() => handleViewDetail(gym)} className="btn-view">
                  Chi tiết
                </button>
                <button onClick={() => handleOpenEditModal(gym)} className="btn-edit">
                  Chỉnh sửa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {gyms.length > pageSize && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Trước
          </button>
          <span>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Sau
          </button>
        </div>
      )}

      {/* Modal Chi tiết */}
      {showDetailModal && selectedGym && (
        <div className="modal-overlay" onClick={handleCloseDetailModal}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết Phòng tập</h2>
              <button className="modal-close" onClick={handleCloseDetailModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="gym-detail-info">
                <div className="info-card">
                  <div className="info-label">Tên Phòng tập:</div>
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
                Chỉnh sửa
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
              <h2 className="modal-title">Chỉnh sửa thông tin Phòng tập</h2>
              <button className="modal-close" onClick={handleCloseEditModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateGym} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Tên Phòng tập *</label>
                  <input
                    type="text"
                    value={editGym.name}
                    onChange={(e) => setEditGym({ ...editGym, name: e.target.value })}
                    required
                    className="form-input"
                    placeholder="Nhập tên phòng tập"
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
                    placeholder="Mô tả về phòng tập..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ảnh phòng gym</label>
                  <div className="gym-upload">
                    <label className={`gym-upload__drop ${uploadingImages || (editGym.images?.length || 0) >= 10 ? 'disabled' : ''}`}>
                      <div className="gym-upload__text">
                        <strong>📸 Chọn ảnh</strong>
                        <span>Tối đa 10 ảnh • JPG, PNG, WEBP, GIF • Tối đa 5MB/ảnh</span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        multiple
                        onChange={(e) => handleSelectImages(e.target.files)}
                        disabled={uploadingImages || (editGym.images?.length || 0) >= 10}
                      />
                    </label>

                    {uploadingImages && (
                      <div className="gym-upload__hint">⏳ Đang tải ảnh lên...</div>
                    )}

                    {editGym.images?.length ? (
                      <div className="gym-upload__grid">
                        {editGym.images.map((img, idx) => (
                          <div className="gym-upload__item" key={`${img}-${idx}`}>
                            <div
                              className="gym-upload__thumb"
                              style={{ backgroundImage: `url(${img})` }}
                              title={editGym.avatarIndex === idx ? "Ảnh đại diện" : `Ảnh ${idx + 1}`}
                            />
                            <div className="gym-upload__actions">
                              <label className="gym-upload__radio">
                                <input
                                  type="radio"
                                  name="gym-avatar"
                                  checked={editGym.avatarIndex === idx}
                                  onChange={() =>
                                    setEditGym((prev) => ({ ...prev, avatarIndex: idx }))
                                  }
                                />
                                {editGym.avatarIndex === idx ? "⭐ Đại diện" : "Đại diện"}
                              </label>
                              <button
                                type="button"
                                className="gym-upload__remove"
                                onClick={() => removeImage(idx)}
                                title="Xóa ảnh này"
                              >
                                🗑️ Xoá
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="gym-upload__empty">📷 Chưa có ảnh nào. Hãy chọn ảnh để hiển thị phòng tập của bạn!</div>
                    )}
                  </div>
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
