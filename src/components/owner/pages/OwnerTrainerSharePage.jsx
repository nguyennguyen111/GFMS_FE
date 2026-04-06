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
import { connectSocket } from "../../../services/socketClient";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import axios from "../../../setup/axios";
import useSelectedGym from "../../../hooks/useSelectedGym";

const STATUS_LABELS = {
 // Trainer Share statuses
 waiting_acceptance: { label: "Chờ chấp nhận", color: "info" },
 pending: { label: "Đang xử lý", color: "warning" },
 approved: { label: "Đã duyệt", color: "success" },
 shared: { label: "Lịch mượn huấn luyện viên", color: "info" },
 rejected: { label: "Từ chối", color: "danger" },
 rejected_by_partner: { label: "Đối tác từ chối", color: "danger" },
 
 // Booking statuses
 confirmed: { label: "Đã xác nhận", color: "info" },
 in_progress: { label: "Đang diễn ra", color: "warning" },
 completed: { label: "Hoàn thành", color: "success" },
 cancelled: { label: "Đã hủy", color: "danger" },
 no_show: { label: "Vắng mặt", color: "danger" },
};

const DAY_LABELS = {
 monday: "Thứ 2",
 tuesday: "Thứ 3",
 wednesday: "Thứ 4",
 thursday: "Thứ 5",
 friday: "Thứ 6",
 saturday: "Thứ 7",
 sunday: "Chủ nhật",
};

const DAY_KEYS_BY_INDEX = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DEFAULT_SHARE_TYPE = "temporary";
const DEFAULT_COMMISSION_SPLIT = 0.7;

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

function cleanQueryParams(params) {
 return Object.fromEntries(
 Object.entries(params).filter(([, value]) => {
 if (value === undefined || value === null) return false;
 if (typeof value === "string") return value.trim() !== "";
 return true;
 })
 );
}

function getTodayValue() {
 return new Date().toISOString().split("T")[0];
}

function getDayKeyFromDate(dateValue) {
 if (!dateValue) return null;
 const date = new Date(dateValue);
 if (Number.isNaN(date.getTime())) return null;
 return DAY_KEYS_BY_INDEX[date.getDay()] || null;
}

function normalizeTimeValue(timeValue) {
 if (!timeValue) return "";
 const parts = String(timeValue).split(":");
 if (parts.length < 2) return "";
 return `${String(parts[0]).padStart(2, "0")}:${String(parts[1]).padStart(2, "0")}`;
}

function timeToMinutes(timeValue) {
 const normalized = normalizeTimeValue(timeValue);
 if (!normalized) return null;
 const [hours, minutes] = normalized.split(":").map(Number);
 if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
 return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
 if (!Number.isFinite(totalMinutes)) return "";
 const safeMinutes = Math.max(0, totalMinutes);
 const hours = Math.floor(safeMinutes / 60);
 const minutes = safeMinutes % 60;
 return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeRanges(ranges = []) {
 return (Array.isArray(ranges) ? ranges : [])
 .map((range) => ({
 start: normalizeTimeValue(range?.start),
 end: normalizeTimeValue(range?.end),
 }))
 .filter((range) => range.start && range.end && range.start < range.end);
}

function mergeBlocks(blocks = []) {
 const normalized = blocks
 .map((block) => ({
 startMinute: timeToMinutes(block?.startTime),
 endMinute: timeToMinutes(block?.endTime),
 }))
 .filter((block) => block.startMinute !== null && block.endMinute !== null && block.startMinute < block.endMinute)
 .sort((a, b) => a.startMinute - b.startMinute);

 const merged = [];
 normalized.forEach((block) => {
 const last = merged[merged.length - 1];
 if (!last || block.startMinute > last.endMinute) {
 merged.push({ ...block });
 return;
 }
 last.endMinute = Math.max(last.endMinute, block.endMinute);
 });
 return merged;
}

function subtractBusyBlocks(availableRanges = [], busyBlocks = []) {
 const mergedBusy = mergeBlocks(busyBlocks);

 return normalizeRanges(availableRanges).flatMap((range) => {
 const startMinute = timeToMinutes(range.start);
 const endMinute = timeToMinutes(range.end);
 if (startMinute === null || endMinute === null || startMinute >= endMinute) return [];

 let cursor = startMinute;
 const freeRanges = [];

 mergedBusy.forEach((busy) => {
 if (busy.endMinute <= cursor || busy.startMinute >= endMinute) {
 return;
 }

 if (busy.startMinute > cursor) {
 freeRanges.push({
 start: minutesToTime(cursor),
 end: minutesToTime(Math.min(busy.startMinute, endMinute)),
 });
 }

 cursor = Math.max(cursor, busy.endMinute);
 });

 if (cursor < endMinute) {
 freeRanges.push({
 start: minutesToTime(cursor),
 end: minutesToTime(endMinute),
 });
 }

 return freeRanges.filter((freeRange) => freeRange.start && freeRange.end && freeRange.start < freeRange.end);
 });
}

function hasAnyWorkingHours(availableHours) {
 if (!availableHours || typeof availableHours !== "object") return false;
 return Object.values(availableHours).some((ranges) => normalizeRanges(ranges).length > 0);
}

function getEligiblePtPackages(packageActivations = [], trainerId) {
 const activePtPackages = (Array.isArray(packageActivations) ? packageActivations : []).filter((activation) =>
 activation?.Package?.packageType === 'personal_training' &&
 activation?.status === 'active' &&
 (activation?.sessionsRemaining > 0 || activation?.sessionsRemaining === null)
 );

 const exactMatchPackages = activePtPackages.filter(
 (activation) => Number(activation?.Package?.trainerId) === Number(trainerId)
 );

 return {
 exactMatch: exactMatchPackages.length > 0,
 packages: exactMatchPackages.length > 0 ? exactMatchPackages : activePtPackages,
 };
}

// PT Package Info Component
function PTPackageInfo({ memberId, trainerId, onPackageSelect, selectedPackageActivationId }) {
 const [ptPackages, setPtPackages] = useState([]);
 const [loading, setLoading] = useState(false);
 const [isSharedTrainerFallback, setIsSharedTrainerFallback] = useState(false);

 useEffect(() => {
 const loadPTPackages = async () => {
 if (!memberId || !trainerId) return;
 
 setLoading(true);
 try {
 const response = await ownerMemberService.getMemberDetail(memberId);
 const member = response.data;
 
 if (member && member.PackageActivations) {
 const eligible = getEligiblePtPackages(member.PackageActivations, trainerId);
 setPtPackages(eligible.packages);
 setIsSharedTrainerFallback(!eligible.exactMatch && eligible.packages.length > 0);
 
 // Auto-select first package if available
 if (eligible.packages.length > 0 && !selectedPackageActivationId) {
 onPackageSelect(eligible.packages[0].id, eligible.packages[0].packageId);
 }
 } else {
 setPtPackages([]);
 setIsSharedTrainerFallback(false);
 }
 } catch (error) {
 setPtPackages([]);
 setIsSharedTrainerFallback(false);
 } finally {
 setLoading(false);
 }
 };

 loadPTPackages();
 }, [memberId, trainerId, selectedPackageActivationId, onPackageSelect]); // Added selectedPackageActivationId to deps

 if (loading) {
 return <div className="ots-pt-package-info" style={{padding: '12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '10px', marginBottom: '12px'}}>
 <div style={{color: 'rgba(238, 242, 255, 0.7)'}}>Đang tải gói huấn luyện viên...</div>
 </div>;
 }

 if (ptPackages.length === 0) {
 return <div className="ots-pt-package-info" style={{padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', marginBottom: '12px'}}>
 <div style={{color: '#ef4444', fontWeight: 'bold'}}>Hội viên chưa có gói huấn luyện viên còn hiệu lực để đặt lịch</div>
 <div style={{fontSize: '0.85rem', color: 'rgba(238, 242, 255, 0.6)', marginTop: '4px'}}>
 Vui lòng mua gói huấn luyện viên cho hội viên trước khi đặt lịch
 </div>
 </div>;
 }

 return (
 <div className="ots-pt-package-info" style={{marginBottom: '12px'}}>
 <label className="ots-field__label" style={{marginBottom: '8px', display: 'block'}}>
 Chọn gói huấn luyện viên <span className="ots-required">*</span>
 </label>
 {isSharedTrainerFallback && (
 <div className="ots-field__hint" style={{marginBottom: '8px', color: '#fbbf24'}}>
 Đang dùng gói PT gốc của hội viên để xếp lịch với PT thay thế.
 </div>
 )}
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
 {selectedPackageActivationId === pa.id && ' '}
 {pa.Package?.name || 'Gói huấn luyện viên'}
 </div>
 <div style={{fontSize: '0.85rem', color: 'rgba(238, 242, 255, 0.7)'}}>
 Tổng: {pa.totalSessions || 0} buổi | Đã tập: {pa.sessionsUsed || 0} buổi
 </div>
 {pa.Package?.Trainer?.User?.username && (
 <div style={{fontSize: '0.78rem', color: 'rgba(238, 242, 255, 0.55)', marginTop: '4px'}}>
 PT gốc: {pa.Package.Trainer.User.username}
 </div>
 )}
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

const INITIAL_FORM = {
 trainerId: "",
 fromGymId: "",
 toGymId: "",
 memberId: "", // Optional: Nếu chọn member, khi approve sẽ tự động tạo booking
 scheduleMode: "single", // single, date_range, multiple_dates
 startDate: "",
 endDate: "",
 startTime: "",
 endTime: "",
 multipleDates: [], // [{date: "2026-01-01", startTime: "09:00", endTime: "10:00"}]
 notes: "",
};

const INITIAL_BOOKING = {
 memberId: "",
 trainerId: "",
 gymId: "",
 packageActivationId: "",
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

export default function OwnerTrainerSharePage({ pageMode = "shares" }) {
 const { selectedGymId, selectedGymName } = useSelectedGym();
 const isBookingsPage = pageMode === "bookings";
 const [activeTab, setActiveTab] = useState(isBookingsPage ? "bookings" : "shares"); // bookings or shares
 
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
 const [allOwnerTrainers, setAllOwnerTrainers] = useState([]);
 const [trainers, setTrainers] = useState([]);
 const [members, setMembers] = useState([]);
 const [packages, setPackages] = useState([]);
 const [loadingLookups, setLoadingLookups] = useState(false);
 const [availabilityFilters, setAvailabilityFilters] = useState({ gymId: "", date: getTodayValue() });
 const [trainerAvailability, setTrainerAvailability] = useState([]);
 const [loadingAvailability, setLoadingAvailability] = useState(false);

 useEffect(() => {
 const scopedGymId = selectedGymId ? String(selectedGymId) : "";
 setForm((prev) => ({
 ...prev,
 toGymId: scopedGymId || prev.toGymId,
 memberId: scopedGymId && prev.toGymId && String(prev.toGymId) !== scopedGymId ? "" : prev.memberId,
 }));
 setBookingForm((prev) => ({
 ...prev,
 gymId: scopedGymId || prev.gymId,
 trainerId: scopedGymId && prev.gymId && String(prev.gymId) !== scopedGymId ? "" : prev.trainerId,
 memberId: scopedGymId && prev.gymId && String(prev.gymId) !== scopedGymId ? "" : prev.memberId,
 packageActivationId: scopedGymId && prev.gymId && String(prev.gymId) !== scopedGymId ? "" : prev.packageActivationId,
 packageId: scopedGymId && prev.gymId && String(prev.gymId) !== scopedGymId ? "" : prev.packageId,
 }));
 setBookingFilters((prev) => ({ ...prev, gymId: scopedGymId }));
 setAvailabilityFilters((prev) => ({ ...prev, gymId: scopedGymId || prev.gymId }));
 }, [selectedGymId]);

 useEffect(() => {
 setActiveTab(isBookingsPage ? "bookings" : "shares");
 }, [isBookingsPage]);

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

 const availabilityTrainers = React.useMemo(() => {
 if (!availabilityFilters.gymId) return allOwnerTrainers;
 return allOwnerTrainers.filter((trainer) => {
 const trainerGymId = trainer.gymId || trainer.Gym?.id;
 return trainerGymId && trainerGymId.toString() === availabilityFilters.gymId.toString();
 });
 }, [allOwnerTrainers, availabilityFilters.gymId]);

 const visibleTrainerAvailability = trainerAvailability.filter(({ availableRanges }) => availableRanges.length > 0);
 const visibleShares = React.useMemo(() => {
 if (!selectedGymId) return shares;
 return shares.filter((share) => String(share?.toGymId || share?.toGym?.id || "") === String(selectedGymId));
 }, [selectedGymId, shares]);

 const visibleReceivedShares = React.useMemo(() => {
 if (!selectedGymId) return receivedShares;
 return receivedShares.filter((share) => String(share?.fromGymId || share?.FromGym?.id || "") === String(selectedGymId));
 }, [receivedShares, selectedGymId]);

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
 const { packages: ptPackages } = getEligiblePtPackages(member.PackageActivations, bookingForm.trainerId);

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
 setAllOwnerTrainers(trainersRes?.data || []);
 setTrainers(trainersRes?.data || []);
 setMembers(membersRes?.data || []);
 setPackages(packagesRes?.data?.data || []);
 setAvailabilityFilters((prev) => ({
 ...prev,
 gymId: prev.gymId || String(myGyms?.[0]?.id || ""),
 }));
 } catch (err) {
 } finally {
 setLoadingLookups(false);
 }
 };

 const loadTrainerAvailability = useCallback(async () => {
 if (!isBookingsPage || activeTab !== "bookings") return;
 if (!availabilityFilters.date) {
 setTrainerAvailability([]);
 return;
 }

 const dayKey = getDayKeyFromDate(availabilityFilters.date);
 if (!dayKey) {
 setTrainerAvailability([]);
 return;
 }

 if (availabilityTrainers.length === 0) {
 setTrainerAvailability([]);
 return;
 }

 setLoadingAvailability(true);
 try {
 const results = await Promise.all(
 availabilityTrainers.map(async (trainer) => {
 const scheduleResponse = await ownerBookingService.getTrainerSchedule(trainer.id, availabilityFilters.date, { includeAllGyms: true });
 const occupiedBlocks = Array.isArray(scheduleResponse?.data)
 ? scheduleResponse.data
 : Array.isArray(scheduleResponse)
 ? scheduleResponse
 : [];
 const availableRanges = normalizeRanges(trainer.availableHours?.[dayKey] || []);
 const freeRanges = subtractBusyBlocks(availableRanges, occupiedBlocks);
 const hasConfiguredHours = hasAnyWorkingHours(trainer.availableHours);

 let availabilityState = "busy";
 if (!availableRanges.length) {
 availabilityState = hasConfiguredHours ? "off" : "unconfigured";
 } else if (freeRanges.length > 0) {
 availabilityState = "free";
 }

 return {
 trainer,
 occupiedBlocks: occupiedBlocks
 .map((item) => ({
 id: item.id,
 startTime: normalizeTimeValue(item.startTime),
 endTime: normalizeTimeValue(item.endTime),
 status: item.status,
 type: item.type,
 memberName: item.Member?.User?.username || null,
 }))
 .filter((item) => item.startTime && item.endTime),
 availableRanges,
 freeRanges,
 availabilityState,
 };
 })
 );

 setTrainerAvailability(results);
 } catch (err) {
 setTrainerAvailability([]);
 setError(err?.response?.data?.message || "Không thể tải lịch rảnh của huấn luyện viên");
 } finally {
 setLoadingAvailability(false);
 }
 }, [activeTab, availabilityFilters.date, availabilityTrainers, isBookingsPage]);

 // Load trainer shares
 const loadShares = useCallback(async (page = currentPage) => {
 try {
 setLoading(true);
 setError("");
 const params = cleanQueryParams({ ...filters, page, limit: 10 });

 const res = await ownerGetMyTrainerShares(params);
 
 setShares(res.data?.data || []);
 setPagination(res.data?.pagination || {});
 } catch (err) {
 console.error('Error loading trainer shares:', err);
 setError(err.response?.data?.message || err.message || "Không thể tải danh sách");
 } finally {
 setLoading(false);
 }
 }, [currentPage, filters]);

 // Load received trainer share requests (Owner B)
 const loadReceivedShares = useCallback(async (page = receivedCurrentPage) => {
 try {
 setLoading(true);
 setError("");
 const params = cleanQueryParams({ ...receivedFilters, page, limit: 10 });

 const res = await ownerGetReceivedTrainerShares(params);
 setReceivedShares(res.data?.data || []);
 setReceivedPagination(res.data?.pagination || {});
 } catch (err) {
 console.error('Error loading received shares:', err);
 setError(err.response?.data?.message || err.message || "Không thể tải danh sách yêu cầu");
 } finally {
 setLoading(false);
 }
 }, [receivedCurrentPage, receivedFilters]);

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
 if (!window.confirm("Bạn có chắc muốn chấp nhận yêu cầu này?")) return;

 try {
 setError("");
 setSuccess("");
 await ownerAcceptTrainerShare(id);
 setSuccess("Đã chấp nhận yêu cầu thành công.");
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
 const loadBookings = useCallback(async (page = bookingCurrentPage) => {
 try {
 setLoading(true);
 setError("");
 const params = cleanQueryParams({
 q: bookingFilters.q,
 status: bookingFilters.status,
 gymId: selectedGymId ? String(selectedGymId) : bookingFilters.gymId,
 trainerId: bookingFilters.trainerId,
 fromDate: bookingFilters.startDate,
 toDate: bookingFilters.endDate,
 page,
 limit: 8,
 });

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
 
 // Use approved shares requested by current owner (borrower side)
 let approvedShares = myApprovedShares;

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

 // Nếu đã có booking thực tế cho khung giờ mượn PT thì ẩn dòng "Lịch mượn huấn luyện viên"
 const toDateOnly = (value) => {
 if (!value) return "";
 return String(value).split("T")[0];
 };

 const toMinutes = (timeValue) => {
 if (!timeValue) return null;
 const [h, m] = String(timeValue).split(":");
 const hh = Number(h);
 const mm = Number(m);
 if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
 return hh * 60 + mm;
 };

 approvedShares = approvedShares.filter((share) => {
 const shareDate = toDateOnly(share.startDate);
 const shareStart = toMinutes(share.startTime || "00:00:00");
 const shareEnd = toMinutes(share.endTime || "23:59:59");

 const hasRealBooking = bookingsData.some((booking) => {
 if (booking.type === "trainer_share") return false;
 if (String(booking.status || "").toLowerCase() === "cancelled") return false;

 const sameTrainer = String(booking.trainerId || "") === String(share.trainerId || "");
 const sameGym = String(booking.gymId || "") === String(share.toGymId || "");
 const sameDate = toDateOnly(booking.bookingDate) === shareDate;
 const sameMember = !share.memberId || String(booking.memberId || "") === String(share.memberId);

 if (!sameTrainer || !sameGym || !sameDate || !sameMember) return false;

 const bookingStart = toMinutes(booking.startTime || "00:00:00");
 const bookingEnd = toMinutes(booking.endTime || "23:59:59");
 if (shareStart === null || shareEnd === null || bookingStart === null || bookingEnd === null) {
 return true;
 }

 return bookingStart < shareEnd && bookingEnd > shareStart;
 });

 return !hasRealBooking;
 });

 // Convert approved shares to booking-like format for table/calendar display
 const shareBookings = approvedShares.map(share => ({
 ...share,
 id: `share-${share.id}`,
 type: 'trainer_share',
 status: 'shared',
 bookingDate: share.startDate,
 startTime: share.startTime || '00:00:00',
 endTime: share.endTime || '23:59:59',
 Member: { User: { username: 'Chia sẻ huấn luyện viên' } },
 Package: { name: share.shareType === 'temporary' ? 'Tạm thời' : 'Vĩnh viễn' }
 }));

 // Combine bookings and shares
 bookingsData = [...bookingsData, ...shareBookings].sort((a, b) => {
 const dateA = new Date(a.bookingDate);
 const dateB = new Date(b.bookingDate);
 return dateB - dateA; // Newest first
 });
 
 setBookings(bookingsData);
 setBookingPagination(res.pagination || res.data?.pagination || {});
 } catch (err) {
 console.error('Error loading bookings:', err);
 setError(err.response?.data?.message || err.message || "Không thể tải danh sách booking");
 } finally {
 setLoading(false);
 }
 }, [bookingFilters, bookingCurrentPage, selectedGymId]);

 useEffect(() => {
 loadLookups();
 }, []);

 useEffect(() => {
 if (!isBookingsPage && activeTab !== "bookings") {
 return;
 }
 loadBookings();
 }, [
 bookingCurrentPage,
 isBookingsPage,
 activeTab,
 loadBookings,
 trainers.length
 ]);

 useEffect(() => {
 loadTrainerAvailability();
 }, [loadTrainerAvailability]);

useEffect(() => {
 if (!isBookingsPage) return undefined;

 const socket = connectSocket();
 const onBookingStatusChanged = (payload) => {
 if (activeTab !== "bookings") return;

 setBookings((prev) => {
 const exists = prev.some((item) => String(item.id) === String(payload?.bookingId));
 if (!exists) return prev;
 return prev.map((item) => (
 String(item.id) === String(payload?.bookingId)
 ? { ...item, status: payload?.status || item.status }
 : item
 ));
 });

 loadBookings();
 loadTrainerAvailability();
 };

 socket.on("booking:status-changed", onBookingStatusChanged);

 return () => {
 socket.off("booking:status-changed", onBookingStatusChanged);
 };
}, [activeTab, isBookingsPage, loadBookings, loadTrainerAvailability]);

const refreshTrainerShareData = useCallback(async () => {
 const tasks = [loadShares(currentPage), loadReceivedShares(receivedCurrentPage)];

 if (isBookingsPage && activeTab === "bookings") {
 tasks.push(loadBookings(bookingCurrentPage));
 tasks.push(loadTrainerAvailability());
 }

 await Promise.all(tasks);
}, [
 activeTab,
 bookingCurrentPage,
 currentPage,
 isBookingsPage,
 loadBookings,
 loadReceivedShares,
 loadShares,
 loadTrainerAvailability,
 receivedCurrentPage,
]);

useOwnerRealtimeRefresh({
 enabled: activeTab === "requests" || activeTab === "received" || isBookingsPage,
 onRefresh: refreshTrainerShareData,
 events: ["notification:new", "trainer_share:changed"],
 notificationTypes: ["trainer_share"],
});

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
 setForm({ ...INITIAL_FORM, toGymId: selectedGymId ? String(selectedGymId) : "" });
 setShowModal(true);
 };

 // Mở modal tạo mới booking
 const handleCreateBooking = () => {
 setEditing(null);
 setBookingForm({ ...INITIAL_BOOKING, gymId: selectedGymId ? String(selectedGymId) : "" });
 setShowBookingModal(true);
 };

 const handleQuickBookFromAvailability = (trainer, range) => {
 const trainerGymId = trainer.gymId || trainer.Gym?.id || availabilityFilters.gymId || "";
 setEditing(null);
 setBookingForm({
 ...INITIAL_BOOKING,
 gymId: trainerGymId ? String(trainerGymId) : "",
 trainerId: trainer.id ? String(trainer.id) : "",
 bookingMode: "single",
 bookingDate: availabilityFilters.date || getTodayValue(),
 startTime: range.start,
 endTime: range.end,
 });
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
 packageActivationId: booking.packageActivationId || "",
 packageId: booking.packageId || "",
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
 startDate: share.startDate ? share.startDate.slice(0, 10) : "",
 endDate: share.endDate ? share.endDate.slice(0, 10) : "",
 startTime: share.startTime || "",
 endTime: share.endTime || "",
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
 packageActivationId: bookingForm.packageActivationId,
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
 packageActivationId: bookingForm.packageActivationId,
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
 packageActivationId: bookingForm.packageActivationId,
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

 const toTimeInputValue = (timeStr, fallback = "") => {
 if (!timeStr) return fallback;
 const parts = String(timeStr).split(":");
 if (parts.length < 2) return fallback;
 const hh = String(parts[0]).padStart(2, "0");
 const mm = String(parts[1]).padStart(2, "0");
 return `${hh}:${mm}`;
 };

 const handleShareAttendance = async (share, mode) => {
 if (!share?.memberId) {
 setError("Phiếu mượn huấn luyện viên chưa gắn hội viên. Vui lòng tạo booking thủ công ở tab Đặt lịch trước khi điểm danh.");
 return;
 }

 const statusText = mode === "present" ? "điểm danh có mặt" : "điểm danh vắng";
 if (!window.confirm(`Bạn có chắc muốn ${statusText} cho lịch mượn huấn luyện viên này?`)) return;

 const normalizedStart = toTimeInputValue(share.startTime, "08:00");
 const normalizedEnd = toTimeInputValue(share.endTime, addHoursToTime(normalizedStart, 2));
 const bookingDate = share.startDate ? String(share.startDate).slice(0, 10) : "";

 if (!bookingDate) {
 setError("Không xác định được ngày của lịch mượn huấn luyện viên");
 return;
 }

 try {
 setError("");
 setSuccess("");

 const created = await ownerBookingService.createBooking({
 memberId: share.memberId,
 trainerId: share.trainerId,
 gymId: share.toGymId,
 bookingDate,
 startTime: normalizedStart,
 endTime: normalizedEnd,
 notes: `Booking từ lịch mượn huấn luyện viên #${share.id}`,
 });

 const bookingId = created?.data?.id || created?.id;
 if (!bookingId) {
 throw new Error("Tạo booking thành công nhưng không nhận được bookingId");
 }

 if (mode === "present") {
 await ownerBookingService.updateBookingStatus(bookingId, "in_progress");
 setSuccess("Đã tạo booking từ lịch mượn huấn luyện viên và điểm danh Có mặt.");
 } else {
 await ownerBookingService.updateBookingStatus(bookingId, "no_show");
 setSuccess("Đã tạo booking từ lịch mượn huấn luyện viên và điểm danh Vắng.");
 }

 loadBookings();
 } catch (err) {
 setError(err.response?.data?.message || err.message || "Không thể điểm danh từ lịch mượn huấn luyện viên");
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
 if (!form.startDate && form.scheduleMode === "single") {
 setError("Vui lòng chọn ngày mượn huấn luyện viên");
 return;
 }

 const sharePayload = {
 ...form,
 shareType: DEFAULT_SHARE_TYPE,
 commissionSplit: DEFAULT_COMMISSION_SPLIT,
 };

 if (editing) {
 await ownerUpdateTrainerShare(editing.id, sharePayload);
 setSuccess("Cập nhật yêu cầu thành công!");
 } else {
 await ownerCreateTrainerShare(sharePayload);
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

 const pageTitle = isBookingsPage ? "Đặt lịch tập" : "Chia sẻ huấn luyện viên";
 const pageSubtitle = isBookingsPage
 ? `Quản lý lịch tập với huấn luyện viên mượn${selectedGymName ? ` tại ${selectedGymName}` : " theo một trang riêng"}`
 : `Quản lý yêu cầu mượn và cho mượn huấn luyện viên${selectedGymName ? ` cho ${selectedGymName}` : " giữa các phòng tập"}`;

 const primaryAction = isBookingsPage
 ? handleCreateBooking
 : activeTab === "shares"
 ? handleCreate
 : null;

 const primaryLabel = isBookingsPage
 ? "Đặt lịch mới"
 : activeTab === "shares"
 ? "Tạo yêu cầu chia sẻ huấn luyện viên"
 : "";

 return (
 <div className="ots-page">
 <div className="ots-header">
 <div>
 <h1 className="ots-title">{pageTitle}</h1>
 <p className="ots-subtitle">{pageSubtitle}</p>
 </div>
 {(isBookingsPage || activeTab !== "received") && primaryAction && (
 <button 
 className="btn-primary" 
 onClick={primaryAction}
 >
 + {primaryLabel}
 </button>
 )}
 </div>

 {/* Tab Navigation */}
 {!isBookingsPage && (
 <div className="ots-tabs">
 <button
 className={`ots-tab ${activeTab === "shares" ? "active" : ""}`}
 onClick={() => setActiveTab("shares")}
 >
 Yêu cầu xin mượn huấn luyện viên
 </button>
 <button
 className={`ots-tab ${activeTab === "received" ? "active" : ""}`}
 onClick={() => setActiveTab("received")}
 >
 Yêu cầu cho mượn huấn luyện viên
 </button>
 </div>
 )}

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
 <option value="waiting_acceptance">Chờ chấp nhận</option>
 <option value="pending">Đang xử lý</option>
 <option value="approved">Đã chấp nhận</option>
 <option value="rejected">Từ chối</option>
 </select>
 <button className="btn-primary" onClick={() => { setCurrentPage(1); loadShares(1); }}>
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
 ) : visibleShares.length === 0 ? (
 <div className="ots-empty">
 <p>Chưa có yêu cầu chia sẻ huấn luyện viên nào</p>
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
 <th>Thời gian</th>
 <th>Trạng thái</th>
 <th>Thao tác</th>
 </tr>
 </thead>
 <tbody>
 {visibleShares.map((share) => (
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
 <td>
 <div>
 <div>
 {share.startDate ? `${formatDate(share.startDate)} - ${formatDate(share.endDate || share.startDate)}` : "Không giới hạn"}
 </div>
 {share.startTime && share.endTime && 
 share.startTime !== '00:00:00' && 
 share.endTime !== '00:00:00' && (
 <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '0.25rem' }}>
 {share.startTime.substring(0, 5)} - {share.endTime.substring(0, 5)}
 </div>
 )}
 </div>
 </td>
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
 <span className="ots-text--info"> Đang xử lý</span>
 )}
 {share.status === "approved" && (
 <span className="ots-text--success"> Đã chấp nhận</span>
 )}
 {share.status === "rejected" && (
 <span className="ots-text--danger"> Bị từ chối</span>
 )}
 {share.status === "rejected_by_partner" && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
 <span className="ots-text--danger"> Đối tác từ chối</span>
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
 <div className="ots-stat-card__value">{visibleReceivedShares.length}</div>
 </div>
 <div className="ots-stat-card ots-stat-card--warning">
 <div className="ots-stat-card__label">Chờ chấp nhận</div>
 <div className="ots-stat-card__value">
 {visibleReceivedShares.filter(s => s.status === 'waiting_acceptance').length}
 </div>
 </div>
 <div className="ots-stat-card ots-stat-card--info">
 <div className="ots-stat-card__label">Đang xử lý</div>
 <div className="ots-stat-card__value">
 {visibleReceivedShares.filter(s => s.status === 'pending').length}
 </div>
 </div>
 <div className="ots-stat-card ots-stat-card--success">
 <div className="ots-stat-card__label">Đã được duyệt</div>
 <div className="ots-stat-card__value">
 {visibleReceivedShares.filter(s => s.status === 'approved').length}
 </div>
 </div>
 <div className="ots-stat-card ots-stat-card--danger">
 <div className="ots-stat-card__label">Đã từ chối</div>
 <div className="ots-stat-card__value">
 {visibleReceivedShares.filter(s => s.status === 'rejected_by_partner').length}
 </div>
 </div>
 </div>

 {/* Filter */}
 <div className="ots-filters">
 <input
 className="ots-filter-input"
 placeholder="Tìm huấn luyện viên..."
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
 <option value="pending">Đang xử lý</option>
 <option value="approved">Đã chấp nhận</option>
 <option value="rejected_by_partner">Đã từ chối</option>
 </select>
 <button className="ots-btn ots-btn--primary" onClick={() => { setReceivedCurrentPage(1); loadReceivedShares(1); }}>
 Tìm
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
 ) : visibleReceivedShares.length === 0 ? (
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
 <th>Thời gian</th>
 <th>Trạng thái</th>
 <th>Thao tác</th>
 </tr>
 </thead>
 <tbody>
 {visibleReceivedShares.map((share) => (
 <tr key={share.id}>
 <td>#{share.id}</td>
 <td>{share.Trainer?.User?.username || `Huấn luyện viên #${share.trainerId}`}</td>
 <td>{share.FromGym?.name || `Gym #${share.fromGymId}`}</td>
 <td>{share.ToGym?.name || `Gym #${share.toGymId}`}</td>
 <td>
 <div>
 <div>{share.startDate ? `${formatDate(share.startDate)} → ${formatDate(share.endDate || share.startDate)}` : "Không giới hạn"}</div>
 {share.startTime && share.endTime && 
 share.startTime !== '00:00:00' && 
 share.endTime !== '00:00:00' && (
 <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '0.25rem' }}>
 {share.startTime.substring(0, 5)} - {share.endTime.substring(0, 5)}
 </div>
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
 title="Xem lịch huấn luyện viên"
 >
 Lịch
 </button>
 <button
 className="ots-btn ots-btn--sm ots-btn--success"
 onClick={() => handleAcceptShare(share.id)}
 title="Chấp nhận"
 >
 Chấp nhận
 </button>
 <button
 className="ots-btn ots-btn--sm ots-btn--danger"
 onClick={() => handleRejectShare(share.id)}
 title="Từ chối"
 >
 Từ chối
 </button>
 </>
 )}
 {share.status === "pending" && (
 <>
 <button
 className="ots-btn ots-btn--sm ots-btn--info"
 onClick={() => handleViewTrainerSchedule(share)}
 title="Xem lịch huấn luyện viên"
 >
 Lịch
 </button>
 <span className="ots-text--info"> Đang xử lý</span>
 </>
 )}
 {share.status === "approved" && (
 <>
 <button
 className="ots-btn ots-btn--sm ots-btn--info"
 onClick={() => handleViewTrainerSchedule(share)}
 title="Xem lịch huấn luyện viên"
 >
 Lịch
 </button>
 <span className="ots-text--success"> Có thể sử dụng</span>
 </>
 )}
 {share.status === "rejected_by_partner" && (
 <span className="ots-text--danger"> Từ chối</span>
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
 {/* Trainer Availability */}
 <div className="ots-availability-panel">
 <div className="ots-availability-panel__header">
 <div>
 <h3 className="ots-availability-panel__title">Lịch rảnh huấn luyện viên</h3>
 <p className="ots-availability-panel__subtitle">
 Xem khung giờ còn trống của từng PT theo chi nhánh và ngày cụ thể
 </p>
 </div>
 <div className="ots-availability-panel__filters">
 <select
 className="ots-filter-select"
 value={availabilityFilters.gymId}
 onChange={(e) => setAvailabilityFilters((prev) => ({ ...prev, gymId: e.target.value }))}
 disabled={Boolean(selectedGymId)}
 >
 <option value="">{selectedGymId ? (selectedGymName || "Chi nhánh đang quản lý") : "Tất cả chi nhánh"}</option>
 {bookingGyms.map((gym) => (
 <option key={gym.id} value={gym.id}>{gym.name}</option>
 ))}
 </select>
 <input
 type="date"
 className="ots-filter-input"
 value={availabilityFilters.date}
 onChange={(e) => setAvailabilityFilters((prev) => ({ ...prev, date: e.target.value }))}
 />
 <button className="ots-btn ots-btn--secondary" onClick={loadTrainerAvailability}>
 Xem lịch rảnh
 </button>
 </div>
 </div>

 <div className="ots-availability-panel__meta">
 <span>
 {DAY_LABELS[getDayKeyFromDate(availabilityFilters.date)] || "Ngày đã chọn"}
 {availabilityFilters.date ? ` • ${formatDate(availabilityFilters.date)}` : ""}
 </span>
 <span>{visibleTrainerAvailability.length} PT có ca làm</span>
 </div>

 {loadingAvailability ? (
 <div className="ots-loading">Đang tải lịch rảnh của huấn luyện viên...</div>
 ) : visibleTrainerAvailability.length === 0 ? (
 <div className="ots-empty ots-empty--compact">
 <p>Không có huấn luyện viên nào có lịch làm việc trong ngày đã chọn.</p>
 </div>
 ) : (
 <div className="ots-availability-grid">
 {visibleTrainerAvailability.map(({ trainer, freeRanges, occupiedBlocks, availableRanges, availabilityState }) => (
 <div key={trainer.id} className="ots-availability-card">
 <div className="ots-availability-card__top">
 <div>
 <div className="ots-availability-card__name">{trainer.User?.username || `Huấn luyện viên #${trainer.id}`}</div>
 <div className="ots-availability-card__meta">
 {trainer.Gym?.name || "Không rõ chi nhánh"}
 {trainer.specialization ? ` • ${trainer.specialization}` : ""}
 </div>
 </div>
 <span className={`ots-availability-badge ${availabilityState === "free" ? "is-free" : availabilityState === "busy" ? "is-busy" : "is-neutral"}`}>
 {availabilityState === "free"
 ? `${freeRanges.length} khung rảnh`
 : availabilityState === "busy"
 ? "Kín lịch"
 : availabilityState === "off"
 ? "Nghỉ ngày này"
 : "Chưa cài lịch"}
 </span>
 </div>

 <div className="ots-availability-section">
 <div className="ots-availability-section__label">Khung giờ làm việc</div>
 <div className="ots-slot-list">
 {availableRanges.length ? availableRanges.map((range, index) => (
 <span key={`${trainer.id}-available-${index}`} className="ots-slot-pill ots-slot-pill--outline">
 {range.start} - {range.end}
 </span>
 )) : <span className="ots-availability-muted">Chưa cập nhật lịch làm việc</span>}
 </div>
 </div>

 <div className="ots-availability-section">
 <div className="ots-availability-section__label">Khung giờ còn rảnh</div>
 <div className="ots-slot-list">
 {freeRanges.length ? freeRanges.map((range, index) => (
 <button
 key={`${trainer.id}-free-${index}`}
 type="button"
 className="ots-slot-pill ots-slot-pill--free ots-slot-pill--interactive"
 onClick={() => handleQuickBookFromAvailability(trainer, range)}
 title="Bấm để mở form đặt lịch với khung giờ này"
 >
 {range.start} - {range.end}
 </button>
 )) : <span className="ots-availability-muted">{availabilityState === "off" ? "PT không làm việc trong ngày này" : availabilityState === "unconfigured" ? "PT chưa cập nhật lịch làm việc" : "Không còn khung giờ trống trong ngày này"}</span>}
 </div>
 </div>

 <div className="ots-availability-section">
 <div className="ots-availability-section__label">Khung giờ đang bận</div>
 <div className="ots-slot-list ots-slot-list--stacked">
 {occupiedBlocks.length ? occupiedBlocks.map((block) => (
 <div key={`${trainer.id}-busy-${block.id}`} className="ots-slot-pill ots-slot-pill--busy">
 <span>{block.startTime} - {block.endTime}</span>
 <span>
 {block.type === "trainer_share"
 ? "Đang chia sẻ PT"
 : block.memberName
 ? `Hội viên: ${block.memberName}`
 : STATUS_LABELS[block.status]?.label || "Đang bận"}
 </span>
 </div>
 )) : <span className="ots-availability-muted">Chưa có booking chiếm chỗ</span>}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
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
 disabled={Boolean(selectedGymId)}
 >
 <option value="">{selectedGymId ? (selectedGymName || "Chi nhánh đang quản lý") : "Tất cả Gym"}</option>
 {bookingGyms.map((g) => (
 <option key={g.id} value={g.id}>{g.name}</option>
 ))}
 </select>
 <select
 className="ots-filter-select"
 value={bookingFilters.trainerId}
 onChange={(e) => setBookingFilters({ ...bookingFilters, trainerId: e.target.value })}
 >
 <option value="">Tất cả huấn luyện viên</option>
 {trainers.map((t) => (
 <option key={t.id} value={t.id}>{t.User?.username || `Huấn luyện viên #${t.id}`}</option>
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
 <button className="ots-btn ots-btn--primary" onClick={() => { setBookingCurrentPage(1); loadBookings(1); }}>
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
 <th>Huấn luyện viên</th>
 <th>Gym</th>
 <th>Ngày</th>
 <th>Giờ</th>
 <th>Trạng thái</th>
 <th>Thao tác</th>
 </tr>
 </thead>
 <tbody>
 {bookings.map((booking) => {
 const isShared = booking.isSharedTrainer;
 const isTrainerShare = booking.type === 'trainer_share';
 return (
 <tr 
 key={booking.id} 
 className={`${isShared ? 'ots-row-shared' : ''}`}
 >
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
 {isTrainerShare && (
 <>
 <span className="ots-text--info">Lịch mượn huấn luyện viên</span>
 <button
 className="ots-btn ots-btn--xs ots-btn--warning"
 onClick={() => handleShareAttendance(booking, "present")}
 title="Điểm danh có mặt"
 >
 Có mặt
 </button>
 <button
 className="ots-btn ots-btn--xs ots-btn--danger"
 onClick={() => handleShareAttendance(booking, "absent")}
 title="Điểm danh vắng mặt"
 >
 Vắng
 </button>
 </>
 )}
 {/* Quick action buttons */}
 {!isTrainerShare && booking.status === "pending" && (
 <>
 <button
 className="ots-btn ots-btn--xs ots-btn--success"
 onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
 title="Xác nhận"
 >
 Xác nhận
 </button>
 <button
 className="ots-btn ots-btn--xs ots-btn--danger"
 onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
 title="Hủy"
 >
 Hủy
 </button>
 </>
 )}
 {!isTrainerShare && booking.status === "confirmed" && (
 <>
 <button
 className="ots-btn ots-btn--xs ots-btn--warning"
 onClick={() => handleUpdateBookingStatus(booking.id, 'in_progress')}
 title="Điểm danh có mặt"
 >
 Có mặt
 </button>
 <button
 className="ots-btn ots-btn--xs ots-btn--danger"
 onClick={() => handleUpdateBookingStatus(booking.id, 'no_show')}
 title="Điểm danh vắng mặt"
 >
 Vắng
 </button>
 </>
 )}
 {!isTrainerShare && booking.status === "in_progress" && (
 <button
 className="ots-btn ots-btn--xs ots-btn--success"
 onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
 title="Hoàn thành"
 >
 Hoàn thành
 </button>
 )}
 
 {/* Edit button */}
 {!isTrainerShare && (booking.status === "pending" || booking.status === "confirmed") && (
 <button
 className="ots-btn ots-btn--xs ots-btn--secondary"
 onClick={() => handleEditBooking(booking)}
 title="Sửa"
 >
 Sửa
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
 <h2>{editing ? "Sửa yêu cầu" : "Tạo yêu cầu xin mượn huấn luyện viên"}</h2>
 <button className="ots-modal__close" onClick={() => setShowModal(false)}>
 ×
 </button>
 </div>

 <form onSubmit={handleSubmit} className="ots-form">
 <Field label="Gym có huấn luyện viên (muốn xin mượn từ đây)" required>
 <select
 className="ots-select"
 value={form.fromGymId}
 onChange={(e) => setForm({ ...form, fromGymId: e.target.value, trainerId: '' })}
 required
 disabled={loadingLookups}
 >
 <option value="">-- Chọn Gym có huấn luyện viên --</option>
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

 <Field label="Gym nhận huấn luyện viên (Gym của tôi)" required>
 <select
 className="ots-select"
 value={form.toGymId}
 onChange={(e) => setForm({ ...form, toGymId: e.target.value, memberId: '' })}
 required
 disabled={loadingLookups || Boolean(selectedGymId)}
 >
 <option value="">-- Chọn Gym của tôi --</option>
 {gyms.filter(g => myGymIds.includes(g.id)).map((g) => (
 <option key={g.id} value={g.id}>
 {g.name} ({g.address || g.location || 'N/A'})
 </option>
 ))}
 </select>
 </Field>

 <Field label="Hội viên (Tùy chọn - Tự động tạo booking khi chấp nhận)">
 <select
 className="ots-select"
 value={form.memberId}
 onChange={(e) => setForm({ ...form, memberId: e.target.value })}
 disabled={loadingLookups || !form.toGymId}
 >
 <option value="">
 {!form.toGymId ? '-- Chọn Gym nhận huấn luyện viên trước --' : '-- Không chọn (chỉ mượn huấn luyện viên) --'}
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
 <Field label="Ngày mượn huấn luyện viên" required>
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
 Sẽ mượn huấn luyện viên {getDatesBetween(form.startDate, form.endDate).length} ngày (cùng giờ)
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
 Xóa
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
 Đã chọn {form.multipleDates.filter(d => d.date).length} ngày
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
 Lịch đã đặt của huấn luyện viên {loadingShareSchedule && "(đang tải...)"}
 </label>
 <div className="ots-schedule-info">
 {shareTrainerSchedule.length === 0 && !loadingShareSchedule && (
 <p className="ots-empty-text">Huấn luyện viên trống lịch trong khoảng thời gian này</p>
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
 {s.startTime} - {s.endTime}
 </span>
 <span className="ots-schedule-type">
 {s.type === 'booking' ? ' Booking' : 'Có lịch'}
 </span>
 {s.Member && (
 <span className="ots-schedule-member">
 với {s.Member.User?.username}
 </span>
 )}
 {isConflict && (
 <span className="ots-conflict-badge"> Xung đột!</span>
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
 onChange={(e) => setBookingForm({ ...bookingForm, gymId: e.target.value, trainerId: '', memberId: '', packageActivationId: '', packageId: '' })}
 required
 disabled={loadingLookups || Boolean(selectedGymId)}
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
 {members.filter((m) => !bookingForm.gymId || String(m.gymId || m.Gym?.id || "") === String(bookingForm.gymId)).map((m) => (
 <option key={m.id} value={m.id}>
 {m.User?.username || "N/A"} - {m.User?.email || ""}
 </option>
 ))}
 </select>
 </Field>

 <Field label="Huấn luyện viên" required>
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
 Sẽ đặt {getDatesBetween(bookingForm.startDate, bookingForm.endDate).length} ngày
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
 Xóa
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
 Đã chọn {bookingForm.multipleDates.filter(d => d.date).length} ngày
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
 Lịch đã đặt của huấn luyện viên {loadingSchedule && "(đang tải...)"}
 </label>
 <div className="ots-schedule-info">
 {loadingSchedule ? (
 <p style={{ color: '#94a3b8', fontSize: '14px' }}>Đang kiểm tra lịch...</p>
 ) : trainerSchedule.length === 0 ? (
 <p style={{ color: '#5fffc0', fontSize: '14px' }}> Huấn luyện viên trống lịch</p>
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
 <span style={{ color: '#5fffc0', fontSize: '13px' }}> Trống</span>
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
 <div className="ots-modal__content" style={{ maxWidth: '860px' }}>
 <div className="ots-modal__header">
 <h2>Lịch làm việc của huấn luyện viên {selectedShareForSchedule.Trainer?.User?.username}</h2>
 <button className="ots-modal__close" onClick={() => setShowScheduleModal(false)}>
 ×
 </button>
 </div>

 <div className="ots-form">
 {/* Thông tin yêu cầu */}
 <div style={{ 
 marginBottom: '1.5rem', 
 padding: '1.25rem', 
 background: 'linear-gradient(145deg, rgba(17, 25, 40, 0.96) 0%, rgba(14, 21, 34, 0.96) 100%)',
 borderRadius: '14px',
 color: '#f8fafc',
 border: '1px solid rgba(255, 177, 0, 0.22)',
 boxShadow: '0 14px 34px rgba(0,0,0,0.28)'
 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
 <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', letterSpacing: '0.01em' }}>Thông tin yêu cầu</h3>
 </div>
 
 <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem' }}>
 <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
 <span style={{ opacity: 0.9, minWidth: '90px' }}> Ngày:</span>
 <strong style={{ fontSize: '1rem' }}>
 {selectedShareForSchedule.startDate ? formatDate(selectedShareForSchedule.startDate) : 'N/A'}
 {selectedShareForSchedule.endDate && (
 <> → {formatDate(selectedShareForSchedule.endDate)}</>
 )}
 </strong>
 </div>

 <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
 <span style={{ opacity: 0.9, minWidth: '90px' }}> Giờ:</span>
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
 <span style={{ opacity: 0.9, minWidth: '90px' }}>Từ Gym:</span>
 <strong style={{ fontSize: '1rem' }}>
 {selectedShareForSchedule.fromGym?.name || selectedShareForSchedule.FromGym?.name || 'N/A'}
 </strong>
 </div>

 <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
 <span style={{ opacity: 0.9, minWidth: '90px' }}>Đến Gym:</span>
 <strong style={{ fontSize: '1rem' }}>
 {selectedShareForSchedule.toGym?.name || selectedShareForSchedule.ToGym?.name || 'N/A'}
 </strong>
 </div>
 
 {selectedShareForSchedule.scheduleMode === 'specific_days' && selectedShareForSchedule.specificSchedules?.length > 0 && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
 <span style={{ opacity: 0.9, fontWeight: '600' }}>Lịch cụ thể:</span>
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
 {schedule.startTime?.substring(0, 5)} - {schedule.endTime?.substring(0, 5)}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {selectedShareForSchedule.notes && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
 <span style={{ opacity: 0.9, fontWeight: '600' }}> Lý do/Ghi chú:</span>
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
 <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></div>
 <div>Đang tải lịch...</div>
 </div>
 ) : shareTrainerSchedule.length === 0 ? (
 <div className="ots-empty" style={{ padding: '2rem', textAlign: 'center' }}>
 <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}></div>
 <p style={{ margin: 0, color: '#64748b' }}>Không có lịch trong khoảng thời gian này</p>
 </div>
 ) : (
 <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '0.5rem' }}>
 <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
 <span style={{ fontSize: '1.25rem' }}></span>
 <h4 style={{ margin: 0, color: '#d1d5db', fontSize: '1rem' }}>
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
 background: filteredScheduleBookings.length === 0 ? 'rgba(16, 74, 56, 0.22)' : 'rgba(92, 34, 34, 0.24)',
 border: `1px solid ${filteredScheduleBookings.length === 0 ? 'rgba(34, 197, 94, 0.35)' : 'rgba(248, 113, 113, 0.4)'}`,
 borderRadius: '12px',
 boxShadow: '0 10px 24px rgba(0,0,0,0.22)'
 }}
 >
 <div style={{ 
 display: 'flex', 
 alignItems: 'center', 
 justifyContent: 'space-between',
 marginBottom: filteredScheduleBookings.length > 0 ? '0.75rem' : 0
 }}>
 <h4 style={{ margin: 0, color: '#f1f5f9', fontSize: '0.95rem', fontWeight: '700' }}>
 {new Date(schedule.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
 </h4>
 {filteredScheduleBookings.length === 0 ? (
 <span style={{ 
 color: '#86efac', 
 fontSize: '0.9rem',
 fontWeight: '600',
 padding: '0.25rem 0.75rem',
 background: 'rgba(34, 197, 94, 0.18)',
 borderRadius: '20px'
 }}>
 Trống
 </span>
 ) : (
 <span style={{ 
 color: '#fecaca', 
 fontSize: '0.9rem',
 fontWeight: '600',
 padding: '0.25rem 0.75rem',
 background: 'rgba(248, 113, 113, 0.2)',
 borderRadius: '20px'
 }}>
 {filteredScheduleBookings.length} lịch
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
 background: 'rgba(15, 23, 42, 0.72)',
 borderRadius: '8px',
 marginBottom: bidx < schedule.bookings.length - 1 ? '0.5rem' : 0,
 border: '1px solid rgba(248, 113, 113, 0.32)',
 fontSize: '0.9rem'
 }}
 >
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
 <span style={{ 
 fontWeight: '700', 
 color: '#fca5a5',
 fontSize: '0.95rem',
 minWidth: '110px'
 }}>
 {booking.startTime} - {booking.endTime}
 </span>
 {booking.Member?.User?.username && (
 <span style={{ color: '#cbd5e1' }}>
 {booking.Member.User.username}
 </span>
 )}
 {booking.status && (
 <span style={{ 
 padding: '0.15rem 0.5rem',
 background: 'rgba(100, 116, 139, 0.22)',
 borderRadius: '12px',
 fontSize: '0.85rem',
 color: '#d1d5db'
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
 Chấp nhận yêu cầu
 </button>
 <button
 type="button"
 className="ots-btn ots-btn--danger"
 onClick={() => {
 setShowScheduleModal(false);
 handleRejectShare(selectedShareForSchedule.id);
 }}
 >
 Từ chối yêu cầu
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
 <h2 className="modal-title">Chi tiết yêu cầu chia sẻ huấn luyện viên #{selectedShare.id}</h2>
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
