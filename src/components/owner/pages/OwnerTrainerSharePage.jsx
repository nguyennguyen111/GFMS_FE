import React, { useCallback, useEffect, useState } from "react";
import "./OwnerTrainerSharePage.css";
import {
  ownerGetMyTrainerShares,
  ownerGetReceivedTrainerShares,
  ownerAcceptTrainerShare,
  ownerRejectTrainerShare,
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
  waiting_acceptance: { label: "Chờ chấp nhận", color: "info" },
  pending: { label: "Chờ duyệt", color: "warning" },
  approved: { label: "Đã duyệt", color: "success" },
  rejected: { label: "Từ chối", color: "danger" },
  rejected_by_partner: { label: "Đối tác từ chối", color: "danger" },
  
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

// PT Package Info Component
function PTPackageInfo({ memberId, trainerId, onPackageSelect, selectedPackageActivationId }) {
  const [ptPackages, setPtPackages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPTPackages = async () => {
      if (!memberId || !trainerId) return;
      
      setLoading(true);
      try {
        const response = await ownerMemberService.getMemberDetail(memberId);
        const member = response.data;
        
        if (member && member.PackageActivations) {
          const filtered = member.PackageActivations.filter(pa => 
            pa.Package?.packageType === 'personal_training' &&
            pa.Package?.trainerId === parseInt(trainerId) &&
            pa.status === 'active' &&
            (pa.sessionsRemaining > 0 || pa.sessionsRemaining === null)
          );
          setPtPackages(filtered);
          
          // Auto-select first package if available
          if (filtered.length > 0 && !selectedPackageActivationId) {
            onPackageSelect(filtered[0].id, filtered[0].packageId);
          }
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadPTPackages();
  }, [memberId, trainerId, selectedPackageActivationId, onPackageSelect]); // Added selectedPackageActivationId to deps

  if (loading) {
    return <div className="ots-pt-package-info" style={{padding: '12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '10px', marginBottom: '12px'}}>
      <div style={{color: 'rgba(238, 242, 255, 0.7)'}}>Đang tải gói PT...</div>
    </div>;
  }

  if (ptPackages.length === 0) {
    return <div className="ots-pt-package-info" style={{padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', marginBottom: '12px'}}>
      <div style={{color: '#ef4444', fontWeight: 'bold'}}>⚠️ Member chưa có gói PT với trainer này</div>
      <div style={{fontSize: '0.85rem', color: 'rgba(238, 242, 255, 0.6)', marginTop: '4px'}}>
        Vui lòng mua gói PT cho member trước khi đặt lịch
      </div>
    </div>;
  }

  return (
    <div className="ots-pt-package-info" style={{marginBottom: '12px'}}>
      <label className="ots-field__label" style={{marginBottom: '8px', display: 'block'}}>
        Chọn gói PT <span className="ots-required">*</span>
      </label>
      {ptPackages.map((pa) => (
        <div 
          key={pa.id}
          onClick={() => onPackageSelect(pa.id, pa.packageId)}
          style={{
            padding: '12px',
            background: selectedPackageActivationId === pa.id 
              ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(139, 92, 246, 0.2) 100%)'
              : 'rgba(0, 0, 0, 0.3)',
            border: selectedPackageActivationId === pa.id
              ? '2px solid rgba(168, 85, 247, 0.6)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            marginBottom: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <div style={{fontWeight: 'bold', color: '#eef2ff', marginBottom: '4px'}}>
                {selectedPackageActivationId === pa.id && '✓ '}
                {pa.Package?.name || 'Gói PT'}
              </div>
              <div style={{fontSize: '0.85rem', color: 'rgba(238, 242, 255, 0.7)'}}>
                Tổng: {pa.totalSessions || 0} buổi | Đã tập: {pa.sessionsUsed || 0} buổi
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#c084fc'}}>
                {pa.sessionsRemaining ?? 0}
              </div>
              <div style={{fontSize: '0.75rem', color: 'rgba(238, 242, 255, 0.5)'}}>buổi còn lại</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Calendar View Component
function CalendarView({ bookings, currentMonth: propCurrentMonth, onMonthChange, onBookingClick, onDateClick }) {
  const [currentMonth, setCurrentMonth] = React.useState(propCurrentMonth || new Date());

  // Sync with parent currentMonth
  React.useEffect(() => {
    if (propCurrentMonth) {
      setCurrentMonth(propCurrentMonth);
    }
  }, [propCurrentMonth]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getBookingsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => {
      const bookingDate = b.bookingDate ? b.bookingDate.split('T')[0] : null;
      return bookingDate === dateStr && b.type !== 'trainer_share';
    });
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  const nextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="ots-calendar">
      <div className="ots-calendar-header">
        <button className="ots-btn ots-btn--sm" onClick={prevMonth}>‹</button>
        <h3>{monthName}</h3>
        <button className="ots-btn ots-btn--sm" onClick={nextMonth}>›</button>
      </div>
      <div className="ots-calendar-grid">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
          <div key={day} className="ots-calendar-day-name">{day}</div>
        ))}
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="ots-calendar-day ots-calendar-day--empty" />;
          
          const dayBookings = getBookingsForDate(date);
          const dateStr = date.toISOString().split('T')[0];
          const isToday = dateStr === today;

          return (
            <div 
              key={idx} 
              className={`ots-calendar-day ${isToday ? 'ots-calendar-day--today' : ''} ${dayBookings.length > 0 ? 'ots-calendar-day--has-bookings' : ''}`}
              onClick={() => onDateClick && onDateClick(date)}
            >
              <div className="ots-calendar-day-number">{date.getDate()}</div>
              {dayBookings.length > 0 && (
                <div className="ots-calendar-bookings">
                  <div className="ots-calendar-booking-count">{dayBookings.length} lịch</div>
                  <div className="ots-calendar-booking-list">
                    {dayBookings.slice(0, 2).map(booking => (
                      <div 
                        key={booking.id} 
                        className={`ots-calendar-booking ots-calendar-booking--${booking.status || 'confirmed'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookingClick && onBookingClick(booking);
                        }}
                      >
                        <span className="ots-booking-time">{booking.startTime}</span>
                        <span className="ots-booking-trainer">
                          {booking.Trainer?.User?.username || 'PT'}
                        </span>
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="ots-calendar-booking-more">+{dayBookings.length - 2}</div>
                    )}
                  </div>
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
  memberId: "", // Optional: Nếu chọn member, khi approve sẽ tự động tạo booking
  shareType: "temporary",
  scheduleMode: "single", // single, date_range, multiple_dates
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  multipleDates: [], // [{date: "2026-01-01", startTime: "09:00", endTime: "10:00"}]
  commissionSplit: 0.7,
  notes: "",
};

const INITIAL_BOOKING = {
  memberId: "",
  trainerId: "",
  gymId: "",
  packageId: "",
  bookingMode: "single", // single, date_range, multiple_dates
  bookingDate: "",
  startDate: "", // For date range mode
  endDate: "", // For date range mode
  multipleDates: [], // For multiple_dates: [{date: "2026-01-01", startTime: "09:00", endTime: "10:00"}]
  startTime: "",
  endTime: "",
  notes: "",
};

export default function OwnerTrainerSharePage() {
  const [activeTab, setActiveTab] = useState("bookings"); // bookings or shares
  const [viewMode, setViewMode] = useState("table"); // table or calendar
  const [currentMonth, setCurrentMonth] = useState(new Date()); // For calendar navigation
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Trainer Shares
  const [shares, setShares] = useState([]);
  const [pagination, setPagination] = useState({});
  
  // Received Trainer Share Requests (Owner B)
  const [receivedShares, setReceivedShares] = useState([]);
  const [receivedPagination, setReceivedPagination] = useState({});
  const [receivedFilters, setReceivedFilters] = useState({ q: "", status: "" });
  const [receivedCurrentPage, setReceivedCurrentPage] = useState(1);

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [bookingPagination, setBookingPagination] = useState({});
  const [selectedBookings, setSelectedBookings] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false); // Modal xem lịch PT
  const [showDetailModal, setShowDetailModal] = useState(false); // Modal xem chi tiết share
  const [selectedShare, setSelectedShare] = useState(null); // Share được chọn để xem chi tiết
  const [selectedShareForSchedule, setSelectedShareForSchedule] = useState(null); // Share được chọn để xem lịch
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
  const [bookingFilters, setBookingFilters] = useState({ 
    q: "", 
    status: "",
    trainerId: "",
    gymId: "",
    startDate: "",
    endDate: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [bookingCurrentPage, setBookingCurrentPage] = useState(1);

  // Lookups
  const [gyms, setGyms] = useState([]);
  const [bookingGyms, setBookingGyms] = useState([]); // Gym của owner cho booking form
  const [myGymIds, setMyGymIds] = useState([]); // IDs của các gym thuộc owner này
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
        }
      };
      loadTrainersForGym();
    } else {
      // Reset về tất cả trainers nếu không chọn gym
      loadLookups();
    }
  }, [form.fromGymId]);

  // Load trainers khi chọn gym (for booking form)
  useEffect(() => {
    if (bookingForm.gymId) {
      const loadTrainersForBooking = async () => {
        try {
          // Sử dụng endpoint có sẵn để lấy trainers của gym
          const res = await axios.get(`/api/owner/trainer-shares/available-trainers/${bookingForm.gymId}`);
          setTrainers(res.data?.trainers || []);
        } catch (err) {
          // Fallback: giữ nguyên trainers đã có
        }
      };
      loadTrainersForBooking();
    }
  }, [bookingForm.gymId]);

  // Load member PT packages when member and trainer are selected
  useEffect(() => {
    const loadMemberPTPackages = async () => {
      if (!bookingForm.memberId || !bookingForm.trainerId) {
        return;
      }

      try {
        const response = await ownerMemberService.getMemberDetail(bookingForm.memberId);
        const member = response.data;
        
        if (member && member.PackageActivations) {
          // Filter only PT packages with the selected trainer that are active
          const ptPackages = member.PackageActivations.filter(pa => 
            pa.Package?.packageType === 'personal_training' &&
            pa.Package?.trainerId === parseInt(bookingForm.trainerId) &&
            pa.status === 'active' &&
            (pa.sessionsRemaining > 0 || pa.sessionsRemaining === null)
          );

          // Auto-select the first matching PT package
          if (ptPackages.length > 0 && !bookingForm.packageActivationId) {
            setBookingForm(prev => ({ 
              ...prev, 
              packageActivationId: ptPackages[0].id,
              packageId: ptPackages[0].packageId 
            }));
          }
        }
      } catch (error) {
      }
    };

    loadMemberPTPackages();
  }, [bookingForm.memberId, bookingForm.trainerId, bookingForm.packageActivationId]);

  // Load trainer schedule khi chọn trainer và ngày
  useEffect(() => {
    const loadSchedule = async () => {
      if (!bookingForm.trainerId) {
        setTrainerSchedule([]);
        return;
      }

      let datesToCheck = [];

      if (bookingForm.bookingMode === "single" && bookingForm.bookingDate) {
        datesToCheck = [bookingForm.bookingDate];
      } else if (bookingForm.bookingMode === "date_range" && bookingForm.startDate && bookingForm.endDate) {
        datesToCheck = getDatesBetween(bookingForm.startDate, bookingForm.endDate);
      } else if (bookingForm.bookingMode === "multiple_dates") {
        datesToCheck = bookingForm.multipleDates.filter(d => d.date).map(d => d.date);
      }

      if (datesToCheck.length === 0) {
        setTrainerSchedule([]);
        return;
      }

      setLoadingSchedule(true);
      try {
        // Load schedule cho tất cả các ngày
        const schedulePromises = datesToCheck.map(date =>
          ownerBookingService.getTrainerSchedule(bookingForm.trainerId, date)
            .then(res => ({ date, bookings: res.data || [] }))
            .catch(() => ({ date, bookings: [] }))
        );

        const allSchedules = await Promise.all(schedulePromises);
        setTrainerSchedule(allSchedules);
      } catch (err) {
        setTrainerSchedule([]);
      } finally {
        setLoadingSchedule(false);
      }
    };
    
    loadSchedule();
  }, [
    bookingForm.trainerId, 
    bookingForm.bookingMode,
    bookingForm.bookingDate, 
    bookingForm.startDate, 
    bookingForm.endDate,
    bookingForm.multipleDates
  ]);

  // Load trainer schedule cho share form
  useEffect(() => {
    const loadShareSchedule = async () => {
      if (!form.trainerId) {
        setShareTrainerSchedule([]);
        return;
      }

      let datesToCheck = [];

      if (form.scheduleMode === "single" && form.startDate) {
        datesToCheck = [form.startDate];
      } else if (form.scheduleMode === "date_range" && form.startDate && form.endDate) {
        datesToCheck = getDatesBetween(form.startDate, form.endDate);
      } else if (form.scheduleMode === "multiple_dates") {
        datesToCheck = form.multipleDates.filter(d => d.date).map(d => d.date);
      }

      if (datesToCheck.length === 0) {
        setShareTrainerSchedule([]);
        return;
      }

      setLoadingShareSchedule(true);
      try {
        // Load schedule cho tất cả các ngày
        const schedulePromises = datesToCheck.map(date => {
          return ownerBookingService.getTrainerSchedule(form.trainerId, date, { includeAllGyms: true })
            .then(res => {
              return { date, bookings: res.data || [] };
            })
            .catch(err => {
              return { date, bookings: [] };
            });
        });

        const allSchedules = await Promise.all(schedulePromises);
        setShareTrainerSchedule(allSchedules);
      } catch (err) {
        setShareTrainerSchedule([]);
      } finally {
        setLoadingShareSchedule(false);
      }
    };
    
    loadShareSchedule();
  }, [
    form.trainerId, 
    form.scheduleMode,
    form.startDate, 
    form.endDate,
    form.multipleDates
  ]);

  // Load lookups (gyms, trainers, members, packages)
  const loadLookups = async () => {
    setLoadingLookups(true);
    try {
      const [gymsRes, trainersRes, membersRes, packagesRes, allGymsRes] = await Promise.all([
        ownerGetMyGyms(),
        ownerTrainerService.getMyTrainers({ limit: 1000 }), // Lấy tất cả trainers của owner
        ownerMemberService.getMyMembers({ limit: 1000 }),
        ownerGetPackages(),
        axios.get('/api/owner/gyms/all'), // Lấy tất cả gyms để chọn khi tạo request
      ]);
      
      const myGyms = gymsRes?.data?.data || [];
      const allGyms = allGymsRes?.data?.data || [];
      
      setGyms(allGyms); // Hiển thị tất cả gyms để chọn (cho share form)
      setBookingGyms(myGyms); // Hiển thị chỉ gym của owner (cho booking form)
      setMyGymIds(myGyms.map(g => g.id)); // Lưu IDs của gyms thuộc owner này
      setTrainers(trainersRes?.data || []);
      setMembers(membersRes?.data || []);
      setPackages(packagesRes?.data?.data || []);
    } catch (err) {
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

      const res = await ownerGetMyTrainerShares(params);
      
      setShares(res.data?.data || []);
      setPagination(res.data?.pagination || {});
    } catch (err) {
      console.error('Error loading trainer shares:', err);
      setError(err.response?.data?.message || err.message || "Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  };

  // Load received trainer share requests (Owner B)
  const loadReceivedShares = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { ...receivedFilters, page: receivedCurrentPage, limit: 10 };

      const res = await ownerGetReceivedTrainerShares(params);
      setReceivedShares(res.data?.data || []);
      setReceivedPagination(res.data?.pagination || {});
    } catch (err) {
      console.error('Error loading received shares:', err);
      setError(err.response?.data?.message || err.message || "Không thể tải danh sách yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  // View trainer schedule before accepting
  const handleViewTrainerSchedule = async (share) => {
    setSelectedShareForSchedule(share);
    setLoadingShareSchedule(true);
    setShowScheduleModal(true);

    try {
      if (!share.trainerId || !share.startDate) {
        setShareTrainerSchedule([]);
        return;
      }

      // Tính toán các ngày cần load
      const startDate = new Date(share.startDate);
      const endDate = share.endDate ? new Date(share.endDate) : new Date(share.startDate);
      
      // Load schedule cho tất cả các ngày trong khoảng (tối đa 30 ngày)
      const schedulePromises = [];
      const currentDate = new Date(startDate);
      let dayCount = 0;
      
      while (currentDate <= endDate && dayCount < 30) {
        const dateStr = currentDate.toISOString().split('T')[0];
        schedulePromises.push(
          ownerBookingService.getTrainerSchedule(share.trainerId, dateStr, { includeAllGyms: true })
            .then(res => ({ date: dateStr, bookings: res.data || [] }))
            .catch(() => ({ date: dateStr, bookings: [] }))
        );
        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
      }
      
      const allSchedules = await Promise.all(schedulePromises);
      setShareTrainerSchedule(allSchedules);
    } catch (err) {
      setShareTrainerSchedule([]);
    } finally {
      setLoadingShareSchedule(false);
    }
  };

  // Accept trainer share request (Owner B)
  const handleAcceptShare = async (id) => {
    if (!window.confirm("Bạn có chắc muốn chấp nhận yêu cầu này? Sau khi chấp nhận, yêu cầu sẽ được gửi lên Admin duyệt.")) return;

    try {
      setError("");
      setSuccess("");
      await ownerAcceptTrainerShare(id);
      setSuccess("Đã chấp nhận yêu cầu. Đang chờ Admin duyệt.");
      loadReceivedShares();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể chấp nhận yêu cầu");
    }
  };

  // Reject trainer share request (Owner B)
  const handleRejectShare = async (id) => {
    const reason = window.prompt("Lý do từ chối (tùy chọn):");
    if (reason === null) return; // User cancelled

    try {
      setError("");
      setSuccess("");
      await ownerRejectTrainerShare(id, reason);
      setSuccess("Đã từ chối yêu cầu");
      loadReceivedShares();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể từ chối yêu cầu");
    }
  };

  // Load bookings (including trainer shares for borrowed trainers)
  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = { ...bookingFilters, page: bookingCurrentPage, limit: 8 };

      // Load regular bookings
      const res = await ownerBookingService.getMyBookings(params);
      let bookingsData = res.data || res.data?.data || [];
      
      // Load approved trainer shares to mark shared trainer bookings
      const mySharesRes = await ownerGetMyTrainerShares({ status: 'approved', limit: 1000 });
      const myApprovedShares = mySharesRes.data?.data || [];
      
      // Create a set of shared trainer IDs for quick lookup
      const sharedTrainerIds = new Set(myApprovedShares.map(s => s.trainerId));
      
      // Mark bookings that use shared trainers
      bookingsData = bookingsData.map(booking => ({
        ...booking,
        isSharedTrainer: sharedTrainerIds.has(booking.trainerId)
      }));
      
      // Load received trainer shares (approved) to show borrowed trainers
      try {
        const sharesRes = await ownerGetReceivedTrainerShares({ status: 'approved', limit: 1000 });
        let approvedShares = sharesRes.data?.data || [];
        
        // Apply filters to trainer shares
        if (bookingFilters.trainerId) {
          approvedShares = approvedShares.filter(share => 
            share.trainerId && share.trainerId.toString() === bookingFilters.trainerId.toString()
          );
        }
        
        if (bookingFilters.gymId) {
          approvedShares = approvedShares.filter(share => 
            share.toGymId && share.toGymId.toString() === bookingFilters.gymId.toString()
          );
        }
        
        if (bookingFilters.startDate) {
          approvedShares = approvedShares.filter(share => {
            if (!share.startDate) return false;
            const shareStart = new Date(share.startDate);
            const filterStart = new Date(bookingFilters.startDate);
            return shareStart >= filterStart;
          });
        }
        
        if (bookingFilters.endDate) {
          approvedShares = approvedShares.filter(share => {
            if (!share.endDate && !share.startDate) return false;
            const shareEnd = new Date(share.endDate || share.startDate);
            const filterEnd = new Date(bookingFilters.endDate);
            return shareEnd <= filterEnd;
          });
        }
        
        // Convert approved shares to booking-like format for table display
        const shareBookings = approvedShares.map(share => ({
          ...share,
          id: `share-${share.id}`,
          type: 'trainer_share',
          status: 'shared',
          bookingDate: share.startDate,
          startTime: share.startTime || '00:00:00',
          endTime: share.endTime || '23:59:59',
          Member: { User: { username: 'Chia sẻ PT' } },
          Package: { name: share.shareType === 'temporary' ? 'Tạm thời' : 'Vĩnh viễn' }
        }));
        
        // Combine bookings and shares
        bookingsData = [...bookingsData, ...shareBookings].sort((a, b) => {
          const dateA = new Date(a.bookingDate);
          const dateB = new Date(b.bookingDate);
          return dateB - dateA; // Newest first
        });
      } catch (shareErr) {
        // Continue with just bookings if shares fail to load
      }
      
      setBookings(bookingsData);
      setBookingPagination(res.pagination || res.data?.pagination || {});
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError(err.response?.data?.message || err.message || "Không thể tải danh sách booking");
    } finally {
      setLoading(false);
    }
  }, [bookingFilters, bookingCurrentPage]);

  // Load calendar data (trainer schedule for selected trainer/month)
  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Get all dates in current month
      const year = currentMonth?.getFullYear() || new Date().getFullYear();
      const month = currentMonth?.getMonth() || new Date().getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Determine which trainers to load
      let trainersToLoad = [];
      if (bookingFilters.trainerId) {
        // Load specific trainer
        trainersToLoad = [{ id: bookingFilters.trainerId }];
      } else {
        // Load all trainers
        trainersToLoad = trainers.map(t => ({ id: t.id }));
      }

      if (trainersToLoad.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Load schedule for each day and each trainer
      const schedulePromises = [];
      
      trainersToLoad.forEach(trainer => {
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
          
          schedulePromises.push(
            ownerBookingService.getTrainerSchedule(trainer.id, dateStr)
              .then(res => ({ 
                date: dateStr,
                bookingDate: dateStr,
                trainerId: trainer.id,
                items: res.data || [] 
              }))
              .catch(err => {
                console.error(`Failed to load schedule for trainer ${trainer.id} on ${dateStr}:`, err);
                return { date: dateStr, bookingDate: dateStr, trainerId: trainer.id, items: [] };
              })
          );
        }
      });

      const allSchedules = await Promise.all(schedulePromises);
      
      // Flatten schedule items with date info
      const calendarBookings = [];
      allSchedules.forEach(({ date, items }) => {
        items.forEach(item => {
          calendarBookings.push({
            ...item,
            bookingDate: date,
            date: date
          });
        });
      });

      setBookings(calendarBookings);

    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError(err.response?.data?.message || err.message || "Không thể tải lịch");
    } finally {
      setLoading(false);
    }
  }, [bookingFilters.trainerId, currentMonth, trainers]);

  useEffect(() => {
    loadLookups();
  }, []);

  // Load data based on view mode
  useEffect(() => {
    if (viewMode === "calendar") {
      // Only load calendar if we have trainers loaded or a specific trainer selected
      if (trainers.length > 0 || bookingFilters.trainerId) {
        loadCalendarData(); // Load trainer schedule for calendar
      }
    } else {
      loadBookings(); // Load booking list for table
    }
  }, [
    viewMode, 
    bookingFilters.trainerId,
    currentMonth,
    bookingCurrentPage,
    trainers.length, // Re-load when trainers list changes
    loadBookings,
    loadCalendarData
  ]);

  // Auto-clear success/error messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (activeTab === "shares") {
      loadShares();
    } else if (activeTab === "received") {
      loadReceivedShares();
    } else if (activeTab === "bookings") {
      loadBookings();
    }
    // eslint-disable-next-line
  }, [currentPage, receivedCurrentPage, bookingCurrentPage, activeTab]);

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
      ...INITIAL_BOOKING,
      memberId: booking.memberId || "",
      trainerId: booking.trainerId || "",
      gymId: booking.gymId || "",
      packageId: booking.packageActivationId || "",
      bookingMode: "single", // Edit mode chỉ cho phép sửa 1 ngày
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
        // Chỉ cho phép update 1 booking
        await ownerBookingService.updateBooking(editing.id, bookingForm);
        setSuccess("Cập nhật booking thành công!");
      } else {
        // Tạo booking mới - hỗ trợ nhiều ngày
        if (bookingForm.bookingMode === "single") {
          // Đặt 1 ngày
          await ownerBookingService.createBooking({
            memberId: bookingForm.memberId,
            trainerId: bookingForm.trainerId,
            gymId: bookingForm.gymId,
            packageId: bookingForm.packageId,
            bookingDate: bookingForm.bookingDate,
            startTime: bookingForm.startTime,
            endTime: bookingForm.endTime,
            notes: bookingForm.notes,
          });
          setSuccess("Đặt lịch tập thành công!");
        } else if (bookingForm.bookingMode === "date_range") {
          // Đặt nhiều ngày theo range
          const datesToBook = getDatesBetween(bookingForm.startDate, bookingForm.endDate);
          
          if (datesToBook.length === 0) {
            setError("Không có ngày nào để đặt lịch!");
            return;
          }

          let successCount = 0;
          let failedCount = 0;
          const errors = [];

          for (const date of datesToBook) {
            try {
              await ownerBookingService.createBooking({
                memberId: bookingForm.memberId,
                trainerId: bookingForm.trainerId,
                gymId: bookingForm.gymId,
                packageId: bookingForm.packageId,
                bookingDate: date,
                startTime: bookingForm.startTime,
                endTime: bookingForm.endTime,
                notes: bookingForm.notes,
              });
              successCount++;
            } catch (err) {
              failedCount++;
              errors.push(`${date}: ${err.response?.data?.message || "Lỗi"}`);
            }
          }

          if (successCount > 0) {
            setSuccess(`Đặt lịch thành công ${successCount}/${datesToBook.length} ngày!`);
          }
          if (failedCount > 0) {
            setError(`Thất bại ${failedCount} ngày: ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? "..." : ""}`);
          }
        } else if (bookingForm.bookingMode === "multiple_dates") {
          // Đặt nhiều ngày cụ thể - mỗi ngày có giờ riêng
          const datesToBook = bookingForm.multipleDates.filter(d => d.date && d.startTime && d.endTime);
          
          if (datesToBook.length === 0) {
            setError("Vui lòng chọn ít nhất 1 ngày và điền đầy đủ giờ!");
            return;
          }

          let successCount = 0;
          let failedCount = 0;
          const errors = [];

          for (const dateItem of datesToBook) {
            try {
              await ownerBookingService.createBooking({
                memberId: bookingForm.memberId,
                trainerId: bookingForm.trainerId,
                gymId: bookingForm.gymId,
                packageId: bookingForm.packageId,
                bookingDate: dateItem.date,
                startTime: dateItem.startTime,
                endTime: dateItem.endTime,
                notes: bookingForm.notes,
              });
              successCount++;
            } catch (err) {
              failedCount++;
              errors.push(`${dateItem.date}: ${err.response?.data?.message || "Lỗi"}`);
            }
          }

          if (successCount > 0) {
            setSuccess(`Đặt lịch thành công ${successCount}/${datesToBook.length} ngày!`);
          }
          if (failedCount > 0) {
            setError(`Thất bại ${failedCount} ngày: ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? "..." : ""}`);
          }
        }
      }

      setShowBookingModal(false);
      loadBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // Helper function to get dates between two dates
  const getDatesBetween = (startDate, endDate) => {
    const dates = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  const addHoursToTime = (timeStr, hoursToAdd = 2) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length < 2) return "";
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";
    const totalMinutes = hours * 60 + minutes + hoursToAdd * 60;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`;
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate based on schedule mode
    if (form.scheduleMode === "single") {
      if (!form.startDate || !form.startTime || !form.endTime) {
        setError("Vui lòng nhập đầy đủ ngày và giờ");
        return;
      }
      // Check past date
      const selectedDate = new Date(form.startDate);
      if (selectedDate < today) {
        setError("Không thể chọn ngày trong quá khứ");
        return;
      }
      // Check endTime > startTime
      if (form.endTime <= form.startTime) {
        setError("Giờ kết thúc phải sau giờ bắt đầu");
        return;
      }
    } else if (form.scheduleMode === "date_range") {
      if (!form.startDate || !form.endDate || !form.startTime || !form.endTime) {
        setError("Vui lòng nhập đầy đủ khoảng thời gian và giờ");
        return;
      }
      // Check past dates
      const startDate = new Date(form.startDate);
      const endDate = new Date(form.endDate);
      if (startDate < today) {
        setError("Ngày bắt đầu không thể trong quá khứ");
        return;
      }
      if (endDate < startDate) {
        setError("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
        return;
      }
      // Check endTime > startTime
      if (form.endTime <= form.startTime) {
        setError("Giờ kết thúc phải sau giờ bắt đầu");
        return;
      }
    } else if (form.scheduleMode === "multiple_dates") {
      if (form.multipleDates.length === 0) {
        setError("Vui lòng thêm ít nhất một ngày");
        return;
      }
      const hasInvalid = form.multipleDates.some(d => !d.date || !d.startTime || !d.endTime);
      if (hasInvalid) {
        setError("Vui lòng điền đầy đủ ngày và giờ cho tất cả các mục");
        return;
      }
      // Check past dates and time validity
      for (const dateItem of form.multipleDates) {
        const selectedDate = new Date(dateItem.date);
        if (selectedDate < today) {
          setError(`Ngày ${dateItem.date} đã qua, vui lòng chọn ngày trong tương lai`);
          return;
        }
        if (dateItem.endTime <= dateItem.startTime) {
          setError(`Giờ kết thúc phải sau giờ bắt đầu cho ngày ${dateItem.date}`);
          return;
        }
      }
    }

    // Validate time conflict
    if (shareTrainerSchedule.length > 0) {
      const hasConflict = shareTrainerSchedule.some((daySchedule) => {
        // Find time range for this day
        let dayTimeRange = null;
        
        if (form.scheduleMode === "multiple_dates") {
          const matchingDate = form.multipleDates.find(d => d.date === daySchedule.date);
          if (matchingDate) {
            dayTimeRange = { startTime: matchingDate.startTime, endTime: matchingDate.endTime };
          }
        } else {
          dayTimeRange = { startTime: form.startTime, endTime: form.endTime };
        }

        if (!dayTimeRange) return false;

        return daySchedule.bookings.filter(b => b.type !== 'trainer_share').some((s) => {
          return dayTimeRange.startTime < s.endTime && dayTimeRange.endTime > s.startTime;
        });
      });

      if (hasConflict) {
        setError("❌ Trainer đã có lịch trong khoảng thời gian này! Vui lòng chọn khung giờ khác.");
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
        <div>
          <h1 className="ots-title">Chuyển kho</h1>
          <p className="ots-subtitle">Quản lý chuyển thiết bị giữa các cơ sở</p>
        </div>
        {activeTab !== "received" && (
          <button 
            className="btn-primary" 
            onClick={activeTab === "bookings" ? handleCreateBooking : activeTab === "shares" ? handleCreate : null}
          >
            + {activeTab === "bookings" ? "Đặt lịch mới" : activeTab === "shares" ? "Tạo phiếu chuyển kho" : ""}
          </button>
        )}
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
          📤 Yêu cầu xin mượn PT
        </button>
        <button
          className={`ots-tab ${activeTab === "received" ? "active" : ""}`}
          onClick={() => setActiveTab("received")}
        >
          📥 Yêu cầu cho mượn PT
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
                    <tr 
                      key={share.id}
                      onClick={() => {
                        setSelectedShare(share);
                        setShowDetailModal(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{share.id}</td>
                      <td><strong>{share.Trainer?.User?.username || "—"}</strong></td>
                      <td>{share.fromGym?.name || "—"}</td>
                      <td>{share.toGym?.name || "—"}</td>
                      <td>{share.shareType}</td>
                      <td>
                        <div>
                          <div>{formatDate(share.startDate)} - {formatDate(share.endDate)}</div>
                          {share.startTime && share.endTime && 
                           share.startTime !== '00:00:00' && 
                           share.endTime !== '00:00:00' && (
                            <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '0.25rem' }}>
                              ⏰ {share.startTime.substring(0, 5)} - {share.endTime.substring(0, 5)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{(share.commissionSplit * 100).toFixed(0)}%</td>
                      <td>
                        <StatusBadge status={share.status} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="ots-actions">
                          {share.status === "waiting_acceptance" && (
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
                          {share.status === "pending" && (
                            <span className="ots-text--info">⏳ Chờ Admin duyệt</span>
                          )}
                          {share.status === "approved" && (
                            <span className="ots-text--success">✓ Đã được duyệt</span>
                          )}
                          {share.status === "rejected" && (
                            <span className="ots-text--danger">✗ Admin từ chối</span>
                          )}
                          {share.status === "rejected_by_partner" && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span className="ots-text--danger">✗ Đối tác từ chối</span>
                              {share.notes && (
                                <span style={{ fontSize: '0.85em', color: '#64748b', fontStyle: 'italic' }}>
                                  {share.notes}
                                </span>
                              )}
                            </div>
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

      {activeTab === "received" && (
        <>
          {/* Stats Cards */}
          <div className="ots-stats-grid">
            <div className="ots-stat-card">
              <div className="ots-stat-card__label">Tổng yêu cầu nhận</div>
              <div className="ots-stat-card__value">{receivedShares.length}</div>
            </div>
            <div className="ots-stat-card ots-stat-card--warning">
              <div className="ots-stat-card__label">Chờ chấp nhận</div>
              <div className="ots-stat-card__value">
                {receivedShares.filter(s => s.status === 'waiting_acceptance').length}
              </div>
            </div>
            <div className="ots-stat-card ots-stat-card--info">
              <div className="ots-stat-card__label">Đang chờ Admin</div>
              <div className="ots-stat-card__value">
                {receivedShares.filter(s => s.status === 'pending').length}
              </div>
            </div>
            <div className="ots-stat-card ots-stat-card--success">
              <div className="ots-stat-card__label">Đã được duyệt</div>
              <div className="ots-stat-card__value">
                {receivedShares.filter(s => s.status === 'approved').length}
              </div>
            </div>
            <div className="ots-stat-card ots-stat-card--danger">
              <div className="ots-stat-card__label">Đã từ chối</div>
              <div className="ots-stat-card__value">
                {receivedShares.filter(s => s.status === 'rejected_by_partner').length}
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="ots-filters">
            <input
              className="ots-filter-input"
              placeholder="Tìm PT..."
              value={receivedFilters.q}
              onChange={(e) => setReceivedFilters({ ...receivedFilters, q: e.target.value })}
            />
            <select
              className="ots-filter-select"
              value={receivedFilters.status}
              onChange={(e) => setReceivedFilters({ ...receivedFilters, status: e.target.value })}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="waiting_acceptance">Chờ chấp nhận</option>
              <option value="pending">Đang chờ Admin</option>
              <option value="approved">Đã được duyệt</option>
              <option value="rejected_by_partner">Đã từ chối</option>
            </select>
            <button className="ots-btn ots-btn--primary" onClick={() => { setReceivedCurrentPage(1); loadReceivedShares(); }}>
              🔍 Tìm
            </button>
          </div>

          {/* Received Shares Table */}
          {loading ? (
            <div className="ots-loading">Đang tải...</div>
          ) : error ? (
            <div className="ots-empty">
              <p style={{ color: '#ff5555' }}>Lỗi: {error}</p>
              <button className="ots-btn ots-btn--primary" onClick={loadReceivedShares}>
                Thử lại
              </button>
            </div>
          ) : receivedShares.length === 0 ? (
            <div className="ots-empty">
              <p>Chưa có yêu cầu nào</p>
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
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {receivedShares.map((share) => (
                    <tr key={share.id}>
                      <td>#{share.id}</td>
                      <td>{share.Trainer?.User?.username || `PT #${share.trainerId}`}</td>
                      <td>{share.FromGym?.name || `Gym #${share.fromGymId}`}</td>
                      <td>{share.ToGym?.name || `Gym #${share.toGymId}`}</td>
                      <td>
                        <span className={`ots-badge ${share.shareType === "temporary" ? "ots-badge--warning" : "ots-badge--info"}`}>
                          {share.shareType === "temporary" ? "Tạm thời" : "Vĩnh viễn"}
                        </span>
                      </td>
                      <td>
                        <div>
                          {share.shareType === "temporary" ? (
                            <>
                              <div>{formatDate(share.startDate)} → {formatDate(share.endDate)}</div>
                              {share.startTime && share.endTime && 
                               share.startTime !== '00:00:00' && 
                               share.endTime !== '00:00:00' && (
                                <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '0.25rem' }}>
                                  ⏰ {share.startTime.substring(0, 5)} - {share.endTime.substring(0, 5)}
                                </div>
                              )}
                            </>
                          ) : (
                            "Không giới hạn"
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`ots-badge ${
                          share.status === "waiting_acceptance" ? "ots-badge--warning" :
                          share.status === "pending" ? "ots-badge--info" :
                          share.status === "approved" ? "ots-badge--success" :
                          share.status === "rejected_by_partner" ? "ots-badge--danger" :
                          "ots-badge--danger"
                        }`}>
                          {STATUS_LABELS[share.status]?.label || share.status}
                        </span>
                      </td>
                      <td>
                        <div className="ots-actions">
                          {share.status === "waiting_acceptance" && (
                            <>
                              <button
                                className="ots-btn ots-btn--sm ots-btn--info"
                                onClick={() => handleViewTrainerSchedule(share)}
                                title="Xem lịch PT"
                              >
                                📅 Lịch
                              </button>
                              <button
                                className="ots-btn ots-btn--sm ots-btn--success"
                                onClick={() => handleAcceptShare(share.id)}
                                title="Chấp nhận"
                              >
                                ✓ Chấp nhận
                              </button>
                              <button
                                className="ots-btn ots-btn--sm ots-btn--danger"
                                onClick={() => handleRejectShare(share.id)}
                                title="Từ chối"
                              >
                                ✗ Từ chối
                              </button>
                            </>
                          )}
                          {share.status === "pending" && (
                            <>
                              <button
                                className="ots-btn ots-btn--sm ots-btn--info"
                                onClick={() => handleViewTrainerSchedule(share)}
                                title="Xem lịch PT"
                              >
                                📅 Lịch
                              </button>
                              <span className="ots-text--info">⏳ Chờ Admin duyệt</span>
                            </>
                          )}
                          {share.status === "approved" && (
                            <>
                              <button
                                className="ots-btn ots-btn--sm ots-btn--info"
                                onClick={() => handleViewTrainerSchedule(share)}
                                title="Xem lịch PT"
                              >
                                📅 Lịch
                              </button>
                              <span className="ots-text--success">✓ Có thể sử dụng</span>
                            </>
                          )}
                          {share.status === "rejected_by_partner" && (
                            <span className="ots-text--danger">✗ Từ chối</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {receivedPagination.totalPages > 1 && (
                <div className="ots-pagination">
                  <button
                    className="ots-btn ots-btn--sm"
                    disabled={receivedCurrentPage === 1}
                    onClick={() => setReceivedCurrentPage(receivedCurrentPage - 1)}
                  >
                    Trước
                  </button>
                  <span>
                    Trang {receivedCurrentPage} / {receivedPagination.totalPages}
                  </span>
                  <button
                    className="ots-btn ots-btn--sm"
                    disabled={receivedCurrentPage === receivedPagination.totalPages}
                    onClick={() => setReceivedCurrentPage(receivedCurrentPage + 1)}
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
          {/* View Mode Toggle */}
          <div className="ots-view-controls">
            <div className="ots-view-mode-toggle">
              <button
                className={`ots-btn ots-btn--sm ${viewMode === "table" ? "ots-btn--primary" : "ots-btn--secondary"}`}
                onClick={() => setViewMode("table")}
              >
                📋 Bảng
              </button>
              <button
                className={`ots-btn ots-btn--sm ${viewMode === "calendar" ? "ots-btn--primary" : "ots-btn--secondary"}`}
                onClick={() => setViewMode("calendar")}
              >
                📅 Lịch
              </button>
            </div>
          </div>

          {/* Filter */}
          <div className="ots-filters ots-filters--advanced">
            <input
              className="ots-filter-input"
              placeholder="Tìm theo tên member..."
              value={bookingFilters.q}
              onChange={(e) => setBookingFilters({ ...bookingFilters, q: e.target.value })}
            />
            <select
              className="ots-filter-select"
              value={bookingFilters.gymId}
              onChange={(e) => setBookingFilters({ ...bookingFilters, gymId: e.target.value })}
            >
              <option value="">Tất cả Gym</option>
              {gyms.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <select
              className="ots-filter-select"
              value={bookingFilters.trainerId}
              onChange={(e) => setBookingFilters({ ...bookingFilters, trainerId: e.target.value })}
            >
              <option value="">Tất cả PT</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.User?.username || `PT #${t.id}`}</option>
              ))}
            </select>
            <select
              className="ots-filter-select"
              value={bookingFilters.status}
              onChange={(e) => setBookingFilters({ ...bookingFilters, status: e.target.value })}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="in_progress">Đang diễn ra</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
              <option value="no_show">Vắng mặt</option>
            </select>
            <input
              type="date"
              className="ots-filter-input"
              placeholder="Từ ngày"
              value={bookingFilters.startDate}
              onChange={(e) => setBookingFilters({ ...bookingFilters, startDate: e.target.value })}
            />
            <input
              type="date"
              className="ots-filter-input"
              placeholder="Đến ngày"
              value={bookingFilters.endDate}
              onChange={(e) => setBookingFilters({ ...bookingFilters, endDate: e.target.value })}
              min={bookingFilters.startDate}
            />
            <button className="ots-btn ots-btn--primary" onClick={() => { setBookingCurrentPage(1); loadBookings(); }}>
              🔍 Tìm
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
          ) : viewMode === "calendar" ? (
            <CalendarView 
              bookings={bookings}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onBookingClick={handleEditBooking}
              onDateClick={(date) => {
                const dateStr = date.toISOString().split('T')[0];
                setBookingFilters({ ...bookingFilters, startDate: dateStr, endDate: dateStr });
                setViewMode("table");
              }}
            />
          ) : (
            <>
              {/* Bulk Actions */}
              {selectedBookings.length > 0 && (
                <div className="ots-bulk-actions">
                  <span className="ots-bulk-count">Đã chọn {selectedBookings.length} booking</span>
                  <button
                    className="ots-btn ots-btn--sm ots-btn--success"
                    onClick={() => {
                      const selectedItems = bookings.filter(b => selectedBookings.includes(b.id));
                      const eligibleItems = selectedItems.filter(b => String(b.status || '').toLowerCase() === 'pending');
                      const skippedCount = selectedItems.length - eligibleItems.length;
                      if (eligibleItems.length === 0) {
                        setError("Không có booking nào ở trạng thái chờ xác nhận");
                        return;
                      }
                      if (window.confirm(`Xác nhận ${eligibleItems.length} booking?${skippedCount > 0 ? ` (Bỏ qua ${skippedCount} booking không hợp lệ)` : ""}`)) {
                        Promise.all(eligibleItems.map(item => 
                          ownerBookingService.updateBookingStatus(item.id, 'confirmed')
                        )).then(() => {
                          setSuccess(`Đã xác nhận ${eligibleItems.length} booking`);
                          setSelectedBookings([]);
                          loadBookings();
                        }).catch(() => setError("Có lỗi xảy ra"));
                      }
                    }}
                  >
                    ✓ Xác nhận tất cả
                  </button>
                  <button
                    className="ots-btn ots-btn--sm ots-btn--danger"
                    onClick={() => {
                      const selectedItems = bookings.filter(b => selectedBookings.includes(b.id));
                      const eligibleItems = selectedItems.filter(b => {
                        const status = String(b.status || '').toLowerCase();
                        return ['pending', 'confirmed', 'in_progress'].includes(status);
                      });
                      const skippedCount = selectedItems.length - eligibleItems.length;
                      if (eligibleItems.length === 0) {
                        setError("Không có booking nào có thể hủy");
                        return;
                      }
                      if (window.confirm(`Hủy ${eligibleItems.length} booking?${skippedCount > 0 ? ` (Bỏ qua ${skippedCount} booking không hợp lệ)` : ""}`)) {
                        Promise.all(eligibleItems.map(item => 
                          ownerBookingService.updateBookingStatus(item.id, 'cancelled')
                        )).then(() => {
                          setSuccess(`Đã hủy ${eligibleItems.length} booking`);
                          setSelectedBookings([]);
                          loadBookings();
                        }).catch(() => setError("Có lỗi xảy ra"));
                      }
                    }}
                  >
                    ✕ Hủy tất cả
                  </button>
                  <button
                    className="ots-btn ots-btn--sm ots-btn--secondary"
                    onClick={() => setSelectedBookings([])}
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}

              <table className="ots-table">
                <thead>
                  <tr>
                    <th style={{width: '40px'}}>
                      <input
                        type="checkbox"
                        checked={selectedBookings.length === bookings.filter(b => b.type !== 'trainer_share').length && bookings.filter(b => b.type !== 'trainer_share').length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBookings(bookings.filter(b => b.type !== 'trainer_share').map(b => b.id));
                          } else {
                            setSelectedBookings([]);
                          }
                        }}
                      />
                    </th>
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
                  {bookings.filter(booking => booking.type !== 'trainer_share').map((booking) => {
                    const isShared = booking.isSharedTrainer;
                    return (
                    <tr 
                      key={booking.id} 
                      className={`${selectedBookings.includes(booking.id) ? 'ots-row-selected' : ''} ${isShared ? 'ots-row-shared' : ''}`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedBookings.includes(booking.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBookings([...selectedBookings, booking.id]);
                            } else {
                              setSelectedBookings(selectedBookings.filter(id => id !== booking.id));
                            }
                          }}
                        />
                      </td>
                      <td>{booking.id}</td>
                      <td>
                        <strong>
                          {booking.Member?.User?.username || "—"}
                        </strong>
                      </td>
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
                          {/* Quick action buttons */}
                          {booking.status === "pending" && (
                            <>
                              <button
                                className="ots-btn ots-btn--xs ots-btn--success"
                                onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                title="Xác nhận"
                              >
                                ✓
                              </button>
                              <button
                                className="ots-btn ots-btn--xs ots-btn--danger"
                                onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                title="Hủy"
                              >
                                ✕
                              </button>
                            </>
                          )}
                          {booking.status === "confirmed" && (
                            <>
                              <button
                                className="ots-btn ots-btn--xs ots-btn--warning"
                                onClick={() => handleUpdateBookingStatus(booking.id, 'in_progress')}
                                title="Bắt đầu"
                              >
                                ▶
                              </button>
                              <button
                                className="ots-btn ots-btn--xs ots-btn--danger"
                                onClick={() => handleUpdateBookingStatus(booking.id, 'no_show')}
                                title="Vắng mặt"
                              >
                                ⊗
                              </button>
                            </>
                          )}
                          {booking.status === "in_progress" && (
                            <button
                              className="ots-btn ots-btn--xs ots-btn--success"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                              title="Hoàn thành"
                            >
                              ✔
                            </button>
                          )}
                          
                          {/* Edit button */}
                          {(booking.status === "pending" || booking.status === "confirmed") && (
                            <button
                              className="ots-btn ots-btn--xs ots-btn--secondary"
                              onClick={() => handleEditBooking(booking)}
                              title="Sửa"
                            >
                              ✎
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
              <h2>{editing ? "Sửa yêu cầu" : "Tạo yêu cầu xin mượn PT"}</h2>
              <button className="ots-modal__close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ots-form">
              <Field label="Gym có PT (muốn xin mượn từ đây)" required>
                <select
                  className="ots-select"
                  value={form.fromGymId}
                  onChange={(e) => setForm({ ...form, fromGymId: e.target.value, trainerId: '' })}
                  required
                  disabled={loadingLookups}
                >
                  <option value="">-- Chọn Gym có PT --</option>
                  {gyms.filter(g => !myGymIds.includes(g.id)).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.address || g.location || 'N/A'})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Trainer cần mượn" required>
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

              <Field label="Gym nhận PT (Gym của tôi)" required>
                <select
                  className="ots-select"
                  value={form.toGymId}
                  onChange={(e) => setForm({ ...form, toGymId: e.target.value, memberId: '' })}
                  required
                  disabled={loadingLookups}
                >
                  <option value="">-- Chọn Gym của tôi --</option>
                  {gyms.filter(g => myGymIds.includes(g.id)).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.address || g.location || 'N/A'})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Hội viên (Tùy chọn - Tự động tạo booking khi duyệt)">
                <select
                  className="ots-select"
                  value={form.memberId}
                  onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                  disabled={loadingLookups || !form.toGymId}
                >
                  <option value="">
                    {!form.toGymId ? '-- Chọn Gym nhận PT trước --' : '-- Không chọn (chỉ mượn PT) --'}
                  </option>
                  {form.toGymId && members
                    .filter(m => m.gymId && m.gymId.toString() === form.toGymId.toString())
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.User?.username || 'N/A'} - {m.membershipNumber || 'N/A'}
                      </option>
                    ))
                  }
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

              {/* Chế độ chọn lịch */}
              {!editing && (
                <Field label="Chế độ chọn lịch" required>
                  <select
                    className="ots-select"
                    value={form.scheduleMode}
                    onChange={(e) => setForm({ 
                      ...form, 
                      scheduleMode: e.target.value,
                      startDate: "",
                      endDate: "",
                      startTime: "",
                      endTime: "",
                      multipleDates: []
                    })}
                  >
                    <option value="single">Chọn 1 ngày</option>
                    <option value="date_range">Chọn khoảng thời gian (cùng giờ mỗi ngày)</option>
                    <option value="multiple_dates">Chọn nhiều ngày cụ thể (khác giờ)</option>
                  </select>
                </Field>
              )}

              {/* Single date mode */}
              {form.scheduleMode === "single" && (
                <>
                  <Field label="Ngày mượn PT" required>
                    <input
                      type="date"
                      className="ots-input"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </Field>
                  <div className="ots-row">
                    <Field label="Giờ bắt đầu" required>
                      <input
                        type="time"
                        className="ots-input"
                        value={form.startTime || ''}
                        onChange={(e) => {
                          const startTime = e.target.value;
                          const endTime = addHoursToTime(startTime, 2);
                          setForm({ ...form, startTime, endTime });
                        }}
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
                </>
              )}

              {/* Date range mode */}
              {form.scheduleMode === "date_range" && (
                <>
                  <div className="ots-row">
                    <Field label="Từ ngày" required>
                      <input
                        type="date"
                        className="ots-input"
                        value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </Field>
                    <Field label="Đến ngày" required>
                      <input
                        type="date"
                        className="ots-input"
                        value={form.endDate}
                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        min={form.startDate || new Date().toISOString().split('T')[0]}
                        required
                      />
                    </Field>
                  </div>
                  {form.startDate && form.endDate && (
                    <div className="ots-field">
                      <div className="ots-field__hint" style={{color: '#3b82f6', fontWeight: 500}}>
                        📅 Sẽ mượn PT {getDatesBetween(form.startDate, form.endDate).length} ngày (cùng giờ)
                      </div>
                    </div>
                  )}
                  <div className="ots-row">
                    <Field label="Giờ bắt đầu" required>
                      <input
                        type="time"
                        className="ots-input"
                        value={form.startTime || ''}
                        onChange={(e) => {
                          const startTime = e.target.value;
                          const endTime = addHoursToTime(startTime, 2);
                          setForm({ ...form, startTime, endTime });
                        }}
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
                </>
              )}

              {/* Multiple specific dates mode */}
              {form.scheduleMode === "multiple_dates" && (
                <Field label="Chọn các ngày và giờ" required>
                  <div className="ots-multiple-dates">
                    <div className="ots-multiple-dates-list">
                      {(form.multipleDates.length === 0 ? [{ date: "", startTime: "", endTime: "" }] : form.multipleDates).map((dateItem, index) => (
                        <div key={index} className="ots-multiple-date-item">
                          <input
                            type="date"
                            className="ots-input"
                            value={dateItem.date || ""}
                            onChange={(e) => {
                              const newDates = [...form.multipleDates];
                              if (newDates[index]) {
                                newDates[index] = { ...newDates[index], date: e.target.value };
                              } else {
                                newDates[index] = { date: e.target.value, startTime: "", endTime: "" };
                              }
                              setForm({ ...form, multipleDates: newDates });
                            }}
                            min={new Date().toISOString().split('T')[0]}
                            required
                          />
                          <input
                            type="time"
                            className="ots-input"
                            value={dateItem.startTime || ""}
                            onChange={(e) => {
                              const startTime = e.target.value;
                              const endTime = addHoursToTime(startTime, 2);
                              const newDates = [...form.multipleDates];
                              if (newDates[index]) {
                                newDates[index] = { ...newDates[index], startTime, endTime };
                              } else {
                                newDates[index] = { date: "", startTime, endTime };
                              }
                              setForm({ ...form, multipleDates: newDates });
                            }}
                            placeholder="Giờ bắt đầu"
                            required
                          />
                          <input
                            type="time"
                            className="ots-input"
                            value={dateItem.endTime || ""}
                            onChange={(e) => {
                              const newDates = [...form.multipleDates];
                              if (newDates[index]) {
                                newDates[index] = { ...newDates[index], endTime: e.target.value };
                              } else {
                                newDates[index] = { date: "", startTime: "", endTime: e.target.value };
                              }
                              setForm({ ...form, multipleDates: newDates });
                            }}
                            placeholder="Giờ kết thúc"
                            required
                          />
                          {form.multipleDates.length > 0 && (
                            <button
                              type="button"
                              className="ots-btn ots-btn--sm ots-btn--danger"
                              onClick={() => {
                                const newDates = form.multipleDates.filter((_, i) => i !== index);
                                setForm({ ...form, multipleDates: newDates });
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="ots-btn ots-btn--sm ots-btn--primary"
                      onClick={() => {
                        setForm({ 
                          ...form, 
                          multipleDates: [...form.multipleDates, { date: "", startTime: "", endTime: "" }] 
                        });
                      }}
                      style={{marginTop: '8px'}}
                    >
                      + Thêm ngày
                    </button>
                    {form.multipleDates.filter(d => d.date).length > 0 && (
                      <div className="ots-field__hint" style={{color: '#3b82f6', fontWeight: 500, marginTop: '8px'}}>
                        📅 Đã chọn {form.multipleDates.filter(d => d.date).length} ngày
                      </div>
                    )}
                  </div>
                </Field>
              )}

              {/* Hiển thị lịch trainer */}
              {form.trainerId && (
                form.scheduleMode === "single" ? form.startDate :
                form.scheduleMode === "date_range" ? (form.startDate && form.endDate) :
                form.scheduleMode === "multiple_dates" ? form.multipleDates.filter(d => d.date).length > 0 :
                false
              ) && (
                <div className="ots-field">
                  <label className="ots-field__label">
                    Lịch đã đặt của PT {loadingShareSchedule && "(đang tải...)"}
                  </label>
                  <div className="ots-schedule-info">
                    {shareTrainerSchedule.length === 0 && !loadingShareSchedule && (
                      <p className="ots-empty-text">✅ Trainer trống lịch trong khoảng thời gian này</p>
                    )}
                    <div className="ots-schedule-days">
                      {shareTrainerSchedule.map((daySchedule, dayIdx) => {
                        const filteredBookings = daySchedule.bookings?.filter(b => b.type !== 'trainer_share') || [];
                        const hasBookings = filteredBookings.length > 0;
                        
                        // Tìm time range cho ngày này nếu ở mode multiple_dates
                        let dayTimeRange = null;
                        if (form.scheduleMode === "multiple_dates") {
                          const matchingDate = form.multipleDates.find(d => d.date === daySchedule.date);
                          if (matchingDate) {
                            dayTimeRange = { startTime: matchingDate.startTime, endTime: matchingDate.endTime };
                          }
                        } else {
                          // Dùng startTime/endTime chung
                          dayTimeRange = { startTime: form.startTime, endTime: form.endTime };
                        }
                        
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
                                {filteredBookings.map((s, idx) => {
                                  // Check conflict nếu có time range
                                  const isConflict = dayTimeRange && dayTimeRange.startTime && dayTimeRange.endTime && 
                                    dayTimeRange.startTime < s.endTime && dayTimeRange.endTime > s.startTime;
                                  
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
                  </div>
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
                  {bookingGyms.map((g) => (
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
                  onChange={(e) => setBookingForm({ ...bookingForm, trainerId: e.target.value, packageActivationId: '', packageId: '' })}
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

              {/* Display PT Package info when trainer is selected */}
              {bookingForm.memberId && bookingForm.trainerId && (
                <PTPackageInfo 
                  memberId={bookingForm.memberId} 
                  trainerId={bookingForm.trainerId}
                  onPackageSelect={(packageActivationId, packageId) => {
                    setBookingForm(prev => ({ 
                      ...prev, 
                      packageActivationId, 
                      packageId 
                    }));
                  }}
                  selectedPackageActivationId={bookingForm.packageActivationId}
                />
              )}

              <Field label="Gói tập">
                <select
                  className="ots-select"
                  value={bookingForm.packageId}
                  onChange={(e) => setBookingForm({ ...bookingForm, packageId: e.target.value })}
                  disabled={loadingLookups}
                  style={{ display: 'none' }}
                >
                  <option value="">-- Chọn gói (nếu có) --</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.price?.toLocaleString()} VND
                    </option>
                  ))}
                </select>
              </Field>

              {/* Chế độ đặt lịch */}
              {!editing && (
                <Field label="Chế độ đặt lịch" required>
                  <select
                    className="ots-select"
                    value={bookingForm.bookingMode}
                    onChange={(e) => setBookingForm({ 
                      ...bookingForm, 
                      bookingMode: e.target.value,
                      bookingDate: "",
                      startDate: "",
                      endDate: "",
                      multipleDates: []
                    })}
                  >
                    <option value="single">Đặt 1 ngày</option>
                    <option value="date_range">Đặt nhiều ngày (khoảng thời gian)</option>
                    <option value="multiple_dates">Đặt nhiều ngày cụ thể</option>
                  </select>
                </Field>
              )}

              {/* Single date mode */}
              {bookingForm.bookingMode === "single" && (
                <Field label="Ngày tập" required>
                  <input
                    type="date"
                    className="ots-input"
                    value={bookingForm.bookingDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                    required
                  />
                </Field>
              )}

              {/* Date range mode */}
              {bookingForm.bookingMode === "date_range" && (
                <>
                  <div className="ots-row">
                    <Field label="Từ ngày" required>
                      <input
                        type="date"
                        className="ots-input"
                        value={bookingForm.startDate}
                        onChange={(e) => setBookingForm({ ...bookingForm, startDate: e.target.value })}
                        required
                      />
                    </Field>
                    <Field label="Đến ngày" required>
                      <input
                        type="date"
                        className="ots-input"
                        value={bookingForm.endDate}
                        onChange={(e) => setBookingForm({ ...bookingForm, endDate: e.target.value })}
                        min={bookingForm.startDate}
                        required
                      />
                    </Field>
                  </div>
                  {bookingForm.startDate && bookingForm.endDate && (
                    <div className="ots-field">
                      <div className="ots-field__hint" style={{color: '#3b82f6', fontWeight: 500}}>
                        📅 Sẽ đặt {getDatesBetween(bookingForm.startDate, bookingForm.endDate).length} ngày
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Multiple specific dates mode */}
              {bookingForm.bookingMode === "multiple_dates" && (
                <Field label="Chọn các ngày và giờ" required>
                  <div className="ots-multiple-dates">
                    <div className="ots-multiple-dates-list">
                      {(bookingForm.multipleDates.length === 0 ? [{ date: "", startTime: "", endTime: "" }] : bookingForm.multipleDates).map((dateItem, index) => (
                        <div key={index} className="ots-multiple-date-item">
                          <input
                            type="date"
                            className="ots-input"
                            value={dateItem.date || ""}
                            onChange={(e) => {
                              const newDates = [...bookingForm.multipleDates];
                              if (newDates[index]) {
                                newDates[index] = { ...newDates[index], date: e.target.value };
                              } else {
                                newDates[index] = { date: e.target.value, startTime: "", endTime: "" };
                              }
                              setBookingForm({ ...bookingForm, multipleDates: newDates });
                            }}
                            required
                          />
                          <input
                            type="time"
                            className="ots-input"
                            value={dateItem.startTime || ""}
                            onChange={(e) => {
                              const nextStartTime = e.target.value;
                              const newDates = [...bookingForm.multipleDates];
                              if (newDates[index]) {
                                newDates[index] = { 
                                  ...newDates[index], 
                                  startTime: nextStartTime,
                                  endTime: addHoursToTime(nextStartTime, 2)
                                };
                              } else {
                                newDates[index] = { 
                                  date: "", 
                                  startTime: nextStartTime, 
                                  endTime: addHoursToTime(nextStartTime, 2)
                                };
                              }
                              setBookingForm({ ...bookingForm, multipleDates: newDates });
                            }}
                            placeholder="Giờ bắt đầu"
                            required
                          />
                          <input
                            type="time"
                            className="ots-input"
                            value={dateItem.endTime || ""}
                            onChange={(e) => {
                              const newDates = [...bookingForm.multipleDates];
                              if (newDates[index]) {
                                newDates[index] = { ...newDates[index], endTime: e.target.value };
                              } else {
                                newDates[index] = { date: "", startTime: "", endTime: e.target.value };
                              }
                              setBookingForm({ ...bookingForm, multipleDates: newDates });
                            }}
                            placeholder="Giờ kết thúc"
                            required
                          />
                          {bookingForm.multipleDates.length > 0 && (
                            <button
                              type="button"
                              className="ots-btn ots-btn--sm ots-btn--danger"
                              onClick={() => {
                                const newDates = bookingForm.multipleDates.filter((_, i) => i !== index);
                                setBookingForm({ ...bookingForm, multipleDates: newDates });
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="ots-btn ots-btn--sm ots-btn--primary"
                      onClick={() => {
                        setBookingForm({ 
                          ...bookingForm, 
                          multipleDates: [...bookingForm.multipleDates, { date: "", startTime: "", endTime: "" }] 
                        });
                      }}
                      style={{marginTop: '8px'}}
                    >
                      + Thêm ngày
                    </button>
                    {bookingForm.multipleDates.filter(d => d.date).length > 0 && (
                      <div className="ots-field__hint" style={{color: '#3b82f6', fontWeight: 500, marginTop: '8px'}}>
                        📅 Đã chọn {bookingForm.multipleDates.filter(d => d.date).length} ngày
                      </div>
                    )}
                  </div>
                </Field>
              )}

              {/* Hiển thị lịch đã book của trainer */}
              {bookingForm.trainerId && (
                bookingForm.bookingMode === "single" ? bookingForm.bookingDate :
                bookingForm.bookingMode === "date_range" ? (bookingForm.startDate && bookingForm.endDate) :
                bookingForm.bookingMode === "multiple_dates" ? bookingForm.multipleDates.filter(d => d.date).length > 0 :
                false
              ) && (
                <div className="ots-field">
                  <label className="ots-field__label">
                    Lịch đã đặt của PT {loadingSchedule && "(đang tải...)"}
                  </label>
                  <div className="ots-schedule-info">
                    {loadingSchedule ? (
                      <p style={{ color: '#94a3b8', fontSize: '14px' }}>Đang kiểm tra lịch...</p>
                    ) : trainerSchedule.length === 0 ? (
                      <p style={{ color: '#5fffc0', fontSize: '14px' }}>✓ PT trống lịch</p>
                    ) : (
                      <div className="ots-schedule-days">
                        {trainerSchedule.map((daySchedule) => {
                          const filteredBookings = daySchedule.bookings?.filter(b => b.type !== 'trainer_share') || [];
                          return (
                          <div key={daySchedule.date} className="ots-schedule-day">
                            <div className="ots-schedule-day-header">
                              <strong>{new Date(daySchedule.date + 'T00:00:00').toLocaleDateString('vi-VN', { 
                                weekday: 'short', 
                                day: '2-digit', 
                                month: '2-digit' 
                              })}</strong>
                              {filteredBookings.length === 0 ? (
                                <span style={{ color: '#5fffc0', fontSize: '13px' }}>✓ Trống</span>
                              ) : (
                                <span style={{ color: '#ffc107', fontSize: '13px' }}>
                                  {filteredBookings.length} lịch
                                </span>
                              )}
                            </div>
                            {filteredBookings.length > 0 && (
                              <div className="ots-schedule-list">
                                {filteredBookings.map((sch) => (
                                  <div 
                                    key={sch.id} 
                                    className="ots-schedule-item"
                                  >
                                    <span className="ots-time">{sch.startTime} - {sch.endTime}</span>
                                    <span className="ots-member">
                                      ({sch.Member?.User?.username || "N/A"})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Giờ bắt đầu - kết thúc: chỉ hiển thị cho mode single và date_range */}
              {(bookingForm.bookingMode === "single" || bookingForm.bookingMode === "date_range") && (
                <div className="ots-row">
                  <Field label="Giờ bắt đầu" required>
                    <input
                      type="time"
                      className="ots-input"
                      value={bookingForm.startTime}
                      onChange={(e) => {
                        const nextStartTime = e.target.value;
                        setBookingForm({ 
                          ...bookingForm, 
                          startTime: nextStartTime,
                          endTime: addHoursToTime(nextStartTime, 2)
                        });
                      }}
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
              )}

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

      {/* Modal xem lịch PT */}
      {showScheduleModal && selectedShareForSchedule && (
        <div className="ots-modal">
          <div className="ots-modal__backdrop" onClick={() => setShowScheduleModal(false)} />
          <div className="ots-modal__content" style={{ maxWidth: '800px' }}>
            <div className="ots-modal__header">
              <h2>Lịch làm việc của PT {selectedShareForSchedule.Trainer?.User?.username}</h2>
              <button className="ots-modal__close" onClick={() => setShowScheduleModal(false)}>
                ×
              </button>
            </div>

            <div className="ots-form">
              {/* Thông tin yêu cầu */}
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '1.25rem', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                color: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📋</span>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Thông tin yêu cầu</h3>
                </div>
                
                <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ opacity: 0.9, minWidth: '90px' }}>📅 Ngày:</span>
                    <strong style={{ fontSize: '1rem' }}>
                      {selectedShareForSchedule.startDate ? formatDate(selectedShareForSchedule.startDate) : 'N/A'}
                      {selectedShareForSchedule.endDate && (
                        <> → {formatDate(selectedShareForSchedule.endDate)}</>
                      )}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ opacity: 0.9, minWidth: '90px' }}>⏰ Giờ:</span>
                    <strong style={{ fontSize: '1rem' }}>
                      {(() => {
                        // Kiểm tra scheduleMode
                        if (selectedShareForSchedule.scheduleMode === 'specific_days' && selectedShareForSchedule.specificSchedules?.length > 0) {
                          // Hiển thị thời gian từ specific schedules
                          const uniqueTimes = [...new Set(
                            selectedShareForSchedule.specificSchedules.map(s => 
                              `${s.startTime?.substring(0, 5)} - ${s.endTime?.substring(0, 5)}`
                            )
                          )];
                          return uniqueTimes.length === 1 ? uniqueTimes[0] : 'Theo lịch cụ thể';
                        } else if (selectedShareForSchedule.scheduleMode === 'weekdays' && selectedShareForSchedule.weekdaySchedules) {
                          // Weekday schedule
                          return 'Theo thứ trong tuần';
                        } else if (selectedShareForSchedule.startTime && selectedShareForSchedule.endTime && 
                                   selectedShareForSchedule.startTime !== '00:00:00' && 
                                   selectedShareForSchedule.endTime !== '00:00:00') {
                          // Thời gian cố định
                          return `${selectedShareForSchedule.startTime.substring(0, 5)} - ${selectedShareForSchedule.endTime.substring(0, 5)}`;
                        } else {
                          return 'Cả ngày';
                        }
                      })()}
                    </strong>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ opacity: 0.9, minWidth: '90px' }}>🏢 Từ Gym:</span>
                    <strong style={{ fontSize: '1rem' }}>
                      {selectedShareForSchedule.fromGym?.name || selectedShareForSchedule.FromGym?.name || 'N/A'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ opacity: 0.9, minWidth: '90px' }}>🎯 Đến Gym:</span>
                    <strong style={{ fontSize: '1rem' }}>
                      {selectedShareForSchedule.toGym?.name || selectedShareForSchedule.ToGym?.name || 'N/A'}
                    </strong>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ opacity: 0.9, minWidth: '90px' }}>📦 Loại:</span>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      background: 'rgba(255,255,255,0.25)', 
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      backdropFilter: 'blur(10px)'
                    }}>
                      {selectedShareForSchedule.shareType === 'temporary' ? '⏱️ Tạm thời' : '♾️ Vĩnh viễn'}
                    </span>
                  </div>

                  {selectedShareForSchedule.commissionSplit && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span style={{ opacity: 0.9, minWidth: '90px' }}>💰 Hoa hồng:</span>
                      <strong style={{ fontSize: '1rem' }}>
                        {(selectedShareForSchedule.commissionSplit * 100).toFixed(0)}%
                      </strong>
                    </div>
                  )}

                  {selectedShareForSchedule.scheduleMode === 'specific_days' && selectedShareForSchedule.specificSchedules?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                      <span style={{ opacity: 0.9, fontWeight: '600' }}>📆 Lịch cụ thể:</span>
                      <div style={{ 
                        padding: '0.75rem', 
                        background: 'rgba(255,255,255,0.15)', 
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        backdropFilter: 'blur(10px)',
                        display: 'grid',
                        gap: '0.5rem'
                      }}>
                        {selectedShareForSchedule.specificSchedules.map((schedule, idx) => (
                          <div key={idx} style={{ 
                            padding: '0.5rem', 
                            background: 'rgba(255,255,255,0.1)', 
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}>
                            <span style={{ fontWeight: '600' }}>
                              {schedule.date ? formatDate(schedule.date) : `Ngày ${idx + 1}`}
                            </span>
                            <span>
                              ⏰ {schedule.startTime?.substring(0, 5)} - {schedule.endTime?.substring(0, 5)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedShareForSchedule.notes && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                      <span style={{ opacity: 0.9, fontWeight: '600' }}>📝 Lý do/Ghi chú:</span>
                      <div style={{ 
                        padding: '0.75rem', 
                        background: 'rgba(255,255,255,0.15)', 
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        backdropFilter: 'blur(10px)'
                      }}>
                        {selectedShareForSchedule.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lịch làm việc */}
              {loadingShareSchedule ? (
                <div className="ots-loading" style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                  <div>Đang tải lịch...</div>
                </div>
              ) : shareTrainerSchedule.length === 0 ? (
                <div className="ots-empty" style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📭</div>
                  <p style={{ margin: 0, color: '#64748b' }}>Không có lịch trong khoảng thời gian này</p>
                </div>
              ) : (
                <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📅</span>
                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem' }}>
                      Lịch làm việc ({shareTrainerSchedule.length} ngày)
                    </h4>
                  </div>
                  
                  {shareTrainerSchedule.map((schedule, idx) => {
                    const filteredScheduleBookings = schedule.bookings?.filter(b => b.type !== 'trainer_share') || [];
                    return (
                    <div 
                      key={idx} 
                      style={{ 
                        marginBottom: '1rem', 
                        padding: '1rem', 
                        background: filteredScheduleBookings.length === 0 ? '#f0fdf4' : '#fef2f2',
                        border: `2px solid ${filteredScheduleBookings.length === 0 ? '#86efac' : '#fca5a5'}`,
                        borderRadius: '10px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: filteredScheduleBookings.length > 0 ? '0.75rem' : 0
                      }}>
                        <h4 style={{ margin: 0, color: '#1e293b', fontSize: '0.95rem', fontWeight: '600' }}>
                          📅 {new Date(schedule.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h4>
                        {filteredScheduleBookings.length === 0 ? (
                          <span style={{ 
                            color: '#16a34a', 
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            padding: '0.25rem 0.75rem',
                            background: '#dcfce7',
                            borderRadius: '20px'
                          }}>
                            ✓ Trống
                          </span>
                        ) : (
                          <span style={{ 
                            color: '#dc2626', 
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            padding: '0.25rem 0.75rem',
                            background: '#fee2e2',
                            borderRadius: '20px'
                          }}>
                            ⚠️ {filteredScheduleBookings.length} lịch
                          </span>
                        )}
                      </div>
                      
                      {filteredScheduleBookings.length > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          {filteredScheduleBookings.map((booking, bidx) => (
                            <div 
                              key={bidx} 
                              style={{ 
                                padding: '0.75rem',
                                background: 'white',
                                borderRadius: '8px',
                                marginBottom: bidx < schedule.bookings.length - 1 ? '0.5rem' : 0,
                                border: '1px solid #fecaca',
                                fontSize: '0.9rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <span style={{ 
                                  fontWeight: '700', 
                                  color: '#dc2626',
                                  fontSize: '0.95rem',
                                  minWidth: '110px'
                                }}>
                                  🕐 {booking.startTime} - {booking.endTime}
                                </span>
                                {booking.Member?.User?.username && (
                                  <span style={{ color: '#475569' }}>
                                    👤 {booking.Member.User.username}
                                  </span>
                                )}
                                {booking.status && (
                                  <span style={{ 
                                    padding: '0.15rem 0.5rem',
                                    background: '#f1f5f9',
                                    borderRadius: '12px',
                                    fontSize: '0.85rem',
                                    color: '#64748b'
                                  }}>
                                    {booking.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}

              <div className="ots-modal__footer">
                <button
                  type="button"
                  className="ots-btn ots-btn--secondary"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Đóng
                </button>
                {selectedShareForSchedule.status === 'waiting_acceptance' && (
                  <>
                    <button
                      type="button"
                      className="ots-btn ots-btn--success"
                      onClick={() => {
                        setShowScheduleModal(false);
                        handleAcceptShare(selectedShareForSchedule.id);
                      }}
                    >
                      ✓ Chấp nhận yêu cầu
                    </button>
                    <button
                      type="button"
                      className="ots-btn ots-btn--danger"
                      onClick={() => {
                        setShowScheduleModal(false);
                        handleRejectShare(selectedShareForSchedule.id);
                      }}
                    >
                      ✗ Từ chối yêu cầu
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedShare && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết phiếu chuyển kho #{selectedShare.id}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Từ Gym:</span>
                  <span className="detail-value">{selectedShare.fromGym?.name || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Đến Gym:</span>
                  <span className="detail-value">{selectedShare.toGym?.name || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Huấn luyện viên:</span>
                  <span className="detail-value">{selectedShare.Trainer?.User?.username || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Loại:</span>
                  <span className="detail-value">{selectedShare.shareType === 'temporary' ? 'Tạm thời' : 'Vĩnh viễn'}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Ngày bắt đầu:</span>
                  <span className="detail-value">{formatDate(selectedShare.startDate)}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Ngày kết thúc:</span>
                  <span className="detail-value">{formatDate(selectedShare.endDate)}</span>
                </div>

                {selectedShare.startTime && selectedShare.startTime !== '00:00:00' && (
                  <>
                    <div className="detail-row">
                      <span className="detail-label">Giờ bắt đầu:</span>
                      <span className="detail-value">{selectedShare.startTime.substring(0, 5)}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Giờ kết thúc:</span>
                      <span className="detail-value">{selectedShare.endTime?.substring(0, 5) || "—"}</span>
                    </div>
                  </>
                )}

                <div className="detail-row">
                  <span className="detail-label">Hoa hồng:</span>
                  <span className="detail-value">{(selectedShare.commissionSplit * 100).toFixed(0)}%</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Trạng thái:</span>
                  <span className="detail-value"><StatusBadge status={selectedShare.status} /></span>
                </div>

                {selectedShare.Member && (
                  <div className="detail-row">
                    <span className="detail-label">Hội viên:</span>
                    <span className="detail-value">{selectedShare.Member?.User?.username || "—"}</span>
                  </div>
                )}

                {selectedShare.notes && (
                  <div className="detail-row detail-row--full">
                    <span className="detail-label">Ghi chú:</span>
                    <span className="detail-value">{selectedShare.notes}</span>
                  </div>
                )}

                <div className="detail-row detail-row--full">
                  <span className="detail-label">Ngày tạo:</span>
                  <span className="detail-value">{formatDate(selectedShare.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {selectedShare.status === "waiting_acceptance" && (
                <>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedShare);
                    }}
                    className="btn-secondary"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleDelete(selectedShare.id);
                    }}
                    className="btn-danger"
                  >
                    Xóa
                  </button>
                </>
              )}
              <button onClick={() => setShowDetailModal(false)} className="btn-cancel">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
