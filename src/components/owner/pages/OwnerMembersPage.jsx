import React, { useState, useEffect, useCallback } from "react";
import ownerMemberService from "../../../services/ownerMemberService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { ownerGetPackages } from "../../../services/ownerPackageService";
import ownerTrainerService from "../../../services/ownerTrainerService";
import "./OwnerMembersPage.css";

const OwnerMembersPage = () => {
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", gymId: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [gyms, setGyms] = useState([]);
  const [packages, setPackages] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [newMember, setNewMember] = useState({ targetUserId: "", gymId: "", packageId: "", trainerId: "" });
  const [editMember, setEditMember] = useState({ id: "", gymId: "", currentPackageId: "", status: "active" });
  const [renewMember, setRenewMember] = useState({ id: "", name: "", gymId: "", packageId: "", trainerId: "" });

  useEffect(() => {
    loadGyms();
    loadPackages();
    loadTrainers();
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGyms = async () => {
    try {
      const response = await ownerGetMyGyms();
      setGyms(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi load danh sách phòng gym:", error);
      setGyms([]);
    }
  };

  const loadPackages = async () => {
    try {
      const response = await ownerGetPackages();
      setPackages(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi load danh sách gói tập:", error);
      setPackages([]);
    }
  };

  const loadTrainers = async () => {
    try {
      const response = await ownerTrainerService.getMyTrainers({ page: 1, limit: 1000 });
      const list = Array.isArray(response?.data) ? response.data : [];
      setTrainers(list);
    } catch (error) {
      console.error("Lỗi khi load danh sách huấn luyện viên:", error);
      setTrainers([]);
    }
  };

  const loadMembers = useCallback(async (page = 1) => {
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...filters,
      };
      const data = await ownerMemberService.getMyMembers(params);
      setMembers(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Lỗi khi load hội viên:", error);
    }
  }, [filters, pagination.limit]);

  const handleSearch = () => {
    loadMembers(1);
  };

  const handleViewDetail = useCallback(async (id) => {
    try {
      const data = await ownerMemberService.getMemberDetail(id);
      console.log("Member detail data:", data.data);
      console.log("PackageActivations:", data.data?.PackageActivations);
      setSelectedMember(data.data);
      setShowModal(true);
    } catch (error) {
      console.error("Lỗi khi xem chi tiết:", error);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedMember(null);
  }, []);

  const handleOpenCreateModal = useCallback(async () => {
    try {
      const response = await ownerMemberService.getAvailableUsers();
      setAvailableUsers(Array.isArray(response.data) ? response.data : []);
      setShowCreateModal(true);
    } catch (error) {
      console.error("Lỗi khi load danh sách users:", error);
      alert(error.response?.data?.message || "Không thể tải danh sách users");
    }
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setNewMember({ targetUserId: "", gymId: "", packageId: "", trainerId: "" });
  }, []);

  const handleCreateMember = useCallback(async (e) => {
    e.preventDefault();
    if (!newMember.targetUserId || !newMember.gymId) {
      alert("Vui lòng chọn user và phòng tập");
      return;
    }

    if (newMember.packageId && !newMember.trainerId) {
      alert("Vui lòng chọn huấn luyện viên cho gói đã chọn");
      return;
    }

    try {
      await ownerMemberService.createMember(newMember);
      alert("Tạo hội viên thành công!");
      handleCloseCreateModal();
      // Reset về trang 1 và reload
      loadMembers(1);
    } catch (error) {
      console.error("Lỗi khi tạo hội viên:", error);
      alert(error.response?.data?.message || "Tạo hội viên thất bại");
    }
  }, [newMember, handleCloseCreateModal, loadMembers]);

  const handleDeleteMember = useCallback(async (id, username) => {
    if (!window.confirm(`Xác nhận xóa hội viên "${username}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      await ownerMemberService.deleteMember(id);
      alert("Đã xóa hội viên thành công!");
      loadMembers(1);
    } catch (error) {
      console.error("Lỗi khi xóa hội viên:", error);
      alert(error.response?.data?.message || "Xóa hội viên thất bại");
    }
  }, [loadMembers]);

  const handleRemoveMemberPackages = useCallback(async (member) => {
    if (!member?.id) return;

    const activePackages = Array.isArray(member.PackageActivations)
      ? member.PackageActivations.length
      : 0;

    if (activePackages === 0) {
      alert("Hội viên hiện không có gói đang hoạt động.");
      return;
    }

    const memberName = member.User?.username || "hội viên";
    const confirmed = window.confirm(
      `Xác nhận xóa ${activePackages} gói đang hoạt động của "${memberName}"?`
    );

    if (!confirmed) return;

    try {
      await ownerMemberService.updateMember(member.id, { currentPackageId: null });
      alert("Đã xóa gói thành công. Bạn có thể xóa hội viên nếu không còn booking.");
      await loadMembers(pagination.page);
      await handleViewDetail(member.id);
    } catch (error) {
      console.error("Lỗi khi xóa gói của hội viên:", error);
      alert(error.response?.data?.message || "Xóa gói thất bại");
    }
  }, [handleViewDetail, loadMembers, pagination.page]);

  const handleOpenEditModal = useCallback((member) => {
    setEditMember({
      id: member.id,
      gymId: member.gymId || "",
      currentPackageId: member.currentPackageId || "",
      status: member.status || "active",
    });
    setShowEditModal(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditMember({ id: "", gymId: "", currentPackageId: "", status: "active" });
  }, []);

  const handleUpdateMember = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      await ownerMemberService.updateMember(editMember.id, {
        gymId: editMember.gymId,
        currentPackageId: editMember.currentPackageId === "" ? null : editMember.currentPackageId,
        status: editMember.status,
      });
      alert("Cập nhật hội viên thành công!");
      handleCloseEditModal();
      loadMembers(pagination.page);
    } catch (error) {
      console.error("Lỗi khi cập nhật hội viên:", error);
      alert(error.response?.data?.message || "Cập nhật hội viên thất bại");
    }
  }, [editMember, handleCloseEditModal, loadMembers, pagination.page]);

  const handleOpenRenewModal = useCallback(async (member) => {
    try {
      const detail = await ownerMemberService.getMemberDetail(member.id);
      const activeActivations = Array.isArray(detail?.data?.PackageActivations)
        ? detail.data.PackageActivations
        : [];
      const preselectedTrainerId =
        activeActivations.find((pa) => pa?.Transaction?.trainerId)?.Transaction?.trainerId || "";

      setRenewMember({
        id: member.id,
        name: member.User?.username || "N/A",
        gymId: member.gymId,
        packageId: member.currentPackageId || "",
        trainerId: preselectedTrainerId ? String(preselectedTrainerId) : "",
        currentPackageName: member.currentPackage?.name || "Chưa có gói",
        packageExpiryDate: member.packageExpiryDate,
        sessionsRemaining: member.sessionsRemaining,
      });
    } catch (error) {
      console.error("Lỗi khi tải PT hiện tại để gia hạn:", error);
      setRenewMember({
        id: member.id,
        name: member.User?.username || "N/A",
        gymId: member.gymId,
        packageId: member.currentPackageId || "",
        trainerId: "",
        currentPackageName: member.currentPackage?.name || "Chưa có gói",
        packageExpiryDate: member.packageExpiryDate,
        sessionsRemaining: member.sessionsRemaining,
      });
    }

    setShowRenewModal(true);
  }, []);

  const handleCloseRenewModal = useCallback(() => {
    setShowRenewModal(false);
    setRenewMember({ id: "", name: "", gymId: "", packageId: "", trainerId: "", currentPackageName: "", packageExpiryDate: null, sessionsRemaining: 0 });
  }, []);

  const handleRenewPackage = useCallback(async (e) => {
    e.preventDefault();
    
    if (!renewMember.packageId) {
      alert("Vui lòng chọn gói cần gia hạn");
      return;
    }

    if (!renewMember.trainerId) {
      alert("Vui lòng chọn huấn luyện viên");
      return;
    }

    try {
      const result = await ownerMemberService.renewMemberPackage(
        renewMember.id,
        renewMember.packageId,
        renewMember.trainerId
      );
      alert(result.message || "Gia hạn gói thành công!");
      handleCloseRenewModal();
      loadMembers(pagination.page);
    } catch (error) {
      console.error("Lỗi khi gia hạn gói:", error);
      alert(error.response?.data?.message || "Gia hạn gói thất bại");
    }
  }, [renewMember, handleCloseRenewModal, loadMembers, pagination.page]);

  const handleToggleMemberStatus = useCallback(async (member) => {
    const isActivating = member.status !== "active";
    const action = isActivating ? "hoạt động" : "ngừng hoạt động";

    // Only check for active package if deactivating
    if (!isActivating) {
      // The backend will check, but we can show a warning
      if (member.currentPackage?.name && member.packageExpiryDate) {
        const expiryDate = new Date(member.packageExpiryDate);
        const today = new Date();
        if (expiryDate >= today) {
          if (!window.confirm(`Hội viên này đang có gói tập "${member.currentPackage.name}" còn hạn đến ${expiryDate.toLocaleDateString('vi-VN')}. Bạn có chắc muốn ${action}?`)) {
            return;
          }
        }
      }
    }

    if (!window.confirm(`Bạn có chắc muốn ${action} hội viên "${member.User?.username}"?`)) {
      return;
    }

    try {
      const response = await ownerMemberService.toggleMemberStatus(member.id);
      alert(response.message || `Đã ${action} hội viên thành công!`);
      
      // Close detail modal if open
      if (showModal) {
        handleCloseModal();
      }
      
      // Reload members to update status
      await loadMembers(pagination.page);
    } catch (error) {
      console.error(`Lỗi khi ${action} hội viên:`, error);
      alert(error.response?.data?.message || `Lỗi khi ${action} hội viên`);
    }
  }, [showModal, handleCloseModal, loadMembers, pagination.page]);

  const getStatusText = (status) => {
    const statusMap = {
      active: "Đang hoạt động",
      inactive: "Không hoạt động",
      pending: "Chờ duyệt",
    };
    return statusMap[status] || status;
  };

  return (
    <div className="owner-members-page">
      <div className="page-header">
        <h1 className="page-title">Quản lý hội viên</h1>
        <button onClick={handleOpenCreateModal} className="btn-add">
          + Thêm hội viên
        </button>
      </div>

      <div className="members-search-filters">
        <input
          type="text"
          placeholder="Tìm theo tên, email, số điện thoại..."
          value={filters.q}
          onChange={(e) => {
            setFilters({ ...filters, q: e.target.value });
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="search-input"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Ngừng hoạt động</option>
          <option value="pending">Chờ duyệt</option>
        </select>
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

      <div className="members-table-wrapper">
        <table className="members-table">
          <thead>
            <tr>
              <th>Mã thành viên</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Điện thoại</th>
              <th>Phòng gym</th>
              <th>Gói tập</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {members.length > 0 ? (
              members.map((member) => (
                <tr key={member.id}>
                  <td>{member.membershipNumber || "N/A"}</td>
                  <td>{member.User?.username || "N/A"}</td>
                  <td>{member.User?.email || "N/A"}</td>
                  <td>{member.User?.phone || "N/A"}</td>
                  <td>{member.Gym?.name || "N/A"}</td>
                  <td>{member.currentPackage?.name || "N/A"}</td>
                  <td>
                    <span className={`status-badge status-${member.status}`}>
                      {getStatusText(member.status)}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleViewDetail(member.id)} className="btn-view">
                      Chi tiết
                    </button>
                    <button onClick={() => handleOpenRenewModal(member)} className="btn-renew">
                      Gia hạn
                    </button>
                    <button onClick={() => handleOpenEditModal(member)} className="btn-edit">
                      Sửa
                    </button>
                    <button 
                      onClick={() => handleToggleMemberStatus(member)} 
                      className="btn-toggle-status"
                    >
                      {member.status === "active" ? "Ngừng HĐ" : "Kích hoạt"}
                    </button>
                    <button 
                      onClick={() => handleDeleteMember(member.id, member.User?.username)} 
                      className="btn-delete"
                      title="Xóa hội viên"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-members">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          disabled={pagination.page === 1}
          onClick={() => loadMembers(pagination.page - 1)}
          className="pagination-btn"
        >
          Trước
        </button>
        <span className="pagination-info">
          Trang {pagination.page} / {pagination.totalPages || 1}
        </span>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => loadMembers(pagination.page + 1)}
          className="pagination-btn"
        >
          Sau
        </button>
      </div>

      {showModal && selectedMember && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết hội viên</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="renew-member-info">
                <div className="info-card">
                  <div className="info-label">Mã thành viên:</div>
                  <div className="info-value">{selectedMember.membershipNumber || "N/A"}</div>
                </div>
                
                <div className="info-card">
                  <div className="info-label">Tên đăng nhập:</div>
                  <div className="info-value">{selectedMember.User?.username || "N/A"}</div>
                </div>
                
                <div className="info-card">
                  <div className="info-label">Email:</div>
                  <div className="info-value">{selectedMember.User?.email || "N/A"}</div>
                </div>
                
                <div className="info-card">
                  <div className="info-label">Điện thoại:</div>
                  <div className="info-value">{selectedMember.User?.phone || "N/A"}</div>
                </div>
                
                <div className="info-card">
                  <div className="info-label">Phòng tập:</div>
                  <div className="info-value">{selectedMember.Gym?.name || "N/A"}</div>
                </div>
                
                <div className="info-card">
                  <div className="info-label">Gói tập hiện tại:</div>
                  <div className="info-value">
                    {selectedMember.currentPackage ? (
                      <div>
                        <div style={{fontWeight: 'bold', color: '#eef2ff'}}>{selectedMember.currentPackage.name}</div>
                        <div style={{fontSize: '0.85rem', color: 'rgba(238, 242, 255, 0.7)', marginTop: '4px'}}>
                          Loại: {selectedMember.currentPackage.type === 'premium' ? 'Cao cấp' : 'Cơ bản'}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'rgba(238, 242, 255, 0.5)' }}>Chưa có gói</span>
                    )}
                  </div>
                </div>

                {selectedMember.PackageActivations && selectedMember.PackageActivations.length > 0 && (
                  <div className="info-card" style={{gridColumn: '1 / -1'}}>
                    <div className="info-label" style={{marginBottom: '12px'}}>
                      Danh sách gói đang hoạt động ({selectedMember.PackageActivations.length} gói)
                    </div>
                    <div style={{display: 'grid', gap: '10px'}}>
                      {selectedMember.PackageActivations.map((pa, idx) => {
                        const packageInfo = pa.Package;
                        return (
                          <div key={idx} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '14px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            display: 'grid',
                            gap: '6px'
                          }}>
                            <div style={{fontWeight: 'bold', color: '#eef2ff'}}>
                              {packageInfo?.name || 'Gói không xác định'}
                            </div>
                            <div style={{fontSize: '0.85rem', color: 'rgba(238, 242, 255, 0.75)'}}>
                              Hết hạn: {pa.expiryDate ? new Date(pa.expiryDate).toLocaleDateString('vi-VN') : 'Không có'}
                            </div>
                            <div style={{fontSize: '0.85rem', color: 'rgba(238, 242, 255, 0.75)'}}>
                              Buổi còn lại: {pa.sessionsRemaining ?? 0}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="info-card highlight">
                  <div className="info-label">Trạng thái:</div>
                  <div className="info-value">
                    <span className={`status-badge status-${selectedMember.status}`}>
                      {getStatusText(selectedMember.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleCloseModal} className="btn-cancel">
                Đóng
              </button>
              <button
                onClick={() => handleRemoveMemberPackages(selectedMember)}
                className="btn-modal-remove-package"
                disabled={!selectedMember.PackageActivations || selectedMember.PackageActivations.length === 0}
                title={
                  !selectedMember.PackageActivations || selectedMember.PackageActivations.length === 0
                    ? "Hội viên không có gói active để xóa"
                    : "Xóa toàn bộ gói active của hội viên"
                }
              >
                Xóa gói đang hoạt động
              </button>
              <button 
                onClick={() => {
                  handleCloseModal();
                  handleDeleteMember(selectedMember.id, selectedMember.User?.username);
                }} 
                className="btn-modal-delete"
              >
                Xóa hội viên
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseCreateModal}>
          <div className="modal-content modal-create" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Thêm hội viên mới</h2>
              <button className="modal-close" onClick={handleCloseCreateModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateMember} className="modal-form">
              <div className="form-group">
                <label>Chọn người dùng *</label>
                <select
                  value={newMember.targetUserId}
                  onChange={(e) => setNewMember({ ...newMember, targetUserId: e.target.value })}
                  required
                  className="form-select"
                >
                  <option value="">-- Chọn user --</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Chọn phòng tập *</label>
                <select
                  value={newMember.gymId}
                  onChange={(e) => setNewMember({ ...newMember, gymId: e.target.value, trainerId: "" })}
                  required
                  className="form-select"
                >
                  <option value="">-- Chọn phòng tập --</option>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Gói tập (tùy chọn)</label>
                <select
                  value={newMember.packageId}
                  onChange={(e) => setNewMember({ ...newMember, packageId: e.target.value })}
                  className="form-select"
                >
                  <option value="">-- Chọn gói tập (hoặc để trống) --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - {Number(pkg.price).toLocaleString()}đ
                    </option>
                  ))}
                </select>
                <small style={{ color: "#d1d5db", marginTop: "5px", display: "block" }}>
                  (Có thể chọn gói ngay hoặc cập nhật sau)
                </small>
              </div>

              <div className="form-group">
                <label>Huấn luyện viên {newMember.packageId ? "*" : "(tùy chọn)"}</label>
                <select
                  value={newMember.trainerId}
                  onChange={(e) => setNewMember({ ...newMember, trainerId: e.target.value })}
                  className="form-select"
                  disabled={!newMember.gymId}
                >
                  <option value="">{newMember.gymId ? "-- Chọn huấn luyện viên --" : "-- Chọn phòng tập trước --"}</option>
                  {trainers
                    .filter((t) => Number(t.gymId || t.Gym?.id) === Number(newMember.gymId) && t.isActive !== false)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.User?.username || `PT #${t.id}`}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-actions">
                <button type="button" onClick={handleCloseCreateModal} className="btn-cancel">
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  Tạo hội viên
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content modal-edit" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chỉnh sửa hội viên</h2>
              <button className="modal-close" onClick={handleCloseEditModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateMember} className="modal-form">
              <div className="form-group">
                <label>Chọn phòng tập *</label>
                <select
                  value={editMember.gymId}
                  onChange={(e) => setEditMember({ ...editMember, gymId: e.target.value })}
                  required
                  className="form-select"
                >
                  <option value="">-- Chọn phòng tập --</option>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Gói tập hiện tại</label>
                <select
                  value={editMember.currentPackageId}
                  onChange={(e) => setEditMember({ ...editMember, currentPackageId: e.target.value })}
                  className="form-select"
                >
                  <option value="">-- Không có gói --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - {Number(pkg.price).toLocaleString()}đ
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  value={editMember.status}
                  onChange={(e) => setEditMember({ ...editMember, status: e.target.value })}
                  className="form-select"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Không hoạt hoạt động</option>
                  <option value="pending">Chờ duyệt</option>
                </select>
              </div>
              
              <div className="renew-note">
                <div className="note-icon">ℹ️</div>
                <div className="note-text">
                  <strong>Lưu ý:</strong> Thay đổi phòng tập hoặc gói tập sẽ ảnh hưởng đến thông tin hiện tại của hội viên.
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCloseEditModal} className="btn-cancel">
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  Cập nhật
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showRenewModal && (
        <div className="modal-overlay" onClick={handleCloseRenewModal}>
          <div className="modal-content modal-renew" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Gia hạn gói cho hội viên</h2>
              <button className="modal-close" onClick={handleCloseRenewModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="renew-member-info">
              <div className="info-card">
                <div className="info-label">Hội viên:</div>
                <div className="info-value">{renewMember.name}</div>
              </div>
              
              <div className="info-card">
                <div className="info-label">Gói hiện tại:</div>
                <div className="info-value">
                  {renewMember.currentPackageName || <span style={{ color: 'rgba(238, 242, 255, 0.5)' }}>Chưa có gói</span>}
                </div>
              </div>

              <div className="info-card">
                <div className="info-label">Ngày hết hạn:</div>
                <div className="info-value">
                  {renewMember.packageExpiryDate ? (
                    <>
                      {new Date(renewMember.packageExpiryDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric'
                      })}
                    </>
                  ) : (
                    <span style={{ color: 'rgba(238, 242, 255, 0.5)' }}>Chưa có gói</span>
                  )}
                </div>
              </div>
              
              {renewMember.packageExpiryDate && (
                <>
                  <div className="info-card highlight">
                    <div className="info-label">Thời gian còn lại:</div>
                    <div className="info-value">
                      {(() => {
                        const now = new Date();
                        const expiry = new Date(renewMember.packageExpiryDate);
                        const diffTime = expiry - now;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays < 0) {
                          return <span style={{ color: '#ff5555', fontWeight: 900 }}> Đã hết hạn {Math.abs(diffDays)} ngày</span>;
                        } else if (diffDays === 0) {
                          return <span style={{ color: '#ffb000', fontWeight: 900 }}> Hết hạn hôm nay</span>;
                        } else if (diffDays <= 7) {
                          return <span style={{ color: '#ffb000', fontWeight: 900 }}> Còn {diffDays} ngày</span>;
                        } else {
                          return <span style={{ color: '#00ffaa', fontWeight: 900 }}> Còn {diffDays} ngày</span>;
                        }
                      })()}
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-label">Buổi tập còn lại:</div>
                    <div className="info-value">
                      {renewMember.sessionsRemaining || 0} buổi
                    </div>
                  </div>
                </>
              )}
            </div>

            <form onSubmit={handleRenewPackage} className="modal-form">
              <div className="form-group">
                <label>Chọn gói cần mua/gia hạn *</label>
                <select
                  value={renewMember.packageId}
                  onChange={(e) => setRenewMember({ ...renewMember, packageId: e.target.value })}
                  required
                  className="form-select"
                >
                  <option value="">-- Chọn gói --</option>
                  {packages
                    .filter(pkg => 
                      Number(pkg.gymId) === Number(renewMember.gymId) &&
                      pkg.status === 'ACTIVE'
                    )
                    .map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - {Number(pkg.price).toLocaleString()}đ ({pkg.sessions || 0} buổi)
                      </option>
                    ))}
                </select>
                <small style={{ color: 'rgba(238, 242, 255, 0.6)', marginTop: '8px', display: 'block' }}>
                  Chỉ hiển thị gói đang hoạt động của phòng gym này.
                </small>
              </div>

              <div className="form-group">
                <label>Chọn huấn luyện viên *</label>
                <select
                  value={renewMember.trainerId}
                  onChange={(e) => setRenewMember({ ...renewMember, trainerId: e.target.value })}
                  required
                  className="form-select"
                >
                  <option value="">-- Chọn huấn luyện viên --</option>
                  {trainers
                    .filter((t) => Number(t.gymId || t.Gym?.id) === Number(renewMember.gymId) && t.isActive !== false)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.User?.username || `PT #${t.id}`}
                      </option>
                    ))}
                </select>
              </div>
              
              <div className="renew-note">
                <div className="note-icon">ℹ️</div>
                <div className="note-text">
                  <strong>Lưu ý:</strong>
                  <ul>
                    <li>Gia hạn gói khác sẽ kết thúc gói đang hoạt động và kích hoạt gói mới ngay lập tức.</li>
                    <li>Thanh toán bằng tiền mặt sẽ được kích hoạt ngay lập tức</li>
                  </ul>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCloseRenewModal} className="btn-cancel">
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  Xác nhận gia hạn
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

export default OwnerMembersPage;
