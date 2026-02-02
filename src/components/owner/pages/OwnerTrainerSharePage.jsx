import React, { useEffect, useState } from "react";
import "./OwnerTrainerSharePage.css";
import {
  ownerGetMyTrainerShares,
  ownerCreateTrainerShare,
  ownerUpdateTrainerShare,
  ownerDeleteTrainerShare,
} from "../../../services/ownerTrainerShareService";
import ownerBookingService from "../../../services/ownerBookingService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import ownerMemberService from "../../../services/ownerMemberService";
import ownerTrainerService from "../../../services/ownerTrainerService";
import { ownerGetPackages } from "../../../services/ownerPackageService";
import axios from "../../../setup/axios";

const STATUS_LABELS = {
  // Trainer Share statuses
  pending: { label: "Chờ duyệt", color: "warning" },
  approved: { label: "Đã duyệt", color: "success" },
  rejected: { label: "Từ chối", color: "danger" },
  
  // Booking statuses
  confirmed: { label: "Đã xác nhận", color: "info" },
  in_progress: { label: "Đang diễn ra", color: "warning" },
  completed: { label: "Hoàn thành", color: "success" },
  cancelled: { label: "Đã hủy", color: "danger" },
  no_show: { label: "Vắng mặt", color: "danger" },
};

function StatusBadge({ status }) {
  const info = STATUS_LABELS[status] || { label: status, color: "secondary" };
  return <span className={`ots-badge ots-badge--${info.color}`}>{info.label}</span>;
}

function Field({ label, required, hint, children }) {
  return (
    <div className="ots-field">
      <label className="ots-field__label">
        {label}
        {required && <span className="ots-required">*</span>}
      </label>
      {hint && <div className="ots-field__hint">{hint}</div>}
      <div className="ots-field__control">{children}</div>
    </div>
  );
}

// Component cho chọn ngày cụ thể
function SpecificDaysSchedule({ form, setForm }) {
  const specificSchedules = form.specificSchedules || [];
  
  const addSpecificDay = () => {
    setForm({
      ...form,
      specificSchedules: [...specificSchedules, { date: "", startTime: "", endTime: "" }]
    });
  };

  const removeSpecificDay = (index) => {
    const newSchedules = specificSchedules.filter((_, i) => i !== index);
    setForm({ ...form, specificSchedules: newSchedules });
  };

  const updateSpecificDay = (index, field, value) => {
    const newSchedules = [...specificSchedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setForm({ ...form, specificSchedules: newSchedules });
  };

  return (
    <div className="ots-specific-days">
      <div className="ots-specific-days-header">
        <span>Chọn các ngày và giờ cụ thể:</span>
        <button type="button" className="ots-btn ots-btn--sm ots-btn--primary" onClick={addSpecificDay}>
          + Thêm ngày
        </button>
      </div>
      {specificSchedules.length === 0 && (
        <p className="ots-empty-text">Chưa có ngày nào. Nhấn "Thêm ngày" để bắt đầu.</p>
      )}
      <div className="ots-specific-days-list">
        {specificSchedules.map((schedule, index) => (
          <div key={index} className="ots-specific-day-item">
            <div className="ots-specific-day-row">
              <input
                type="date"
                className="ots-input"
                value={schedule.date}
                onChange={(e) => updateSpecificDay(index, 'date', e.target.value)}
                min={form.startDate}
                max={form.endDate || undefined}
                required
              />
              <input
                type="time"
                className="ots-input"
                value={schedule.startTime}
                onChange={(e) => updateSpecificDay(index, 'startTime', e.target.value)}
                placeholder="Giờ bắt đầu"
                required
              />
              <input
                type="time"
                className="ots-input"
                value={schedule.endTime}
                onChange={(e) => updateSpecificDay(index, 'endTime', e.target.value)}
                placeholder="Giờ kết thúc"
                required
              />
              <button
                type="button"
                className="ots-btn ots-btn--sm ots-btn--danger"
                onClick={() => removeSpecificDay(index)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Component cho chọn theo thứ trong tuần
function WeekdaysSchedule({ form, setForm }) {
  const weekdaySchedules = form.weekdaySchedules || {};
  
  const weekdays = [
    { key: 'monday', label: 'Thứ 2' },
    { key: 'tuesday', label: 'Thứ 3' },
    { key: 'wednesday', label: 'Thứ 4' },
    { key: 'thursday', label: 'Thứ 5' },
    { key: 'friday', label: 'Thứ 6' },
    { key: 'saturday', label: 'Thứ 7' },
    { key: 'sunday', label: 'Chủ nhật' },
  ];

  const toggleWeekday = (key) => {
    const newSchedules = { ...weekdaySchedules };
    if (newSchedules[key]) {
      delete newSchedules[key];
    } else {
      newSchedules[key] = { startTime: "", endTime: "" };
    }
    setForm({ ...form, weekdaySchedules: newSchedules });
  };

  const updateWeekday = (key, field, value) => {
    const newSchedules = {
      ...weekdaySchedules,
      [key]: { ...weekdaySchedules[key], [field]: value }
    };
    setForm({ ...form, weekdaySchedules: newSchedules });
  };

  return (
    <div className="ots-weekdays">
      <p className="ots-weekdays-hint">Chọn các ngày trong tuần và giờ làm việc:</p>
      <div className="ots-weekdays-list">
        {weekdays.map(({ key, label }) => {
          const isSelected = !!weekdaySchedules[key];
          return (
            <div key={key} className="ots-weekday-item">
              <label className="ots-weekday-checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleWeekday(key)}
                />
                <span className="ots-weekday-label">{label}</span>
              </label>
              {isSelected && (
                <div className="ots-weekday-times">
                  <input
                    type="time"
                    className="ots-input ots-input--sm"
                    value={weekdaySchedules[key].startTime}
                    onChange={(e) => updateWeekday(key, 'startTime', e.target.value)}
                    placeholder="Từ"
                    required
                  />
                  <span className="ots-time-separator">-</span>
                  <input
                    type="time"
                    className="ots-input ots-input--sm"
                    value={weekdaySchedules[key].endTime}
                    onChange={(e) => updateWeekday(key, 'endTime', e.target.value)}
                    placeholder="Đến"
                    required
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const INITIAL_FORM = {
  trainerId: "",
  fromGymId: "",
  toGymId: "",
  shareType: "temporary",
  scheduleMode: "all_days", // all_days, specific_days, weekdays
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  specificSchedules: [], // [{date: "2026-01-01", startTime: "09:00", endTime: "10:00"}]
  weekdaySchedules: {}, // {monday: {startTime: "09:00", endTime: "10:00"}, ...}
  commissionSplit: 0.7,
  notes: "",
};

const INITIAL_BOOKING = {
  memberId: "",
  trainerId: "",
  gymId: "",
  packageId: "",
  bookingDate: "",
  startTime: "",
  endTime: "",
  notes: "",
};

export default function OwnerTrainerSharePage() {
  const [activeTab, setActiveTab] = useState("bookings"); // bookings or shares
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Trainer Shares
  const [shares, setShares] = useState([]);
  const [pagination, setPagination] = useState({});

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [bookingPagination, setBookingPagination] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [bookingForm, setBookingForm] = useState({ ...INITIAL_BOOKING });
  
  // Trainer schedule for bookings
  const [trainerSchedule, setTrainerSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Trainer schedule for shares
  const [shareTrainerSchedule, setShareTrainerSchedule] = useState([]);
  const [loadingShareSchedule, setLoadingShareSchedule] = useState(false);

  const [filters, setFilters] = useState({ q: "", status: "" });
  const [bookingFilters, setBookingFilters] = useState({ q: "", status: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [bookingCurrentPage, setBookingCurrentPage] = useState(1);

  // Lookups
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [members, setMembers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Filter trainers by selected fromGym (for share form)
  const availableTrainers = React.useMemo(() => {
    if (!form.fromGymId) return [];
    // Trainers đã được load theo gymId từ API, chỉ cần return trainers
    return trainers;
  }, [trainers, form.fromGymId]);

  // Filter trainers by selected gym (for booking form)
  const bookingAvailableTrainers = React.useMemo(() => {
    if (!bookingForm.gymId) return [];
    // Chỉ hiển thị PT thuộc gym được chọn
    // Trainer có thể có gymId hoặc Gym.id
    const filtered = trainers.filter(t => {
      const trainerGymId = t.gymId || t.Gym?.id;
      return trainerGymId && trainerGymId.toString() === bookingForm.gymId.toString();
    });
    return filtered;
  }, [trainers, bookingForm.gymId]);

  // Load trainers khi chọn fromGym (for share form)
  useEffect(() => {
    if (form.fromGymId) {
      const loadTrainersForGym = async () => {
        try {
          const res = await axios.get(`/api/owner/trainer-shares/available-trainers/${form.fromGymId}`);
          setTrainers(res.data?.trainers || []);
        } catch (err) {
          console.error("Failed to load trainers for gym:", err);
        }
      };
      loadTrainersForGym();
    } else {
      // Reset về tất cả trainers nếu không chọn gym
      loadLookups();
    }
  }, [form.fromGymId]);

  // Load trainer schedule khi chọn trainer và ngày
  useEffect(() => {
    const loadSchedule = async () => {
      if (bookingForm.trainerId && bookingForm.bookingDate) {
        setLoadingSchedule(true);
        try {
          const res = await ownerBookingService.getTrainerSchedule(
            bookingForm.trainerId,
            bookingForm.bookingDate
          );
          setTrainerSchedule(res.data || []);
        } catch (err) {
          console.error("Failed to load trainer schedule:", err);
          setTrainerSchedule([]);
        } finally {
          setLoadingSchedule(false);
        }
      } else {
        setTrainerSchedule([]);
      }
    };
    loadSchedule();
  }, [bookingForm.trainerId, bookingForm.bookingDate]);

  // Load trainer schedule cho share form
  useEffect(() => {
    const loadShareSchedule = async () => {
      if (form.trainerId && form.startDate) {
        setLoadingShareSchedule(true);
        try {
          // Tính toán các ngày cần load
          const startDate = new Date(form.startDate);
          const endDate = form.endDate ? new Date(form.endDate) : new Date(form.startDate);
          
          // Load schedule cho tất cả các ngày trong khoảng
          const schedulePromises = [];
          const currentDate = new Date(startDate);
          
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            schedulePromises.push(
              ownerBookingService.getTrainerSchedule(form.trainerId, dateStr)
                .then(res => ({ date: dateStr, bookings: res.data || [] }))
                .catch(() => ({ date: dateStr, bookings: [] }))
            );
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          const allSchedules = await Promise.all(schedulePromises);
          setShareTrainerSchedule(allSchedules);
        } catch (err) {
          console.error("Failed to load share trainer schedule:", err);
          setShareTrainerSchedule([]);
        } finally {
          setLoadingShareSchedule(false);
        }
      } else {
        setShareTrainerSchedule([]);
      }
    };
    loadShareSchedule();
  }, [form.trainerId, form.startDate, form.endDate]);

  // Load lookups (gyms, trainers, members, packages)
  const loadLookups = async () => {
    setLoadingLookups(true);
    try {
      const [gymsRes, trainersRes, membersRes, packagesRes] = await Promise.all([
        ownerGetMyGyms(),
        ownerTrainerService.getMyTrainers({ limit: 1000 }), // Lấy tất cả trainers của owner
        ownerMemberService.getMyMembers({ limit: 1000 }),
        ownerGetPackages(),
      ]);
      setGyms(gymsRes?.data?.data || []);
      setTrainers(trainersRes?.data || []);
      setMembers(membersRes?.data || []);
      setPackages(packagesRes?.data?.data || []);
    } catch (err) {
      console.error("Failed to load lookups:", err);
    } finally {
      setLoadingLookups(false);
    }
  };

  // Load trainer shares
  const loadShares = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { ...filters, page: currentPage, limit: 10 };

      console.log('Loading trainer shares with params:', params);
      const res = await ownerGetMyTrainerShares(params);
      console.log('Trainer shares response:', res);
      
      setShares(res.data?.data || []);
      setPagination(res.data?.pagination || {});
    } catch (err) {
      console.error('Error loading trainer shares:', err);
      setError(err.response?.data?.message || err.message || "Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  };

  // Load bookings
  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { ...bookingFilters, page: bookingCurrentPage, limit: 5 };

      const res = await ownerBookingService.getMyBookings(params);
      setBookings(res.data || res.data?.data || []);
      setBookingPagination(res.pagination || res.data?.pagination || {});
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError(err.response?.data?.message || err.message || "Không thể tải danh sách booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    if (activeTab === "shares") {
      loadShares();
    } else if (activeTab === "bookings") {
      loadBookings();
    }
    // eslint-disable-next-line
  }, [currentPage, bookingCurrentPage, activeTab]);

  // Mở modal tạo mới share
  const handleCreate = () => {
    setEditing(null);
    setForm({ ...INITIAL_FORM });
    setShowModal(true);
  };

  // Mở modal tạo mới booking
  const handleCreateBooking = () => {
    setEditing(null);
    setBookingForm({ ...INITIAL_BOOKING });
    setShowBookingModal(true);
  };

  // Mở modal sửa booking
  const handleEditBooking = async (booking) => {
    setEditing(booking);
    setBookingForm({
      memberId: booking.memberId || "",
      trainerId: booking.trainerId || "",
      gymId: booking.gymId || "",
      packageId: booking.packageActivationId || "",
      bookingDate: booking.bookingDate ? booking.bookingDate.slice(0, 10) : "",
      startTime: booking.startTime || "",
      endTime: booking.endTime || "",
      notes: booking.notes || "",
    });
    setShowBookingModal(true);
  };

  // Mở modal sửa
  const handleEdit = (share) => {
    setEditing(share);
    setForm({
      ...INITIAL_FORM,
      trainerId: share.trainerId || "",
      fromGymId: share.fromGymId || "",
      toGymId: share.toGymId || "",
      shareType: share.shareType || "temporary",
      startDate: share.startDate ? share.startDate.slice(0, 10) : "",
      endDate: share.endDate ? share.endDate.slice(0, 10) : "",
      startTime: share.startTime || "",
      endTime: share.endTime || "",
      commissionSplit: share.commissionSplit || 0.7,
      notes: share.notes || "",
      scheduleMode: share.scheduleMode || "all_days",
      specificSchedules: share.specificSchedules || [],
      weekdaySchedules: share.weekdaySchedules || {},
    });
    setShowModal(true);
  };

  // Submit booking form
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (editing) {
        await ownerBookingService.updateBooking(editing.id, bookingForm);
        setSuccess("Cập nhật booking thành công!");
      } else {
        await ownerBookingService.createBooking(bookingForm);
        setSuccess("Đặt lịch tập thành công!");
      }

      setShowBookingModal(false);
      loadBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleUpdateBookingStatus = async (id, newStatus) => {
    const statusTexts = {
      confirmed: "xác nhận",
      in_progress: "bắt đầu",
      completed: "hoàn thành",
      cancelled: "hủy",
      no_show: "đánh dấu vắng mặt",
    };

    const confirmText = `Bạn có chắc muốn ${statusTexts[newStatus]} booking này?`;
    if (!window.confirm(confirmText)) return;

    try {
      setError("");
      setSuccess("");
      await ownerBookingService.updateBookingStatus(id, newStatus);
      setSuccess(`Đã cập nhật trạng thái thành công`);
      loadBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể cập nhật trạng thái");
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate based on schedule mode
    if (form.scheduleMode === "all_days") {
      if (!form.startTime || !form.endTime) {
        setError("Vui lòng nhập giờ bắt đầu và kết thúc");
        return;
      }
      // Validate time conflict cho all_days mode
      if (shareTrainerSchedule.length > 0) {
        const hasConflict = shareTrainerSchedule.some((daySchedule) => {
          return daySchedule.bookings.some((s) => {
            return form.startTime < s.endTime && form.endTime > s.startTime;
          });
        });

        if (hasConflict) {
          setError("❌ Trainer đã có lịch trong khoảng thời gian này! Vui lòng chọn khung giờ khác.");
          return;
        }
      }
    } else if (form.scheduleMode === "specific_days") {
      const specificSchedules = form.specificSchedules || [];
      if (specificSchedules.length === 0) {
        setError("Vui lòng thêm ít nhất một ngày cụ thể");
        return;
      }
      // Validate each specific day has all required fields
      const hasInvalid = specificSchedules.some(s => !s.date || !s.startTime || !s.endTime);
      if (hasInvalid) {
        setError("Vui lòng điền đầy đủ ngày và giờ cho tất cả các mục");
        return;
      }
    } else if (form.scheduleMode === "weekdays") {
      const weekdaySchedules = form.weekdaySchedules || {};
      const selectedDays = Object.keys(weekdaySchedules);
      if (selectedDays.length === 0) {
        setError("Vui lòng chọn ít nhất một ngày trong tuần");
        return;
      }
      // Validate each weekday has time
      const hasInvalid = selectedDays.some(day => {
        const schedule = weekdaySchedules[day];
        return !schedule.startTime || !schedule.endTime;
      });
      if (hasInvalid) {
        setError("Vui lòng điền giờ cho tất cả các ngày đã chọn");
        return;
      }
    }

    try {
      if (editing) {
        await ownerUpdateTrainerShare(editing.id, form);
        setSuccess("Cập nhật yêu cầu thành công!");
      } else {
        await ownerCreateTrainerShare(form);
        setSuccess("Tạo yêu cầu chia sẻ huấn luyện viên thành công!");
      }

      setShowModal(false);
      loadShares();
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // Xóa share
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa yêu cầu này?")) return;

    try {
      setError("");
      setSuccess("");
      await ownerDeleteTrainerShare(id);
      setSuccess("Đã xóa yêu cầu");
      loadShares();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa");
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className="ots-page">
      <div className="ots-header">
        <h1 className="ots-title">Quản lý lịch tập & Chia sẻ huấn luyện viên</h1>
        <button 
          className="ots-btn ots-btn--primary" 
          onClick={activeTab === "bookings" ? handleCreateBooking : handleCreate}
        >
          + {activeTab === "bookings" ? "Đặt lịch mới" : "Tạo yêu cầu mới"}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="ots-tabs">
        <button
          className={`ots-tab ${activeTab === "bookings" ? "active" : ""}`}
          onClick={() => setActiveTab("bookings")}
        >
          📅 Đặt lịch tập
        </button>
        <button
          className={`ots-tab ${activeTab === "shares" ? "active" : ""}`}
          onClick={() => setActiveTab("shares")}
        >
          🤝 Chia sẻ Huấn luyện viên
        </button>
      </div>

      {error && <div className="ots-alert ots-alert--danger">{error}</div>}
      {success && <div className="ots-alert ots-alert--success">{success}</div>}

      {activeTab === "shares" && (
        <>
          {/* Filter */}
          <div className="ots-filters">
            <input
              placeholder="Tìm theo tên trainer..."
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
            <button className="btn-primary" onClick={() => { setCurrentPage(1); loadShares(); }}>
              Tìm
            </button>
          </div>

          {/* Shares Table */}
          {loading ? (
            <div className="ots-loading">Đang tải...</div>
          ) : error ? (
            <div className="ots-empty">
              <p style={{ color: '#ff5555' }}>Lỗi: {error}</p>
              <button className="ots-btn ots-btn--primary" onClick={loadShares}>
                Thử lại
              </button>
            </div>
          ) : shares.length === 0 ? (
            <div className="ots-empty">
              <p>Chưa có yêu cầu chia sẻ PT nào</p>
              <button className="ots-btn ots-btn--primary" onClick={handleCreate}>
                Tạo yêu cầu đầu tiên
              </button>
            </div>
          ) : (
            <>
              <table className="ots-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Trainer</th>
                    <th>Từ Gym</th>
                    <th>Đến Gym</th>
                    <th>Loại</th>
                    <th>Thời gian</th>
                    <th>Hoa hồng</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((share) => (
                    <tr key={share.id}>
                      <td>{share.id}</td>
                      <td><strong>{share.Trainer?.User?.username || "—"}</strong></td>
                      <td>{share.fromGym?.name || "—"}</td>
                      <td>{share.toGym?.name || "—"}</td>
                      <td>{share.shareType}</td>
                      <td>
                        {formatDate(share.startDate)} - {formatDate(share.endDate)}
                      </td>
                      <td>{(share.commissionSplit * 100).toFixed(0)}%</td>
                      <td>
                        <StatusBadge status={share.status} />
                      </td>
                      <td>
                        <div className="ots-actions">
                          {share.status === "pending" && (
                            <>
                              <button
                                className="ots-btn ots-btn--sm ots-btn--secondary"
                                onClick={() => handleEdit(share)}
                              >
                                Sửa
                              </button>
                              <button
                                className="ots-btn ots-btn--sm ots-btn--danger"
                                onClick={() => handleDelete(share.id)}
                              >
                                Xóa
                              </button>
                            </>
                          )}
                          {share.status === "approved" && (
                            <span className="ots-text--success">✓ Đã được duyệt</span>
                          )}
                          {share.status === "rejected" && (
                            <span className="ots-text--danger">✗ Đã từ chối</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="ots-pagination">
                  <button
                    className="ots-btn ots-btn--sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Trước
                  </button>
                  <span>
                    Trang {currentPage} / {pagination.totalPages}
                  </span>
                  <button
                    className="ots-btn ots-btn--sm"
                    disabled={currentPage === pagination.totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "bookings" && (
        <>
          {/* Filter */}
          <div className="ots-filters">
            <input
              placeholder="Tìm theo tên member..."
              value={bookingFilters.q}
              onChange={(e) => setBookingFilters({ ...bookingFilters, q: e.target.value })}
            />
            <select
              value={bookingFilters.status}
              onChange={(e) => setBookingFilters({ ...bookingFilters, status: e.target.value })}
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="in_progress">Đang diễn ra</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
              <option value="no_show">Vắng mặt</option>
            </select>
            <button className="btn-primary" onClick={() => { setBookingCurrentPage(1); loadBookings(); }}>
              Tìm
            </button>
          </div>

          {/* Bookings Table */}
          {loading ? (
            <div className="ots-loading">Đang tải...</div>
          ) : error ? (
            <div className="ots-empty">
              <p style={{ color: '#ff5555' }}>Lỗi: {error}</p>
              <button className="ots-btn ots-btn--primary" onClick={loadBookings}>
                Thử lại
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="ots-empty">
              <p>Chưa có booking nào</p>
              <button className="ots-btn ots-btn--primary" onClick={handleCreateBooking}>
                Đặt lịch đầu tiên
              </button>
            </div>
          ) : (
            <>
              <table className="ots-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Member</th>
                    <th>PT</th>
                    <th>Gym</th>
                    <th>Ngày</th>
                    <th>Giờ</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.id}</td>
                      <td><strong>{booking.Member?.User?.username || "—"}</strong></td>
                      <td>{booking.Trainer?.User?.username || "—"}</td>
                      <td>{booking.Gym?.name || "—"}</td>
                      <td>{formatDate(booking.bookingDate)}</td>
                      <td>
                        {booking.startTime} - {booking.endTime}
                      </td>
                      <td>
                        <StatusBadge status={booking.status} />
                      </td>
                      <td>
                        <div className="ots-actions">
                          {/* Status Update Dropdown */}
                          {booking.status !== "completed" && booking.status !== "cancelled" && booking.status !== "no_show" && (
                            <select
                              className="ots-select ots-select--sm"
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleUpdateBookingStatus(booking.id, e.target.value);
                                }
                              }}
                            >
                              <option value="">Cập nhật...</option>
                              {booking.status === "pending" && (
                                <>
                                  <option value="confirmed">✓ Xác nhận</option>
                                  <option value="cancelled">✕ Hủy</option>
                                </>
                              )}
                              {booking.status === "confirmed" && (
                                <>
                                  <option value="in_progress">▶ Bắt đầu</option>
                                  <option value="no_show">⊗ Vắng mặt</option>
                                  <option value="cancelled">✕ Hủy</option>
                                </>
                              )}
                              {booking.status === "in_progress" && (
                                <>
                                  <option value="completed">✔ Hoàn thành</option>
                                  <option value="cancelled">✕ Hủy</option>
                                </>
                              )}
                            </select>
                          )}
                          
                          {/* Edit/Cancel buttons */}
                          {(booking.status === "pending" || booking.status === "confirmed") && (
                            <>
                              <button
                                className="ots-btn ots-btn--sm ots-btn--secondary"
                                onClick={() => handleEditBooking(booking)}
                              >
                                Sửa
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {bookingPagination.totalPages > 1 && (
                <div className="ots-pagination">
                  <button
                    className="ots-btn ots-btn--sm"
                    disabled={bookingCurrentPage === 1}
                    onClick={() => setBookingCurrentPage(bookingCurrentPage - 1)}
                  >
                    Trước
                  </button>
                  <span>
                    Trang {bookingCurrentPage} / {bookingPagination.totalPages}
                  </span>
                  <button
                    className="ots-btn ots-btn--sm"
                    disabled={bookingCurrentPage === bookingPagination.totalPages}
                    onClick={() => setBookingCurrentPage(bookingCurrentPage + 1)}
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal Create/Edit Share */}
      {showModal && (
        <div className="ots-modal">
          <div className="ots-modal__backdrop" onClick={() => setShowModal(false)} />
          <div className="ots-modal__content">
            <div className="ots-modal__header">
              <h2>{editing ? "Sửa yêu cầu" : "Tạo yêu cầu chia sẻ PT"}</h2>
              <button className="ots-modal__close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ots-form">
              <Field label="Từ Gym" required>
                <select
                  className="ots-select"
                  value={form.fromGymId}
                  onChange={(e) => setForm({ ...form, fromGymId: e.target.value, trainerId: '' })}
                  required
                  disabled={loadingLookups}
                >
                  <option value="">-- Chọn Gym --</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.address || g.location || 'N/A'})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Trainer" required>
                <select
                  className="ots-select"
                  value={form.trainerId}
                  onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                  required
                  disabled={!form.fromGymId || loadingLookups}
                >
                  <option value="">
                    {!form.fromGymId ? "-- Chọn Gym trước --" : "-- Chọn Trainer --"}
                  </option>
                  {availableTrainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.User?.username || 'N/A'} {t.specialization ? `(${t.specialization})` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Đến Gym" required>
                <select
                  className="ots-select"
                  value={form.toGymId}
                  onChange={(e) => setForm({ ...form, toGymId: e.target.value })}
                  required
                  disabled={loadingLookups}
                >
                  <option value="">-- Chọn Gym --</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.address || g.location || 'N/A'})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Loại chia sẻ">
                <select
                  className="ots-select"
                  value={form.shareType}
                  onChange={(e) => setForm({ ...form, shareType: e.target.value })}
                >
                  <option value="temporary">Tạm thời</option>
                  <option value="permanent">Vĩnh viễn</option>
                </select>
              </Field>

              <div className="ots-row">
                <Field label="Ngày bắt đầu" required>
                  <input
                    type="date"
                    className="ots-input"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Ngày kết thúc">
                  <input
                    type="date"
                    className="ots-input"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Chọn lịch">
                <div className="ots-schedule-mode">
                  <label className="ots-radio-label">
                    <input
                      type="radio"
                      name="scheduleMode"
                      value="all_days"
                      checked={form.scheduleMode === "all_days"}
                      onChange={(e) => setForm({ ...form, scheduleMode: e.target.value })}
                    />
                    <span>📅 Tất cả các ngày (cùng giờ)</span>
                  </label>
                  <label className="ots-radio-label">
                    <input
                      type="radio"
                      name="scheduleMode"
                      value="specific_days"
                      checked={form.scheduleMode === "specific_days"}
                      onChange={(e) => setForm({ ...form, scheduleMode: e.target.value })}
                    />
                    <span>🎯 Chọn ngày cụ thể</span>
                  </label>
                  <label className="ots-radio-label">
                    <input
                      type="radio"
                      name="scheduleMode"
                      value="weekdays"
                      checked={form.scheduleMode === "weekdays"}
                      onChange={(e) => setForm({ ...form, scheduleMode: e.target.value })}
                    />
                    <span>🗓️ Theo thứ trong tuần</span>
                  </label>
                </div>
              </Field>

              {/* Mode: Tất cả các ngày */}
              {form.scheduleMode === "all_days" && (
                <div className="ots-row">
                  <Field label="Giờ bắt đầu" required>
                    <input
                      type="time"
                      className="ots-input"
                      value={form.startTime || ''}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      required
                    />
                  </Field>

                  <Field label="Giờ kết thúc" required>
                    <input
                      type="time"
                      className="ots-input"
                      value={form.endTime || ''}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      required
                    />
                  </Field>
                </div>
              )}

              {/* Mode: Chọn ngày cụ thể */}
              {form.scheduleMode === "specific_days" && (
                <SpecificDaysSchedule form={form} setForm={setForm} />
              )}

              {/* Mode: Theo thứ trong tuần */}
              {form.scheduleMode === "weekdays" && (
                <WeekdaysSchedule form={form} setForm={setForm} />
              )}

              {/* Hiển thị lịch trainer */}
              {form.trainerId && form.startDate && (
                <div className="ots-trainer-schedule">
                  <h4>📅 Lịch của Trainer {form.endDate && form.endDate !== form.startDate ? `(${formatDate(form.startDate)} - ${formatDate(form.endDate)})` : `ngày ${formatDate(form.startDate)}`}</h4>
                  {loadingShareSchedule ? (
                    <p className="ots-loading-text">Đang tải lịch...</p>
                  ) : shareTrainerSchedule.length === 0 ? (
                    <p className="ots-empty-text">✅ Trainer trống lịch trong khoảng thời gian này</p>
                  ) : (
                    <div className="ots-schedule-days">
                      {shareTrainerSchedule.map((daySchedule, dayIdx) => {
                        const hasBookings = daySchedule.bookings && daySchedule.bookings.length > 0;
                        
                        return (
                          <div key={dayIdx} className="ots-schedule-day">
                            <div className="ots-schedule-day-header">
                              <span className="ots-schedule-date">
                                {formatDate(daySchedule.date)}
                              </span>
                              {!hasBookings && (
                                <span className="ots-schedule-empty-badge">Trống lịch</span>
                              )}
                            </div>
                            
                            {hasBookings && (
                              <div className="ots-schedule-list">
                                {daySchedule.bookings.map((s, idx) => {
                                  const isConflict = form.startTime && form.endTime && 
                                    form.startTime < s.endTime && form.endTime > s.startTime;
                                  
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`ots-schedule-item ${isConflict ? 'ots-schedule-item--conflict' : ''}`}
                                    >
                                      <span className="ots-schedule-time">
                                        ⏰ {s.startTime} - {s.endTime}
                                      </span>
                                      <span className="ots-schedule-type">
                                        {s.type === 'booking' ? '🏋️ Booking' : 'Có lịch'}
                                      </span>
                                      {s.Member && (
                                        <span className="ots-schedule-member">
                                          với {s.Member.User?.username}
                                        </span>
                                      )}
                                      {isConflict && (
                                        <span className="ots-conflict-badge">⚠️ Xung đột!</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <Field label="Hoa hồng (%)" hint="Từ 0 đến 1 (vd: 0.7 = 70%)">
                <input
                  type="number"
                  className="ots-input"
                  value={form.commissionSplit}
                  onChange={(e) => setForm({ ...form, commissionSplit: e.target.value })}
                  min="0"
                  max="1"
                  step="0.01"
                />
              </Field>

              <Field label="Ghi chú">
                <textarea
                  className="ots-textarea"
                  rows="4"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ghi chú thêm về yêu cầu..."
                />
              </Field>

              <div className="ots-form__actions">
                <button
                  type="button"
                  className="ots-btn ots-btn--secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="ots-btn ots-btn--primary">
                  {editing ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Create/Edit Booking */}
      {showBookingModal && (
        <div className="ots-modal">
          <div className="ots-modal__backdrop" onClick={() => setShowBookingModal(false)} />
          <div className="ots-modal__content">
            <div className="ots-modal__header">
              <h2>{editing ? "Sửa booking" : "Đặt lịch tập mới"}</h2>
              <button className="ots-modal__close" onClick={() => setShowBookingModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="ots-form">
              <Field label="Gym" required>
                <select
                  className="ots-select"
                  value={bookingForm.gymId}
                  onChange={(e) => setBookingForm({ ...bookingForm, gymId: e.target.value, trainerId: '' })}
                  required
                  disabled={loadingLookups}
                >
                  <option value="">-- Chọn Gym --</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.address || g.location || "N/A"})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Member" required>
                <select
                  className="ots-select"
                  value={bookingForm.memberId}
                  onChange={(e) => setBookingForm({ ...bookingForm, memberId: e.target.value })}
                  required
                  disabled={loadingLookups}
                >
                  <option value="">-- Chọn Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.User?.username || "N/A"} - {m.User?.email || ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="PT (Trainer)" required>
                <select
                  className="ots-select"
                  value={bookingForm.trainerId}
                  onChange={(e) => setBookingForm({ ...bookingForm, trainerId: e.target.value })}
                  required
                  disabled={!bookingForm.gymId || loadingLookups}
                >
                  <option value="">
                    {!bookingForm.gymId ? "-- Chọn Gym trước --" : "-- Chọn Trainer --"}
                  </option>
                  {bookingAvailableTrainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.User?.username || "N/A"} {t.specialization ? `(${t.specialization})` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Gói tập">
                <select
                  className="ots-select"
                  value={bookingForm.packageId}
                  onChange={(e) => setBookingForm({ ...bookingForm, packageId: e.target.value })}
                  disabled={loadingLookups}
                >
                  <option value="">-- Chọn gói (nếu có) --</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.price?.toLocaleString()} VND
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Ngày tập" required>
                <input
                  type="date"
                  className="ots-input"
                  value={bookingForm.bookingDate}
                  onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                  required
                />
              </Field>

              {/* Hiển thị lịch đã book của trainer */}
              {bookingForm.trainerId && bookingForm.bookingDate && (
                <div className="ots-field">
                  <label className="ots-field__label">
                    Lịch đã đặt {loadingSchedule && "(đang tải...)"}
                  </label>
                  <div className="ots-schedule-info">
                    {loadingSchedule ? (
                      <p style={{ color: '#94a3b8', fontSize: '14px' }}>Đang kiểm tra lịch...</p>
                    ) : trainerSchedule.length === 0 ? (
                      <p style={{ color: '#5fffc0', fontSize: '14px' }}>✓ PT trống lịch trong ngày này</p>
                    ) : (
                      <div className="ots-schedule-list">
                        <p style={{ color: '#ffc107', fontSize: '14px', marginBottom: '8px' }}>
                          ⚠️ PT đã có {trainerSchedule.length} lịch:
                        </p>
                        {trainerSchedule.map((sch) => (
                          <div key={sch.id} className="ots-schedule-item">
                            <span className="ots-time">{sch.startTime} - {sch.endTime}</span>
                            <span className="ots-member">({sch.Member?.User?.username || "N/A"})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="ots-row">
                <Field label="Giờ bắt đầu" required>
                  <input
                    type="time"
                    className="ots-input"
                    value={bookingForm.startTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Giờ kết thúc" required>
                  <input
                    type="time"
                    className="ots-input"
                    value={bookingForm.endTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <Field label="Ghi chú">
                <textarea
                  className="ots-textarea"
                  rows="3"
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  placeholder="Ghi chú thêm..."
                />
              </Field>

              <div className="ots-form__actions">
                <button
                  type="button"
                  className="ots-btn ots-btn--secondary"
                  onClick={() => setShowBookingModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="ots-btn ots-btn--primary">
                  {editing ? "Cập nhật" : "Đặt lịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
