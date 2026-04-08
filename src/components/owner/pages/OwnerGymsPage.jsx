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
  const [featuredIndex, setFeaturedIndex] = useState(0);
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

  useEffect(() => {
    setFeaturedIndex(0);
  }, [selectedGymId, gyms.length]);

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
  const featuredGym = selectedGymId
    ? (gyms[0] || null)
    : (gyms[Math.min(featuredIndex, Math.max(0, gyms.length - 1))] || gyms[0] || null);
  const canSlideFeatured = !selectedGymId && gyms.length > 1;
  const totalMembers = gyms.reduce((sum, gym) => sum + Number(gym?.totalMembers || 0), 0);
  const totalTrainers = gyms.reduce((sum, gym) => sum + Number(gym?.totalTrainers || 0), 0);
  const totalPackages = gyms.reduce((sum, gym) => sum + Number(gym?.totalPackages || 0), 0);
  const activeGyms = gyms.filter((gym) => String(gym?.status || "").toLowerCase() === "active").length;

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

      {featuredGym ? (
        <section className="og-hero">
          <div className="og-hero__bg">
            {getGymImage(featuredGym) ? (
              <img src={getGymImage(featuredGym)} alt={featuredGym.name} className="og-hero__image" />
            ) : null}
          </div>
          <div className="og-hero__overlay" />
          <div className="og-hero__content">
            <div className="og-hero__status">
              <span className="og-hero__status-dot" />
              {String(featuredGym?.status || "").toLowerCase() === "active" ? "Đang hoạt động" : "Tạm ngưng"}
            </div>
            <h2 className="og-hero__title">{featuredGym.name}</h2>
            <div className="og-hero__meta">
              <div><strong>Địa chỉ:</strong> {featuredGym.address || "Chưa cập nhật"}</div>
              <div><strong>Điện thoại:</strong> {featuredGym.phone || "Chưa cập nhật"}</div>
              <div><strong>Email:</strong> {featuredGym.email || "Chưa cập nhật"}</div>
            </div>
            <div className="og-hero__actions">
              <button onClick={() => handleViewDetail(featuredGym)} className="btn-view">Chi tiết</button>
              <button onClick={() => handleOpenEditModal(featuredGym)} className="btn-edit">Chỉnh sửa</button>
            </div>
            {canSlideFeatured ? (
              <div className="og-hero__switcher">
                <button
                  type="button"
                  className="og-hero__switch-btn"
                  onClick={() => setFeaturedIndex((prev) => (prev - 1 + gyms.length) % gyms.length)}
                >
                  ←
                </button>
                <span className="og-hero__switch-label">
                  Chi nhánh {featuredIndex + 1}/{gyms.length}
                </span>
                <button
                  type="button"
                  className="og-hero__switch-btn"
                  onClick={() => setFeaturedIndex((prev) => (prev + 1) % gyms.length)}
                >
                  →
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="og-metrics">
        <article className="og-metric-card">
          <h4>Tổng hội viên</h4>
          <div className="og-metric-value">{totalMembers}</div>
          <p>Toàn hệ thống phòng tập của bạn</p>
        </article>
        <article className="og-metric-card">
          <h4>Huấn luyện viên hoạt động</h4>
          <div className="og-metric-value">{totalTrainers}</div>
          <p>Đang phục vụ tại các chi nhánh</p>
        </article>
        <article className="og-metric-card">
          <h4>Gói tập đang mở</h4>
          <div className="og-metric-value">{totalPackages}</div>
          <p>Gói tập có thể bán/đăng ký</p>
        </article>
        <article className="og-metric-card">
          <h4>Chi nhánh hoạt động</h4>
          <div className="og-metric-value">{activeGyms}/{gyms.length || 0}</div>
          <p>Trạng thái tổng quan hệ thống</p>
        </article>
      </section>

      {gyms.length === 0 ? (
        <div className="gyms-grid">
          <div className="no-gyms">
            <div className="no-gyms-icon">🏋️</div>
            <p>{selectedGymName ? `Không tìm thấy chi nhánh ${selectedGymName}` : "Bạn chưa có phòng tập nào"}</p>
          </div>
        </div>
      ) : null}

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
