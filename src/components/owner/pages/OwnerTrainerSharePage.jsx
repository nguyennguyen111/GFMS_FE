import React, { useCallback, useEffect, useState } from "react";
import "./OwnerTrainerSharePage.css";
import {
  ownerGetMyTrainerShares,
  ownerGetReceivedTrainerShares,
  ownerGetTrainerShareDetail,
  ownerAcceptTrainerShare,
  ownerRejectTrainerShare,
  ownerCreateTrainerShare,
  ownerUpdateTrainerShare,
  ownerDeleteTrainerShare,
  ownerUpdateTrainerShareSessionPrice,
  ownerConfirmTrainerSharePayment,
  ownerRespondTrainerSharePaymentDispute,
} from "../../../services/ownerTrainerShareService";
import ownerBookingService from "../../../services/ownerBookingService";
import { ownerUploadGymImage } from "../../../services/ownerGymService";
import { getOwnerGymsListCached } from "../../../utils/ownerGymsListCache";
import ownerMemberService from "../../../services/ownerMemberService";
import ownerTrainerService from "../../../services/ownerTrainerService";
import { getRequests as ownerGetRequests, approveRequest } from "../../../services/ownerRequestService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import axios from "../../../setup/axios";
import useSelectedGym from "../../../hooks/useSelectedGym";
import { useSearchParams } from "react-router-dom";
import { showAppConfirm } from "../../../utils/appDialog";
import { normalizeSingleImageSrc } from "../../../utils/image";
import { specializationToVietnamese } from "../../../utils/specializationI18n";
import { TRAINER_SPECIALIZATION_OPTIONS } from "../../../constants/trainerSpecializations";

/** Đủ cho dropdown tạo phiếu / lịch — nhẹ hơn gọi 1000 bản ghi mỗi lần vào trang */
const TRAINER_SHARE_LOOKUP_LIMIT = 400;

const SHARE_PAYMENT_LABELS = {
  none: "Chưa thanh toán",
  awaiting_transfer: "Chờ Thanh toán",
  disputed: "PT khiếu nại — chưa nhận tiền",
  paid: "Đã thanh toán",
};

/** Gạch chéo «Đã thanh toán» khi PT đã xác nhận hết tranh chấp (sharePaymentPtAcknowledgedAt). */
function renderSharePaymentStatusCell(share) {
  const raw =
    SHARE_PAYMENT_LABELS[share?.sharePaymentStatus || "none"] ||
    share?.sharePaymentStatus ||
    "—";
  const strikeThroughPaid =
    String(share?.sharePaymentStatus || "") === "paid" &&
    share?.sharePaymentPtAcknowledgedAt;
  if (!strikeThroughPaid) return raw;
  return (
    <span
      className="ots-paymentLabel--strikeResolved"
      title="PT đã xác nhận — hết tranh chấp thanh toán"
    >
      {raw}
    </span>
  );
}

function formatVnd(amount) {
  if (amount === undefined || amount === null || amount === "") return "—";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("vi-VN")} đ`;
}

function parseTrainerShareProofUrls(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      return Array.isArray(j) ? j.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const STATUS_LABELS = {
  // Trainer Share statuses
  waiting_acceptance: { label: "Chờ chấp nhận", color: "info" },
  pending_trainer: { label: "Chờ PT nhận lịch", color: "warning" },
  approved: { label: "Đã chấp nhận", color: "success" },
  shared: { label: "Lịch mượn huấn luyện viên", color: "info" },
  rejected: { label: "Từ chối", color: "danger" },
  rejected_by_partner: { label: "Đối tác từ chối", color: "danger" },

  // Booking statuses
  pending: { label: "Chờ xác nhận", color: "info" },
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

const DAY_KEYS_BY_INDEX = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const DEFAULT_SHARE_TYPE = "temporary";
const DEFAULT_COMMISSION_SPLIT = 0.7;
const TRAINER_AVAILABILITY_PAGE_SIZE = 4;
const MEMBER_SCHEDULE_PAGE_SIZE = 10;

function StatusBadge({ status }) {
  const info = STATUS_LABELS[status] || { label: status, color: "secondary" };
  return (
    <span className={`ots-badge ots-badge--${info.color}`}>{info.label}</span>
  );
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

function getOccupiedBlockLabel(block) {
  if (block?.busyRequested) {
    return "Huấn luyện viên báo bận khung giờ này";
  }
  if (block.type === "trainer_share") {
    const targetGymName =
      block.toGymName || block.shareToGymName || block.toGym?.name || null;
    return targetGymName
      ? `Mượn sang ${targetGymName}`
      : "Đang mượn sang gym khác";
  }

  if (block.memberName) {
    return `Hội viên gắn kèm: ${block.memberName}`;
  }

  return STATUS_LABELS[block.status]?.label || "Đang bận";
}

function hasBusyRequestMarker(notesValue) {
  return String(notesValue || "").includes("[PT_BUSY_REQUEST]");
}

function getMemberScheduleStatus(statusValue) {
  const key = String(statusValue || "").toLowerCase();
  const mapped = STATUS_LABELS[key]?.label || key || "Không xác định";
  return { key, label: mapped };
}

/** Trạng thái hiển thị: ưu tiên trạng thái buổi; “báo bận” là ngữ cảnh phụ khi buổi đã xong. */
function getMemberSlotStatusPresentation(booking) {
  const st = String(booking?.status || "").toLowerCase();
  const busyHistory =
    Boolean(booking?.busyRequested) ||
    hasBusyRequestMarker(booking?.notes);
  const sched = getMemberScheduleStatus(booking?.status);

  if (st === "completed") {
    return {
      primaryLabel: sched.label,
      detailLine: busyHistory
        ? "Trước đó có huấn luyện viên báo bận; buổi đã được đổi PT / xử lý và hoàn tất."
        : null,
      cssTone: "completed",
      cardBusyBorder: false,
    };
  }

  if (st === "cancelled" || st === "no_show") {
    return {
      primaryLabel: sched.label,
      detailLine: busyHistory
        ? "Buổi có ghi nhận liên quan báo bận hoặc xin nghỉ."
        : null,
      cssTone: st === "no_show" ? "no_show" : "cancelled",
      cardBusyBorder: false,
    };
  }

  if (busyHistory) {
    return {
      primaryLabel: sched.label,
      detailLine:
        "Huấn luyện viên báo bận slot này — cần mượn PT hoặc điều chỉnh lịch kịp thời.",
      cssTone: "busy-requested",
      cardBusyBorder: true,
    };
  }

  const tone =
    st && ["confirmed", "in_progress", "pending"].includes(st) ? st : "confirmed";
  return {
    primaryLabel: sched.label,
    detailLine: null,
    cssTone: tone,
    cardBusyBorder: false,
  };
}

function sessionTypeLabelVi(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (t === "trainer_share") return "Mượn / chia sẻ huấn luyện viên";
  return String(raw || "").trim() || "—";
}

function cleanQueryParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim() !== "";
      return true;
    }),
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

function normalizeDateValue(dateValue) {
  if (!dateValue) return "";
  const raw = String(dateValue).trim();
  const exactYmd = raw.match(/^\d{4}-\d{2}-\d{2}$/);
  if (exactYmd) return exactYmd[0];
  const withTime = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (withTime) return withTime[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function normalizeAvailableRanges(ranges = []) {
  return (Array.isArray(ranges) ? ranges : [])
    .map((range) => ({
      start: normalizeTimeValue(range?.start),
      end: normalizeTimeValue(range?.end),
    }))
    .filter((range) => range.start && range.end && range.start < range.end);
}

function normalizeRanges(ranges = []) {
  return normalizeAvailableRanges(ranges);
}

function mergeBlocks(blocks = []) {
  const normalized = blocks
    .map((block) => ({
      startMinute: timeToMinutes(block?.startTime),
      endMinute: timeToMinutes(block?.endTime),
    }))
    .filter(
      (block) =>
        block.startMinute !== null &&
        block.endMinute !== null &&
        block.startMinute < block.endMinute,
    )
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

  return normalizeAvailableRanges(availableRanges).flatMap((range) => {
    const startMinute = timeToMinutes(range.start);
    const endMinute = timeToMinutes(range.end);
    if (startMinute === null || endMinute === null || startMinute >= endMinute)
      return [];

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

    return freeRanges.filter(
      (freeRange) =>
        freeRange.start && freeRange.end && freeRange.start < freeRange.end,
    );
  });
}

function hasAnyWorkingHours(availableHours) {
  if (!availableHours || typeof availableHours !== "object") return false;
  return Object.values(availableHours).some(
    (ranges) => normalizeAvailableRanges(ranges).length > 0,
  );
}

function buildHourlySlotsFromRanges(ranges = []) {
  return normalizeAvailableRanges(ranges).flatMap((range) => {
    const startMinute = timeToMinutes(range.start);
    const endMinute = timeToMinutes(range.end);
    if (startMinute === null || endMinute === null || startMinute >= endMinute)
      return [];

    const slots = [];
    let cursor = startMinute;
    while (cursor + 60 <= endMinute) {
      const start = minutesToTime(cursor);
      const end = minutesToTime(cursor + 60);
      slots.push({ start, end, value: `${start}-${end}` });
      cursor += 60;
    }

    return slots;
  });
}

function parseBorrowSpecTokens(raw) {
  return String(raw || "")
    .split(/[\n,;|]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function trainerMatchesBorrowSpecialization(trainerSpecialization, borrowSpec) {
  const need = String(borrowSpec || "").trim();
  if (!need) return true;
  const tokens = parseBorrowSpecTokens(trainerSpecialization);
  return tokens.some((t) => t === need || t.includes(need) || need.includes(t));
}

/** Map chuyên môn form mượn từ PT báo bận (API hoặc chuỗi specialization thô) */
function borrowSpecializationFromBusySlot(slot) {
  const fromApi = String(slot?.borrowSpecialization || "").trim();
  if (fromApi && TRAINER_SPECIALIZATION_OPTIONS.includes(fromApi)) return fromApi;
  const raw = String(slot?.busyTrainerSpecialization || "").trim();
  if (!raw) return "";
  for (const opt of TRAINER_SPECIALIZATION_OPTIONS) {
    if (trainerMatchesBorrowSpecialization(raw, opt)) return opt;
  }
  return "";
}

function borrowCanonicalFromTrainerSpecialization(trainerSpecialization) {
  const raw = String(trainerSpecialization || "").trim();
  if (!raw) return "";
  for (const opt of TRAINER_SPECIALIZATION_OPTIONS) {
    if (trainerMatchesBorrowSpecialization(raw, opt)) return opt;
  }
  return "";
}

/** Gợi chuyên môn chuẩn từ tên gói (vd. "Tăng Cơ Toàn Diện (Activation #107)") */
function borrowCanonicalFromPackageLabel(raw) {
  let s = String(raw || "").trim();
  s = s.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const vi = specializationToVietnamese(s);
  if (!vi) return "";
  for (const opt of TRAINER_SPECIALIZATION_OPTIONS) {
    if (opt === vi) return opt;
    if (trainerMatchesBorrowSpecialization(vi, opt)) return opt;
  }
  for (const part of vi
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)) {
    for (const opt of TRAINER_SPECIALIZATION_OPTIONS) {
      if (trainerMatchesBorrowSpecialization(part, opt)) return opt;
    }
  }
  return "";
}

const INITIAL_FORM = {
  trainerId: "",
  fromGymId: "",
  toGymId: "",
  memberId: "",
  memberPackageActivationId: "",
  borrowSpecialization: "",
  scheduleMode: "single",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  multipleDates: [],
  notes: "",
  sessionPrice: "",
  busySlotRequestId: null, // ID của yêu cầu báo bận gốc - để cập nhật trạng thái khi PT nhận
};

export default function OwnerTrainerSharePage({ pageMode = "shares" }) {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [searchParams] = useSearchParams();
  const isBookingsPage = pageMode === "bookings";
  const [activeTab, setActiveTab] = useState(
    isBookingsPage ? "bookings" : "shares",
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [shares, setShares] = useState([]);
  const [pagination, setPagination] = useState({});
  const [receivedShares, setReceivedShares] = useState([]);
  const [receivedPagination, setReceivedPagination] = useState({});
  const [receivedFilters, setReceivedFilters] = useState({ q: "", status: "" });
  const [receivedCurrentPage, setReceivedCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedShare, setSelectedShare] = useState(null);
  const [selectedShareForSchedule, setSelectedShareForSchedule] =
    useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  const [detailSessionPriceInput, setDetailSessionPriceInput] = useState("");
  const [savingDetailPrice, setSavingDetailPrice] = useState(false);
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const [confirmPaymentFiles, setConfirmPaymentFiles] = useState([]);
  const [confirmPaymentNote, setConfirmPaymentNote] = useState("");
  const [disputeResponseLoading, setDisputeResponseLoading] = useState(false);
  const [borrowerResponseText, setBorrowerResponseText] = useState("");
  const [borrowerProofUrls, setBorrowerProofUrls] = useState([]);
  const [pendingProofFiles, setPendingProofFiles] = useState([]);

  const [shareTrainerSchedule, setShareTrainerSchedule] = useState([]);
  const [loadingShareSchedule, setLoadingShareSchedule] = useState(false);

  const [filters, setFilters] = useState({ q: "", status: "" });
  const [currentPage, setCurrentPage] = useState(1);

  const [gyms, setGyms] = useState([]);
  const [bookingGyms, setBookingGyms] = useState([]);
  const [myGymIds, setMyGymIds] = useState([]);
  const [allOwnerTrainers, setAllOwnerTrainers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [memberPackageOptions, setMemberPackageOptions] = useState([]);
  const [memberBusySlots, setMemberBusySlots] = useState([]);
  const [loadingMemberBusySlots, setLoadingMemberBusySlots] = useState(false);
  const [availabilityFilters, setAvailabilityFilters] = useState({
    gymId: "",
    date: getTodayValue(),
  });
  const [trainerAvailability, setTrainerAvailability] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [memberDailyBookings, setMemberDailyBookings] = useState([]);
  const [loadingMemberDailyBookings, setLoadingMemberDailyBookings] =
    useState(false);
  const [trainerAvailabilityPage, setTrainerAvailabilityPage] = useState(1);
  const [memberSchedulePage, setMemberSchedulePage] = useState(1);
  const [memberBookingDetailOpen, setMemberBookingDetailOpen] = useState(false);
  const [memberBookingDetail, setMemberBookingDetail] = useState(null);
  const [memberBookingDetailLoading, setMemberBookingDetailLoading] =
    useState(false);
  const [memberBookingDetailError, setMemberBookingDetailError] =
    useState("");
  const [eligibleTrainers, setEligibleTrainers] = useState([]);
  const [loadingEligibleTrainers, setLoadingEligibleTrainers] = useState(false);
  const [busyRequestIdToApprove, setBusyRequestIdToApprove] = useState(null);

  useEffect(() => {
    const scopedGymId = selectedGymId ? String(selectedGymId) : "";
    setForm((prev) => ({
      ...prev,
      toGymId: scopedGymId || prev.toGymId,
      memberId:
        scopedGymId && prev.toGymId && String(prev.toGymId) !== scopedGymId
          ? ""
          : prev.memberId,
    }));
    setAvailabilityFilters((prev) => ({
      ...prev,
      gymId: scopedGymId || prev.gymId,
    }));
  }, [selectedGymId]);

  useEffect(() => {
    setActiveTab(isBookingsPage ? "bookings" : "shares");
  }, [isBookingsPage]);

  useEffect(() => {
    setTrainerAvailabilityPage(1);
    setMemberSchedulePage(1);
  }, [availabilityFilters.date, availabilityFilters.gymId, selectedGymId]);

  useEffect(() => {
    if (isBookingsPage) return;
    const shouldPrefillBorrow = searchParams.get("prefillBorrow") === "1";
    if (!shouldPrefillBorrow) return;

    const toGymId = String(searchParams.get("toGymId") || selectedGymId || "");
    const memberId = String(searchParams.get("memberId") || "");
    const memberPackageActivationId = String(
      searchParams.get("memberPackageActivationId") || "",
    );
    const startDate = normalizeDateValue(searchParams.get("startDate"));
    const startTime = normalizeTimeValue(searchParams.get("startTime"));
    const endTime = normalizeTimeValue(searchParams.get("endTime"));
    const borrowSpecRaw = String(
      searchParams.get("borrowSpecialization") || "",
    ).trim();
    const borrowSpecialization = TRAINER_SPECIALIZATION_OPTIONS.includes(
      borrowSpecRaw,
    )
      ? borrowSpecRaw
      : "";
    const fromBusyRequestId = String(searchParams.get("fromBusyRequestId") || "");
    const busySlotRequestId = fromBusyRequestId ? Number(fromBusyRequestId) : null;

    const busyReqId = searchParams.get("fromBusyRequestId");
    if (busyReqId) {
      setBusyRequestIdToApprove(String(busyReqId));
    }

    setEditing(null);
    setActiveTab("shares");
    setShowModal(true);
    setForm((prev) => ({
      ...prev,
      ...INITIAL_FORM,
      toGymId,
      memberId,
      memberPackageActivationId,
      startDate,
      endDate: startDate,
      startTime,
      endTime,
      borrowSpecialization,
      busySlotRequestId,
      note: prev.note || "",
    }));
  }, [isBookingsPage, searchParams, selectedGymId]);

  // Wrapper để đóng modal và clear busyRequestIdToApprove
  const closeModal = () => {
    setBusyRequestIdToApprove(null);
    setShowModal(false);
  };

  const availableTrainers = React.useMemo(() => {
    if (!form.fromGymId) return [];
    return trainers.filter(
      (trainer) =>
        String(trainer.gymId || trainer.Gym?.id || "") ===
        String(form.fromGymId),
    );
  }, [trainers, form.fromGymId]);

  const availabilityTrainers = React.useMemo(() => {
    if (!availabilityFilters.gymId) return allOwnerTrainers;
    const filtered = allOwnerTrainers.filter((trainer) => {
      const trainerGymId = trainer.gymId || trainer.Gym?.id;
      return (
        trainerGymId &&
        trainerGymId.toString() === availabilityFilters.gymId.toString()
      );
    });
    // Fallback: nếu filter chi nhánh không khớp dữ liệu trả về, vẫn hiển thị toàn bộ để không bị trống toàn màn hình
    return filtered.length > 0 ? filtered : allOwnerTrainers;
  }, [allOwnerTrainers, availabilityFilters.gymId]);

  const loadPeopleLookups = useCallback(async () => {
    const [trainersRes, membersRes] = await Promise.all([
      ownerTrainerService.getMyTrainers({
        limit: TRAINER_SHARE_LOOKUP_LIMIT,
        page: 1,
      }),
      ownerMemberService.getMyMembers({
        limit: TRAINER_SHARE_LOOKUP_LIMIT,
        page: 1,
      }),
    ]);
    const trainerRows = trainersRes?.data || [];
    const memberRows = membersRes?.data || [];
    setAllOwnerTrainers(trainerRows);
    setTrainers(trainerRows);
    setMembers(memberRows);
  }, []);

  const loadLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const [myGyms, allGymsRes] = await Promise.all([
        getOwnerGymsListCached(),
        axios.get("/api/owner/gyms/all"),
      ]);
      const allGyms = allGymsRes?.data?.data || [];

      setGyms(allGyms);
      setBookingGyms(myGyms);
      setMyGymIds(myGyms.map((gym) => gym.id));
      setAvailabilityFilters((prev) => ({
        ...prev,
        gymId: prev.gymId || String(myGyms?.[0]?.id || ""),
      }));

      if (isBookingsPage) {
        await loadPeopleLookups();
      } else {
        setAllOwnerTrainers([]);
        setTrainers([]);
        setMembers([]);
      }
    } catch (err) {
    } finally {
      setLoadingLookups(false);
    }
  }, [isBookingsPage, loadPeopleLookups]);

  const visibleTrainerAvailability = trainerAvailability;
  const trainerAvailabilityTotalPages = Math.max(
    1,
    Math.ceil(
      (visibleTrainerAvailability?.length || 0) /
        TRAINER_AVAILABILITY_PAGE_SIZE,
    ),
  );
  const paginatedTrainerAvailability = React.useMemo(() => {
    const start =
      (trainerAvailabilityPage - 1) * TRAINER_AVAILABILITY_PAGE_SIZE;
    return (visibleTrainerAvailability || []).slice(
      start,
      start + TRAINER_AVAILABILITY_PAGE_SIZE,
    );
  }, [trainerAvailabilityPage, visibleTrainerAvailability]);

  const memberScheduleTotalPages = Math.max(
    1,
    Math.ceil((memberDailyBookings?.length || 0) / MEMBER_SCHEDULE_PAGE_SIZE),
  );
  const paginatedMemberDailyBookings = React.useMemo(() => {
    const start = (memberSchedulePage - 1) * MEMBER_SCHEDULE_PAGE_SIZE;
    return (memberDailyBookings || []).slice(
      start,
      start + MEMBER_SCHEDULE_PAGE_SIZE,
    );
  }, [memberDailyBookings, memberSchedulePage]);

  useEffect(() => {
    if (trainerAvailabilityPage > trainerAvailabilityTotalPages) {
      setTrainerAvailabilityPage(trainerAvailabilityTotalPages);
    }
  }, [trainerAvailabilityPage, trainerAvailabilityTotalPages]);

  useEffect(() => {
    if (memberSchedulePage > memberScheduleTotalPages) {
      setMemberSchedulePage(memberScheduleTotalPages);
    }
  }, [memberSchedulePage, memberScheduleTotalPages]);

  const visibleShares = React.useMemo(() => {
    console.log("🔍 visibleShares filtering - shares:", shares, "selectedGymId:", selectedGymId);
    if (!selectedGymId) {
      console.log("✅ No selectedGymId, returning all shares:", shares.length);
      return shares;
    }
    const filtered = shares.filter(
      (share) =>
        String(share?.toGymId || share?.toGym?.id || "") ===
        String(selectedGymId),
    );
    console.log("✅ Filtered shares:", filtered.length, "from total:", shares.length);
    return filtered;
  }, [selectedGymId, shares]);

  const visibleReceivedShares = React.useMemo(() => {
    if (!selectedGymId) return receivedShares;
    return receivedShares.filter(
      (share) =>
        String(share?.fromGymId || share?.FromGym?.id || "") ===
        String(selectedGymId),
    );
  }, [receivedShares, selectedGymId]);

  const filteredMemberBusySlots = React.useMemo(() => {
    if (!form.memberId) return [];
    return memberBusySlots.filter(
      (slot) =>
        !form.memberPackageActivationId ||
        String(slot.packageActivationId || slot.packageId || "") ===
          String(form.memberPackageActivationId),
    );
  }, [form.memberId, form.memberPackageActivationId, memberBusySlots]);

  /** Ngày/giờ đang khớp đúng đơn báo bận duy nhất trong danh sách lọc */
  const busyScheduleLocked = React.useMemo(() => {
    if (editing) return false;
    if (filteredMemberBusySlots.length !== 1) return false;
    const s = filteredMemberBusySlots[0];
    return (
      form.startDate === s.date &&
      normalizeTimeValue(form.startTime) ===
        normalizeTimeValue(s.startTime) &&
      normalizeTimeValue(form.endTime) === normalizeTimeValue(s.endTime)
    );
  }, [
    editing,
    filteredMemberBusySlots,
    form.startDate,
    form.startTime,
    form.endTime,
  ]);

  useEffect(() => {
    if (editing) return;
    if (loadingMemberBusySlots) return;
    if (!form.memberId) return;
    if (filteredMemberBusySlots.length !== 1) return;
    const slot = filteredMemberBusySlots[0];
    const mappedSpec = borrowSpecializationFromBusySlot(slot);
    setForm((prev) => {
      const nextBorrow = mappedSpec || prev.borrowSpecialization;
      const matchesSlot =
        prev.startDate === slot.date &&
        normalizeTimeValue(prev.startTime) ===
          normalizeTimeValue(slot.startTime) &&
        normalizeTimeValue(prev.endTime) ===
          normalizeTimeValue(slot.endTime);
      const emptySchedule =
        !prev.startDate || !prev.startTime || !prev.endTime;
      if (!emptySchedule && !matchesSlot) {
        return prev;
      }
      if (
        matchesSlot &&
        String(prev.borrowSpecialization || "") === String(nextBorrow || "")
      ) {
        return prev;
      }
      return {
        ...prev,
        startDate: slot.date,
        endDate: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        trainerId: "",
        borrowSpecialization: nextBorrow,
      };
    });
  }, [
    editing,
    loadingMemberBusySlots,
    form.memberId,
    filteredMemberBusySlots,
  ]);

  const selectedTrainer = React.useMemo(
    () =>
      trainers.find(
        (trainer) => String(trainer?.id || "") === String(form.trainerId || ""),
      ) || null,
    [form.trainerId, trainers],
  );

  const effectiveBorrowSpecialization = React.useMemo(() => {
    const direct = String(form.borrowSpecialization || "").trim();
    if (direct) return direct;
    if (selectedTrainer?.specialization) {
      return borrowCanonicalFromTrainerSpecialization(
        selectedTrainer.specialization,
      );
    }
    return "";
  }, [form.borrowSpecialization, selectedTrainer]);

  /**
   * Gộp khung giờ: chỉ PT cùng chuyên môn hiệu lực (từ gói / slot báo bận / PT chọn).
   */
  const trainersForSlotMerge = React.useMemo(() => {
    const spec = String(effectiveBorrowSpecialization || "").trim();
    if (!spec) return [];
    return availableTrainers.filter((t) =>
      trainerMatchesBorrowSpecialization(t.specialization, spec),
    );
  }, [availableTrainers, effectiveBorrowSpecialization]);

  /** Chỉ PT cùng chuyên môn và còn rảnh đúng khung giờ (giống PT báo bận). */
  const trainerBorrowSelectOptions = React.useMemo(() => {
    if (editing && selectedTrainer) return [selectedTrainer];
    if (!form.startDate || !form.startTime || !form.endTime) return [];
    if (!String(effectiveBorrowSpecialization || "").trim()) return [];
    return eligibleTrainers;
  }, [
    editing,
    selectedTrainer,
    form.startDate,
    form.startTime,
    form.endTime,
    effectiveBorrowSpecialization,
    eligibleTrainers,
  ]);

  const leadTimeError = React.useMemo(() => {
    if (!form.startDate || !form.startTime) return "";
    const normalizedStart = normalizeTimeValue(form.startTime);
    if (!normalizedStart) return "";

    const slotStart = new Date(`${form.startDate}T${normalizedStart}:00`);
    if (Number.isNaN(slotStart.getTime())) return "";

    const minimumAllowed = new Date(Date.now() + 5 * 60 * 60 * 1000);
    if (slotStart < minimumAllowed) {
      return "Thời gian tạo yêu cầu phải trước giờ mượn ít nhất 5 tiếng.";
    }
    return "";
  }, [form.startDate, form.startTime]);

  /** Booking thật sự chiếm slot PT (bỏ share, báo bận, buổi member đang thay). */
  const filterBookingsForBusySlotCheck = useCallback(
    (dateKey, bookings) => {
      if (!Array.isArray(bookings)) return [];
      return bookings.filter((booking) => {
        const rawType = String(
          booking?.type || booking?.sessionType || "",
        ).toLowerCase();
        if (rawType === "trainer_share") return false;
        if (booking?.busyRequested) return false;
        const bidMember = String(
          booking?.memberId ?? booking?.Member?.id ?? "",
        );
        if (
          form.memberId &&
          bidMember === String(form.memberId) &&
          dateKey === form.startDate
        ) {
          const bs = normalizeTimeValue(booking.startTime);
          const be = normalizeTimeValue(booking.endTime);
          const fs = normalizeTimeValue(form.startTime);
          const fe = normalizeTimeValue(form.endTime);
          if (fs && fe && bs && be && fs < be && fe > bs) {
            return false;
          }
        }
        return true;
      });
    },
    [form.memberId, form.startDate, form.startTime, form.endTime],
  );

  const bookingsByDate = React.useMemo(() => {
    const map = new Map();
    (Array.isArray(shareTrainerSchedule) ? shareTrainerSchedule : []).forEach(
      (daySchedule) => {
        const dateKey = daySchedule?.date;
        if (!dateKey) return;
        const bookings = filterBookingsForBusySlotCheck(
          dateKey,
          daySchedule?.bookings,
        );
        map.set(dateKey, bookings);
      },
    );
    return map;
  }, [shareTrainerSchedule, filterBookingsForBusySlotCheck]);

  const hasBookingConflictForSlot = useCallback(
    (dateValue, startTime, endTime) => {
      if (!dateValue || !startTime || !endTime) return false;
      const st = normalizeTimeValue(startTime);
      const et = normalizeTimeValue(endTime);
      if (!st || !et) return false;
      const bookings = bookingsByDate.get(dateValue) || [];
      return bookings.some((booking) => {
        const bs = normalizeTimeValue(booking.startTime);
        const be = normalizeTimeValue(booking.endTime);
        if (!bs || !be) return false;
        return st < be && et > bs;
      });
    },
    [bookingsByDate],
  );

  const singleDateAllSlots = React.useMemo(() => {
    const dayKey = getDayKeyFromDate(form.startDate);
    if (!selectedTrainer || !dayKey) return [];
    return buildHourlySlotsFromRanges(
      selectedTrainer.availableHours?.[dayKey] || [],
    );
  }, [form.startDate, selectedTrainer]);

  const singleDateSlotOptions = React.useMemo(() => {
    return singleDateAllSlots.filter(
      (slot) =>
        !hasBookingConflictForSlot(form.startDate, slot.start, slot.end),
    );
  }, [form.startDate, hasBookingConflictForSlot, singleDateAllSlots]);

  const isSingleSlotBusy = useCallback(
    (slot) => {
      if (!slot?.start || !slot?.end) return false;
      return hasBookingConflictForSlot(form.startDate, slot.start, slot.end);
    },
    [form.startDate, hasBookingConflictForSlot],
  );

  const getGymSlotOptionsForDate = useCallback(
    (dateValue) => {
      const dayKey = getDayKeyFromDate(dateValue);
      if (!dayKey) return [];
      const slotMap = new Map();
      trainersForSlotMerge.forEach((trainer) => {
        buildHourlySlotsFromRanges(
          trainer?.availableHours?.[dayKey] || [],
        ).forEach((slot) => {
          if (!slotMap.has(slot.value)) slotMap.set(slot.value, slot);
        });
      });
      return Array.from(slotMap.values()).sort((a, b) =>
        a.start.localeCompare(b.start),
      );
    },
    [trainersForSlotMerge],
  );

  const singleDateGymSlotOptions = React.useMemo(() => {
    if (!form.startDate) return [];
    return getGymSlotOptionsForDate(form.startDate);
  }, [form.startDate, getGymSlotOptionsForDate]);

  const singleDateGymSlotDisplayOptions = React.useMemo(() => {
    const base = Array.isArray(singleDateGymSlotOptions)
      ? [...singleDateGymSlotOptions]
      : [];
    const normalizedStart = normalizeTimeValue(form.startTime);
    const normalizedEnd = normalizeTimeValue(form.endTime);
    if (!normalizedStart || !normalizedEnd) return base;
    const selectedValue = `${normalizedStart}-${normalizedEnd}`;
    const exists = base.some(
      (slot) => String(slot?.value || "") === selectedValue,
    );
    if (!exists) {
      base.unshift({
        value: selectedValue,
        start: normalizedStart,
        end: normalizedEnd,
        isCustom: true,
      });
    }
    return base;
  }, [form.startTime, form.endTime, singleDateGymSlotOptions]);

  useEffect(() => {
    const run = async () => {
      if (selectedTrainer) {
        setEligibleTrainers([]);
        return;
      }

      if (!String(effectiveBorrowSpecialization || "").trim()) {
        setEligibleTrainers([]);
        return;
      }

      let targetRanges = [];
      if (
        form.scheduleMode === "single" &&
        form.startDate &&
        form.startTime &&
        form.endTime
      ) {
        targetRanges = [
          {
            date: form.startDate,
            startTime: form.startTime,
            endTime: form.endTime,
          },
        ];
      }

      if (!targetRanges.length || !trainersForSlotMerge.length) {
        setEligibleTrainers([]);
        return;
      }

      setLoadingEligibleTrainers(true);
      try {
        const matched = [];
        for (const trainer of trainersForSlotMerge) {
          let isTrainerEligible = true;
          for (const slot of targetRanges) {
            const dayKey = getDayKeyFromDate(slot.date);
            const daySlots = buildHourlySlotsFromRanges(
              trainer?.availableHours?.[dayKey] || [],
            );
            const hasConfiguredSlot = daySlots.some(
              (s) => s.start === slot.startTime && s.end === slot.endTime,
            );
            if (!hasConfiguredSlot) {
              isTrainerEligible = false;
              break;
            }

            const scheduleRes = await ownerBookingService.getTrainerSchedule(
              trainer.id,
              slot.date,
              { includeAllGyms: true },
            );
            const occupied = Array.isArray(scheduleRes?.data)
              ? scheduleRes.data
              : [];
            const hasConflict = occupied.some(
              (item) =>
                slot.startTime < item.endTime && slot.endTime > item.startTime,
            );
            if (hasConflict) {
              isTrainerEligible = false;
              break;
            }
          }

          if (isTrainerEligible) matched.push(trainer);
        }

        setEligibleTrainers(matched);
      } catch {
        setEligibleTrainers([]);
      } finally {
        setLoadingEligibleTrainers(false);
      }
    };

    run();
  }, [
    trainersForSlotMerge,
    effectiveBorrowSpecialization,
    form.scheduleMode,
    form.startDate,
    form.startTime,
    form.endTime,
    selectedTrainer,
  ]);

  useEffect(() => {
    if (form.fromGymId) {
      const loadTrainersForGym = async () => {
        try {
          const res = await axios.get(
            `/api/owner/trainer-shares/available-trainers/${form.fromGymId}`,
          );
          setTrainers(res.data?.trainers || []);
        } catch (err) {
          setTrainers([]);
        }
      };
      loadTrainersForGym();
    } else {
      loadLookups();
    }
  }, [form.fromGymId, loadLookups]);

  useEffect(() => {
    const loadShareSchedule = async () => {
      if (!form.trainerId) {
        setShareTrainerSchedule([]);
        return;
      }

      let datesToCheck = [];
      if (form.startDate) {
        datesToCheck = [form.startDate];
      }

      if (datesToCheck.length === 0) {
        setShareTrainerSchedule([]);
        return;
      }

      setLoadingShareSchedule(true);
      try {
        const schedulePromises = datesToCheck.map((date) => {
          return ownerBookingService
            .getTrainerSchedule(form.trainerId, date, { includeAllGyms: true })
            .then((res) => ({ date, bookings: res.data || [] }))
            .catch(() => ({ date, bookings: [] }));
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
  }, [form.trainerId, form.startDate]);

  useEffect(() => {
    const loadMemberPackages = async () => {
      if (!form.memberId || !form.toGymId) {
        setMemberPackageOptions([]);
        return;
      }

      try {
        const fromDate = getTodayValue();
        const response = await ownerBookingService.getMyBookings({
          memberId: form.memberId,
          gymId: form.toGymId,
          fromDate,
          limit: 100,
        });
        const rows = Array.isArray(response?.data) ? response.data : [];
        const validRows = rows
          .filter(
            (booking) =>
              booking?.bookingDate && booking?.startTime && booking?.endTime,
          )
          .filter(
            (booking) =>
              !["cancelled", "no_show", "completed"].includes(
                String(booking?.status || "").toLowerCase(),
              ),
          )
          .map((booking) => ({
            id: booking.id,
            date: normalizeDateValue(booking.bookingDate),
            startTime: normalizeTimeValue(booking.startTime),
            endTime: normalizeTimeValue(booking.endTime),
            packageActivationId: booking.packageActivationId || null,
            packageId: booking.packageId || booking?.Package?.id || null,
            packageName: booking?.Package?.name || null,
            status: booking.status,
            value: `${normalizeDateValue(booking.bookingDate)}|${normalizeTimeValue(booking.startTime)}|${normalizeTimeValue(booking.endTime)}`,
          }))
          .filter(
            (slot) =>
              slot.date &&
              slot.startTime &&
              slot.endTime &&
              slot.startTime < slot.endTime,
          );

        const dedup = new Map();
        validRows.forEach((slot) => {
          if (!dedup.has(slot.value)) dedup.set(slot.value, slot);
        });

        const pkgMap = new Map();
        validRows.forEach((slot) => {
          const key = slot.packageActivationId || slot.packageId;
          if (!key) return;
          if (!pkgMap.has(String(key))) {
            pkgMap.set(String(key), {
              key: String(key),
              packageActivationId: slot.packageActivationId || null,
              packageId: slot.packageId || null,
              packageName: slot.packageName || "Gói không rõ tên",
            });
          }
        });
        setMemberPackageOptions(Array.from(pkgMap.values()));
      } catch {
        setMemberPackageOptions([]);
      }
    };

    loadMemberPackages();
  }, [form.memberId, form.toGymId]);

  useEffect(() => {
    const loadMemberBusySlots = async () => {
      if (!form.memberId || !form.toGymId) {
        setMemberBusySlots([]);
        return;
      }
      setLoadingMemberBusySlots(true);
      try {
        const response = await ownerGetRequests({
          page: 1,
          limit: 200,
          gymId: form.toGymId,
        });
        const rows = Array.isArray(response?.data) ? response.data : [];
        const mapped = rows
          .filter(
            (r) => String(r?.requestType || "").toUpperCase() === "BUSY_SLOT",
          )
          .filter((r) =>
            ["PENDING", "APPROVED"].includes(
              String(r?.status || "").toUpperCase(),
            ),
          )
          .filter(
            (r) =>
              String(r?.requestData?.memberId || "") === String(form.memberId),
          )
          .map((r) => ({
            id: r.id,
            date: normalizeDateValue(r?.requestData?.bookingDate),
            startTime: normalizeTimeValue(r?.requestData?.startTime),
            endTime: normalizeTimeValue(r?.requestData?.endTime),
            packageActivationId: r?.requestData?.packageActivationId || null,
            packageId: r?.requestData?.packageId || null,
            packageName: r?.requestData?.packageName || null,
            status: String(r?.status || "").toUpperCase(),
            bookingId: r?.requestData?.bookingId ?? null,
            busyTrainerId: r?.requestData?.busyTrainerId ?? null,
            busyTrainerSpecialization: r?.requestData?.busyTrainerSpecialization || "",
            borrowSpecialization: r?.requestData?.borrowSpecialization || "",
          }))
          .filter((x) => x.date && x.startTime && x.endTime)
          .sort((a, b) =>
            `${a.date} ${a.startTime}`.localeCompare(
              `${b.date} ${b.startTime}`,
            ),
          );
        setMemberBusySlots(mapped);
      } catch {
        setMemberBusySlots([]);
      } finally {
        setLoadingMemberBusySlots(false);
      }
    };
    loadMemberBusySlots();
  }, [form.memberId, form.toGymId]);

  useEffect(() => {
    if (editing) return;
    if (String(form.borrowSpecialization || "").trim()) return;
    if (!form.memberPackageActivationId || !memberPackageOptions.length) return;
    const row = memberPackageOptions.find(
      (p) =>
        String(p.packageActivationId || p.packageId || p.key || "") ===
        String(form.memberPackageActivationId),
    );
    const derived = borrowCanonicalFromPackageLabel(row?.packageName || "");
    if (!derived) return;
    setForm((prev) =>
      String(prev.borrowSpecialization || "").trim()
        ? prev
        : { ...prev, borrowSpecialization: derived },
    );
  }, [
    editing,
    form.borrowSpecialization,
    form.memberPackageActivationId,
    memberPackageOptions,
  ]);

  useEffect(() => {
    if (editing) return;
    if (!form.trainerId) return;
    if (loadingEligibleTrainers) return;
    if (!form.startDate || !form.startTime || !form.endTime) return;
    if (!String(effectiveBorrowSpecialization || "").trim()) return;
    if (
      eligibleTrainers.some((t) => String(t.id) === String(form.trainerId))
    ) {
      return;
    }
    setForm((p) => ({ ...p, trainerId: "" }));
  }, [
    editing,
    form.trainerId,
    form.startDate,
    form.startTime,
    form.endTime,
    effectiveBorrowSpecialization,
    eligibleTrainers,
    loadingEligibleTrainers,
  ]);

  const loadTrainerAvailability = useCallback(async () => {
    if (!isBookingsPage || activeTab !== "bookings") return;
    if (!availabilityFilters.date) {
      setTrainerAvailability([]);
      return;
    }

    const dayKey = getDayKeyFromDate(availabilityFilters.date);
    if (!dayKey || availabilityTrainers.length === 0) {
      setTrainerAvailability([]);
      return;
    }

    setLoadingAvailability(true);
    try {
      const results = await Promise.all(
        availabilityTrainers.map(async (trainer) => {
          const scheduleResponse = await ownerBookingService.getTrainerSchedule(
            trainer.id,
            availabilityFilters.date,
            { includeAllGyms: true },
          );
          const occupiedBlocks = Array.isArray(scheduleResponse?.data)
            ? scheduleResponse.data
            : Array.isArray(scheduleResponse)
              ? scheduleResponse
              : [];
          const availableRanges = normalizeRanges(
            trainer.availableHours?.[dayKey] || [],
          );
          const freeRanges = subtractBusyBlocks(
            availableRanges,
            occupiedBlocks,
          );
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
                busyRequested:
                  Boolean(item.busyRequested) ||
                  hasBusyRequestMarker(item.notes),
                memberName: item.Member?.User?.username || null,
                toGymName: item.toGym?.name || null,
                trainerShareId: item.trainerShareId ?? null,
                sharePaymentStatus: item.sharePaymentStatus || null,
                sharePaymentPtAcknowledgedAt:
                  item.sharePaymentPtAcknowledgedAt || null,
              }))
              .filter((item) => item.startTime && item.endTime),
            availableRanges,
            freeRanges,
            availabilityState,
          };
        }),
      );

      setTrainerAvailability(results);
    } catch (err) {
      setTrainerAvailability([]);
      setError(
        err?.response?.data?.message ||
          "Không thể tải lịch rảnh của huấn luyện viên",
      );
    } finally {
      setLoadingAvailability(false);
    }
  }, [
    activeTab,
    availabilityFilters.date,
    availabilityTrainers,
    isBookingsPage,
  ]);

  const loadMemberDailySchedule = useCallback(async () => {
    if (!isBookingsPage || activeTab !== "bookings") return;
    if (!availabilityFilters.date) {
      setMemberDailyBookings([]);
      return;
    }

    const scopedGymId = selectedGymId || availabilityFilters.gymId;
    if (!scopedGymId) {
      setMemberDailyBookings([]);
      return;
    }

    setLoadingMemberDailyBookings(true);
    try {
      const bookingPromise = ownerBookingService.getMyBookings({
        gymId: scopedGymId,
        fromDate: availabilityFilters.date,
        toDate: availabilityFilters.date,
        limit: 120,
        page: 1,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Hết thời gian tải lịch tập hội viên")),
          12000,
        ),
      );
      const response = await Promise.race([bookingPromise, timeoutPromise]);
      const rows = Array.isArray(response?.data) ? response.data : [];
      const filtered = rows
        .filter(
          (booking) =>
            String(booking?.status || "").toLowerCase() !== "cancelled",
        )
        .sort((a, b) => {
          const ta = `${normalizeDateValue(a?.bookingDate)} ${normalizeTimeValue(a?.startTime)}`;
          const tb = `${normalizeDateValue(b?.bookingDate)} ${normalizeTimeValue(b?.startTime)}`;
          return ta.localeCompare(tb);
        });
      setMemberDailyBookings(filtered);
    } catch (err) {
      setMemberDailyBookings([]);
      setError(
        err?.response?.data?.message || "Không thể tải lịch tập hội viên",
      );
    } finally {
      setLoadingMemberDailyBookings(false);
    }
  }, [
    activeTab,
    availabilityFilters.date,
    availabilityFilters.gymId,
    isBookingsPage,
    selectedGymId,
  ]);

  const openMemberBookingDetail = useCallback(async (bookingId) => {
    const id = Number(bookingId);
    if (!Number.isInteger(id) || id < 1) return;
    setMemberBookingDetailOpen(true);
    setMemberBookingDetail(null);
    setMemberBookingDetailError("");
    setMemberBookingDetailLoading(true);
    try {
      const res = await ownerBookingService.getBookingDetail(id);
      setMemberBookingDetail(res?.data ?? null);
    } catch (err) {
      setMemberBookingDetailError(
        err?.response?.data?.message ||
          err?.message ||
          "Không tải được chi tiết buổi tập",
      );
    } finally {
      setMemberBookingDetailLoading(false);
    }
  }, []);

  const closeMemberBookingDetail = useCallback(() => {
    setMemberBookingDetailOpen(false);
    setMemberBookingDetail(null);
    setMemberBookingDetailError("");
    setMemberBookingDetailLoading(false);
  }, []);

  const loadShares = useCallback(
    async (page = currentPage) => {
      try {
        setLoading(true);
        setError("");
        const params = cleanQueryParams({ ...filters, page, limit: 10 });
        console.log("📡 API call: /api/owner/trainer-shares", params);
        const res = await ownerGetMyTrainerShares(params);
        console.log("📥 Response shares:", res.data);
        setShares(res.data?.data || []);
        setPagination(res.data?.pagination || {});
      } catch (err) {
        console.error("Error loading trainer shares:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Không thể tải danh sách",
        );
      } finally {
        setLoading(false);
      }
    },
    [currentPage, filters],
  );

  const loadReceivedShares = useCallback(
    async (page = receivedCurrentPage) => {
      try {
        setLoading(true);
        setError("");
        const params = cleanQueryParams({
          ...receivedFilters,
          page,
          limit: 10,
        });
        const res = await ownerGetReceivedTrainerShares(params);
        setReceivedShares(res.data?.data || []);
        setReceivedPagination(res.data?.pagination || {});
      } catch (err) {
        console.error("Error loading received shares:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Không thể tải danh sách yêu cầu",
        );
      } finally {
        setLoading(false);
      }
    },
    [receivedCurrentPage, receivedFilters],
  );

  const loadScheduleForShare = useCallback(async (share) => {
    setLoadingShareSchedule(true);

    try {
      if (!share?.trainerId || !share?.startDate) {
        setShareTrainerSchedule([]);
        return;
      }

      const startDate = new Date(share.startDate);
      const endDate = share.endDate
        ? new Date(share.endDate)
        : new Date(share.startDate);
      const schedulePromises = [];
      const currentDate = new Date(startDate);
      let dayCount = 0;

      while (currentDate <= endDate && dayCount < 30) {
        const dateStr = currentDate.toISOString().split("T")[0];
        schedulePromises.push(
          ownerBookingService
            .getTrainerSchedule(share.trainerId, dateStr, {
              includeAllGyms: true,
            })
            .then((res) => ({ date: dateStr, bookings: res.data || [] }))
            .catch(() => ({ date: dateStr, bookings: [] })),
        );
        currentDate.setDate(currentDate.getDate() + 1);
        dayCount += 1;
      }

      const allSchedules = await Promise.all(schedulePromises);
      setShareTrainerSchedule(allSchedules);
    } catch (_err) {
      setShareTrainerSchedule([]);
    } finally {
      setLoadingShareSchedule(false);
    }
  }, []);

  const handleViewTrainerSchedule = async (share) => {
    setSelectedShareForSchedule(share);
    setShowScheduleModal(true);
    await loadScheduleForShare(share);
  };

  const handleAcceptShare = async (id, shareContext = null) => {
    const confirmResult = await showAppConfirm({
      title: "Xác nhận đồng ý",
      message: "Bạn có chắc muốn đồng ý cho đối tác mượn huấn luyện viên này?",
      confirmText: "Đồng ý",
      cancelText: "Hủy",
    });
    if (!confirmResult.confirmed) return;

    try {
      setError("");
      setSuccess("");
      const res = await ownerAcceptTrainerShare(id);
      const acceptedShare = res?.data?.data ||
        res?.data || { ...(shareContext || {}), id, status: "approved" };
      const nextShare = {
        ...(shareContext || {}),
        ...acceptedShare,
        status: "approved",
      };
      setReceivedShares((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...nextShare } : item)),
      );
      setSelectedShare((prev) =>
        prev?.id === id ? { ...prev, ...nextShare } : prev,
      );
      setSelectedShareForSchedule((prev) =>
        prev?.id === id ? { ...prev, ...nextShare } : prev,
      );
      setSuccess("Đã đồng ý cho đối tác mượn huấn luyện viên.");
      await loadReceivedShares();
      if (shareContext) {
        setShowScheduleModal(true);
        setSelectedShareForSchedule(nextShare);
        await loadScheduleForShare(nextShare);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể xác nhận yêu cầu mượn huấn luyện viên",
      );
    }
  };

  const handleRejectShare = async (id) => {
    const reasonResult = await showAppConfirm({
      title: "Từ chối yêu cầu",
      message: "Nhập lý do từ chối yêu cầu mượn huấn luyện viên (tùy chọn):",
      confirmText: "Xác nhận",
      cancelText: "Hủy",
      requireInput: true,
      inputPlaceholder: "Nhập lý do (có thể để trống)",
    });
    if (!reasonResult.confirmed) return;
    const reason = String(reasonResult.value || "");

    try {
      setError("");
      setSuccess("");
      await ownerRejectTrainerShare(id, reason);
      setSuccess("Đã từ chối yêu cầu mượn huấn luyện viên.");
      loadReceivedShares();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể từ chối yêu cầu mượn huấn luyện viên",
      );
    }
  };

  const handleDetailSaveSessionPrice = async () => {
    if (!selectedShare?.id) return;
    try {
      setSavingDetailPrice(true);
      setError("");
      const res = await ownerUpdateTrainerShareSessionPrice(selectedShare.id, {
        sessionPrice: detailSessionPriceInput,
      });
      setSuccess("Đã cập nhật giá buổi.");
      const updated = res?.data?.data;
      if (updated) setSelectedShare(updated);
      loadShares(currentPage);
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được giá");
    } finally {
      setSavingDetailPrice(false);
    }
  };

  const handleDetailConfirmPayment = async () => {
    if (!selectedShare?.id) return;
    if (confirmPaymentFiles.length > 8) {
      setError("Tối đa 8 ảnh chứng từ.");
      return;
    }
    try {
      setPaymentActionLoading(true);
      setError("");
      const imageUrls = [];
      for (const file of confirmPaymentFiles) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await ownerUploadGymImage(fd);
        const url = up?.data?.url;
        if (url) imageUrls.push(url);
      }
      const res = await ownerConfirmTrainerSharePayment(selectedShare.id, {
        imageUrls,
        note: confirmPaymentNote || undefined,
      });
      setSuccess("Đã xác nhận đã chuyển khoản.");
      setConfirmPaymentFiles([]);
      setConfirmPaymentNote("");
      const updated = res?.data?.data;
      if (updated) setSelectedShare(updated);
      loadShares(currentPage);
    } catch (err) {
      setError(err.response?.data?.message || "Không xác nhận được");
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handleBorrowerDisputeResponseSubmit = async () => {
    if (!selectedShare?.id) return;
    const note = borrowerResponseText.trim();
    const maxTotal = 8;
    const urls = [...borrowerProofUrls];
    if (urls.length + pendingProofFiles.length > maxTotal) {
      setError(`Chỉ tối đa ${maxTotal} ảnh.`);
      return;
    }
    try {
      setDisputeResponseLoading(true);
      setError("");
      for (const file of pendingProofFiles) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await ownerUploadGymImage(fd);
        const url = res?.data?.url;
        if (url) urls.push(url);
      }
      const res = await ownerRespondTrainerSharePaymentDispute(selectedShare.id, {
        note: note || undefined,
        imageUrls: urls,
      });
      setSuccess("Đã gửi phản hồi và ảnh cho PT.");
      const updated = res?.data?.data;
      if (updated) setSelectedShare(updated);
      setPendingProofFiles([]);
      loadShares(currentPage);
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được phản hồi");
    } finally {
      setDisputeResponseLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedShare) {
      setDetailSessionPriceInput("");
      return;
    }
    setDetailSessionPriceInput(
      selectedShare.sessionPrice != null && selectedShare.sessionPrice !== ""
        ? String(selectedShare.sessionPrice)
        : "",
    );
  }, [selectedShare, selectedShare?.id, selectedShare?.sessionPrice]);

  useEffect(() => {
    if (!selectedShare?.id) {
      setBorrowerResponseText("");
      setBorrowerProofUrls([]);
      setPendingProofFiles([]);
      setConfirmPaymentFiles([]);
      return;
    }
    setBorrowerResponseText(String(selectedShare.borrowerDisputeResponseNote || ""));
    setBorrowerProofUrls(parseTrainerShareProofUrls(selectedShare.paymentProofImageUrls));
    setPendingProofFiles([]);
    setConfirmPaymentFiles([]);
  }, [
    selectedShare?.id,
    selectedShare?.borrowerDisputeResponseNote,
    selectedShare?.paymentProofImageUrls,
  ]);

  /** Mở modal chi tiết: tải lại bản ghi đầy đủ (tranh chấp / form phản hồi không bị thiếu field so với list). */
  useEffect(() => {
    if (!showDetailModal || !selectedShare?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await ownerGetTrainerShareDetail(selectedShare.id);
        const data = res?.data?.data;
        if (!cancelled && data) setSelectedShare(data);
      } catch {
        /* giữ dữ liệu từ dòng bảng */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showDetailModal, selectedShare?.id]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  /** Trang phiếu mượn PT: chỉ tải danh sách PT + HV khi mở form tạo/sửa — tránh 2 API nặng mỗi lần vào trang */
  useEffect(() => {
    if (!showModal || isBookingsPage) return;
    if (allOwnerTrainers.length > 0 && members.length > 0) return;
    let cancelled = false;
    (async () => {
      setLoadingLookups(true);
      try {
        await loadPeopleLookups();
      } finally {
        if (!cancelled) setLoadingLookups(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    showModal,
    isBookingsPage,
    allOwnerTrainers.length,
    members.length,
    loadPeopleLookups,
  ]);

  const refreshTrainerShareData = useCallback(async () => {
    const tasks = [
      loadShares(currentPage),
      loadReceivedShares(receivedCurrentPage),
    ];

    if (isBookingsPage && activeTab === "bookings") {
      tasks.push(loadTrainerAvailability(), loadMemberDailySchedule());
    }

    await Promise.all(tasks);
  }, [
    activeTab,
    currentPage,
    isBookingsPage,
    loadMemberDailySchedule,
    loadReceivedShares,
    loadShares,
    loadTrainerAvailability,
    receivedCurrentPage,
  ]);

  useOwnerRealtimeRefresh({
    enabled:
      activeTab === "shares" || activeTab === "received" || isBookingsPage,
    onRefresh: refreshTrainerShareData,
    events: ["notification:new", "trainer_share:changed", "booking:status-changed"],
    notificationTypes: ["trainer_share", "booking_update"],
  });

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
      loadTrainerAvailability();
      loadMemberDailySchedule();
    }
  }, [
    activeTab,
    currentPage,
    loadMemberDailySchedule,
    loadReceivedShares,
    loadShares,
    loadTrainerAvailability,
    receivedCurrentPage,
  ]);

  const handleCreate = () => {
    setEditing(null);
    setForm({
      ...INITIAL_FORM,
      toGymId: selectedGymId ? String(selectedGymId) : "",
    });
    setShowModal(true);
  };

  const handleEdit = (share) => {
    const normalizedSpecificSchedules = Array.isArray(share.specificSchedules)
      ? share.specificSchedules
      : [];
    const primarySchedule = normalizedSpecificSchedules[0] || null;

    setEditing(share);
    setForm({
      ...INITIAL_FORM,
      trainerId: share.trainerId || "",
      fromGymId: share.fromGymId || "",
      toGymId: share.toGymId || "",
      memberId: share.memberId || "",
      borrowSpecialization: share.borrowSpecialization || "",
      memberPackageActivationId: "",
      startDate:
        primarySchedule?.date ||
        (share.startDate ? share.startDate.slice(0, 10) : ""),
      endDate: share.endDate
        ? share.endDate.slice(0, 10)
        : primarySchedule?.date || "",
      startTime: primarySchedule?.startTime || share.startTime || "",
      endTime: primarySchedule?.endTime || share.endTime || "",
      notes: share.notes || "",
      scheduleMode: "single",
      multipleDates: [],
      sessionPrice:
        share.sessionPrice != null && share.sessionPrice !== ""
          ? String(share.sessionPrice)
          : "",
    });
    setShowModal(true);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (leadTimeError) {
      setError(leadTimeError);
      return;
    }

    const borrowForSubmit = String(effectiveBorrowSpecialization || "").trim();

    if (!editing && !borrowForSubmit) {
      setError(
        "Chọn slot báo bận (điền nhanh) hoặc chọn huấn luyện viên để hệ thống biết chuyên môn mượn.",
      );
      return;
    }

    if (
      !editing &&
      !form.trainerId &&
      !loadingEligibleTrainers &&
      eligibleTrainers.length === 0
    ) {
      setError(
        "Không có huấn luyện viên cùng chuyên môn còn rảnh khung giờ này tại phòng tập nguồn.",
      );
      return;
    }

    if (
      !editing &&
      form.trainerId &&
      selectedTrainer &&
      borrowForSubmit &&
      !trainerMatchesBorrowSpecialization(
        selectedTrainer.specialization,
        borrowForSubmit,
      )
    ) {
      setError("Huấn luyện viên đã chọn không khớp chuyên môn mượn.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!form.startDate || !form.startTime || !form.endTime) {
      setError("Vui lòng nhập đầy đủ ngày và giờ");
      return;
    }
    const selectedDate = new Date(form.startDate);
    if (selectedDate < today) {
      setError("Không thể chọn ngày trong quá khứ");
      return;
    }
    if (form.endTime <= form.startTime) {
      setError("Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }

// Validate time conflict (chỉ ngày đang chọn; cùng logic lọc với chọn slot)
    if (form.startDate) {
      const bookings = bookingsByDate.get(form.startDate) || [];
      const st = normalizeTimeValue(form.startTime);
      const et = normalizeTimeValue(form.endTime);
      const hasConflict =
        Boolean(st && et) &&
        bookings.some((s) => {
          const bs = normalizeTimeValue(s.startTime);
          const be = normalizeTimeValue(s.endTime);
          return Boolean(bs && be && st < be && et > bs);
        });

      if (hasConflict) {
        setError(
          "❌ Trainer đã có lịch trong khoảng thời gian này! Vui lòng chọn khung giờ khác.",
        );
        return;
      }
    }

    try {
      if (!form.startDate) {
        setError("Vui lòng chọn ngày mượn huấn luyện viên");
        return;
      }

      if (editing) {
        const sharePayload = {
          memberId: form.memberId || null,
          notes: form.notes || "",
          shareType: DEFAULT_SHARE_TYPE,
          commissionSplit: DEFAULT_COMMISSION_SPLIT,
          sessionPrice: Number(String(form.sessionPrice || "").replace(/,/g, "")),
        };

        sharePayload.startDate = form.startDate;
        sharePayload.endDate = form.startDate;
        sharePayload.startTime = form.startTime;
        sharePayload.endTime = form.endTime;

        await ownerUpdateTrainerShare(editing.id, sharePayload);
        setSuccess("Cập nhật yêu cầu thành công!");
      } else {
        const sharePayload = {
          ...form,
          scheduleMode: "single",
          endDate: form.startDate,
          multipleDates: [],
          memberId: form.memberId || null,
          notes: form.notes || "",
          shareType: DEFAULT_SHARE_TYPE,
          commissionSplit: DEFAULT_COMMISSION_SPLIT,
          borrowSpecialization: String(effectiveBorrowSpecialization || "").trim(),
          sessionPrice: Number(String(form.sessionPrice || "").replace(/,/g, "")),
        };
        await ownerCreateTrainerShare(sharePayload);
        setSuccess("Tạo yêu cầu chia sẻ huấn luyện viên thành công!");

        // Nếu tạo từ luồng báo bận PT, cần approve request báo bận
        if (busyRequestIdToApprove) {
          try {
            await approveRequest(busyRequestIdToApprove, "Đã duyệt yêu cầu báo bận và chuyển sang luồng mượn huấn luyện viên.", {
              assignmentMode: "borrow_only",
            });
            setBusyRequestIdToApprove(null);
          } catch (approveErr) {
            console.warn("Không thể tự động duyệt request báo bận:", approveErr);
          }
        }
      }

      setShowModal(false);
      loadShares();
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // Xóa share
  const handleDelete = async (id) => {
    const confirmResult = await showAppConfirm({
      title: "Xác nhận xóa",
      message: "Bạn có chắc muốn xóa yêu cầu này?",
      confirmText: "Xóa",
      cancelText: "Hủy",
    });
    if (!confirmResult.confirmed) return;

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

  /** Một ngày nếu trùng; hai ngày nếu khác. useArrow: bảng nhận dùng → */
  const formatShareTableDateLine = (share, useArrow) => {
    if (!share?.startDate) return "Không giới hạn";
    const startLabel = formatDate(share.startDate);
    const endLabel = formatDate(share.endDate || share.startDate);
    if (startLabel === endLabel) return startLabel;
    const sep = useArrow ? " → " : " - ";
    return `${startLabel}${sep}${endLabel}`;
  };

  /** Giờ buổi (dòng phụ dưới ngày) */
  const shareTableTimeSubline = (share) => {
    const st = share?.startTime;
    const et = share?.endTime;
    if (!st || !et) return null;
    const s = String(st).trim().slice(0, 5);
    const e = String(et).trim().slice(0, 5);
    if (s === "00:00" && e === "00:00") return null;
    return `${s} - ${e}`;
  };

  const isUsableAvatar = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return false;
    if (/default-avatar(\.png)?$/i.test(raw)) return false;
    return true;
  };

  const getAvatarUrl = (trainer) => {
    const candidates = [
      trainer?.User?.avatar,
      trainer?.user?.avatar,
      trainer?.avatar,
      trainer?.profileImages?.avatarUrl,
      trainer?.socialLinks?.avatarUrl,
      trainer?.socialLinks?.profileImage,
    ];
    const picked = candidates.find((item) => isUsableAvatar(item));
    if (!picked) return "";
    const normalized = normalizeSingleImageSrc(picked);
    return isUsableAvatar(normalized) ? normalized : "";
  };

  const pageTitle = isBookingsPage
    ? "Lịch dạy huấn luyện viên"
    : "Chia sẻ huấn luyện viên";
  const pageSubtitle = isBookingsPage
    ? `Xem khung giờ làm việc và khung giờ còn trống của huấn luyện viên${selectedGymName ? ` tại ${selectedGymName}` : " theo chi nhánh"}`
    : `Quản lý yêu cầu mượn và cho mượn huấn luyện viên${selectedGymName ? ` cho ${selectedGymName}` : " giữa các phòng tập"}`;

  const primaryAction = isBookingsPage
    ? null
    : activeTab === "shares"
      ? handleCreate
      : null;

  const primaryLabel = isBookingsPage
    ? ""
    : activeTab === "shares"
      ? "Tạo yêu cầu xin mượn huấn luyện viên"
      : "";

  return (
    <div
      className={`ots-page ${activeTab === "bookings" ? "ots-page--bookings" : ""}`}
    >
      <div className="ots-header">
        <div>
          <h1 className="ots-title">{pageTitle}</h1>
          <p className="ots-subtitle">{pageSubtitle}</p>
        </div>
        {(isBookingsPage || activeTab !== "received") && primaryAction && (
          <button className="btn-primary" onClick={primaryAction}>
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
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">Tất cả</option>
              <option value="waiting_acceptance">Chờ chấp nhận</option>
              <option value="pending_trainer">Chờ PT nhận lịch</option>
              <option value="approved">Đã chấp nhận</option>
              <option value="rejected">Từ chối</option>
            </select>
            <button
              className="btn-primary"
              onClick={() => {
                setCurrentPage(1);
                loadShares(1);
              }}
            >
              Tìm
            </button>
          </div>

          {/* Shares Table */}
          {loading ? (
            <table className="ots-table">
              <thead>
                <tr>
                  <th>ID</th><th>Trainer</th><th>Từ Gym</th><th>Đến Gym</th><th>Thời gian</th><th>Giá buổi</th><th>Thanh toán</th><th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((n) => (
                  <tr key={n}>
                    <td><span className="ots-skeleton-bar" style={{ display: "inline-block", width: "24px", height: "12px" }} /></td>
                    <td><span className="ots-skeleton-bar ots-skeleton-bar--short" style={{ display: "inline-block" }} /></td>
                    <td><span className="ots-skeleton-bar ots-skeleton-bar--medium" style={{ display: "inline-block" }} /></td>
                    <td><span className="ots-skeleton-bar ots-skeleton-bar--medium" style={{ display: "inline-block" }} /></td>
                    <td><span className="ots-skeleton-bar" style={{ display: "inline-block", width: "60px", height: "12px" }} /></td>
                    <td><span className="ots-skeleton-bar" style={{ display: "inline-block", width: "50px", height: "12px" }} /></td>
                    <td><span className="ots-skeleton-bar" style={{ display: "inline-block", width: "80px", height: "12px" }} /></td>
                    <td><span className="ots-skeleton-bar" style={{ display: "inline-block", width: "90px", height: "12px" }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : error ? (
            <div className="ots-empty">
              <p style={{ color: "#ff5555" }}>Lỗi: {error}</p>
              <button className="ots-btn ots-btn--primary" onClick={loadShares}>
                Thử lại
              </button>
            </div>
          ) : visibleShares.length === 0 ? (
            <div className="ots-empty">
              <p>Chưa có yêu cầu chia sẻ huấn luyện viên nào</p>
              <button
                className="ots-btn ots-btn--primary"
                onClick={handleCreate}
              >
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
                    <th>Giá buổi</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
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
                      style={{ cursor: "pointer" }}
                    >
                      <td>{share.id}</td>
                      <td>
                        <strong>{share.Trainer?.User?.username || "—"}</strong>
                      </td>
                      <td>{share.fromGym?.name || "—"}</td>
                      <td>{share.toGym?.name || "—"}</td>
                      <td>
                        <div className="ots-table-dateCell">
                          <div>{formatShareTableDateLine(share, false)}</div>
                          {(() => {
                            const t = shareTableTimeSubline(share);
                            return t ? (
                              <div className="ots-table-dateCell__time">{t}</div>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatVnd(share.sessionPrice)}
                      </td>
                      <td style={{ fontSize: "0.88rem", maxWidth: "8rem" }}>
                        {renderSharePaymentStatusCell(share)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="ots-status-cell">
                          <StatusBadge status={share.status} />
                          {(share.status === "waiting_acceptance" ||
                            share.status === "pending_trainer") && (
                            <div className="ots-actions">
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
                            </div>
                          )}
                          {share.status === "rejected_by_partner" && share.notes ? (
                            <span
                              className="ots-status-cell__note"
                            >
                              {share.notes}
                            </span>
                          ) : null}
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
              <div className="ots-stat-card__value">
                {visibleReceivedShares.length}
              </div>
            </div>
            <div className="ots-stat-card ots-stat-card--warning">
              <div className="ots-stat-card__label">Chờ xử lý</div>
              <div className="ots-stat-card__value">
                {
                  visibleReceivedShares.filter((s) =>
                    ["waiting_acceptance", "pending_trainer"].includes(s.status),
                  ).length
                }
              </div>
            </div>
            <div className="ots-stat-card ots-stat-card--success">
              <div className="ots-stat-card__label">Đã chấp nhận</div>
              <div className="ots-stat-card__value">
                {
                  visibleReceivedShares.filter((s) => s.status === "approved")
                    .length
                }
              </div>
            </div>
            <div className="ots-stat-card ots-stat-card--danger">
              <div className="ots-stat-card__label">Đã từ chối</div>
              <div className="ots-stat-card__value">
                {
                  visibleReceivedShares.filter(
                    (s) => s.status === "rejected_by_partner",
                  ).length
                }
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="ots-filters">
            <input
              className="ots-filter-input"
              placeholder="Tìm huấn luyện viên..."
              value={receivedFilters.q}
              onChange={(e) =>
                setReceivedFilters({ ...receivedFilters, q: e.target.value })
              }
            />
            <select
              className="ots-filter-select"
              value={receivedFilters.status}
              onChange={(e) =>
                setReceivedFilters({
                  ...receivedFilters,
                  status: e.target.value,
                })
              }
            >
              <option value="">Tất cả trạng thái</option>
              <option value="waiting_acceptance">Chờ chấp nhận</option>
              <option value="pending_trainer">Chờ PT nhận lịch</option>
              <option value="approved">Đã chấp nhận</option>
              <option value="rejected_by_partner">Đã từ chối</option>
            </select>
            <button
              className="ots-btn ots-btn--primary"
              onClick={() => {
                setReceivedCurrentPage(1);
                loadReceivedShares(1);
              }}
            >
              Tìm
            </button>
          </div>

          {/* Received Shares Table */}
          {loading ? (
            <div className="ots-loading">Đang tải...</div>
          ) : error ? (
            <div className="ots-empty">
              <p style={{ color: "#ff5555" }}>Lỗi: {error}</p>
              <button
                className="ots-btn ots-btn--primary"
                onClick={loadReceivedShares}
              >
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
                    <th>Giá buổi</th>
                    <th>TT</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReceivedShares.map((share) => (
                    <tr key={share.id}>
                      <td>#{share.id}</td>
                      <td>
                        {share.Trainer?.User?.username ||
                          `Huấn luyện viên #${share.trainerId}`}
                      </td>
                      <td>
                        {share.FromGym?.name || `Gym #${share.fromGymId}`}
                      </td>
                      <td>{share.ToGym?.name || `Gym #${share.toGymId}`}</td>
                      <td>
                        <div className="ots-table-dateCell">
                          <div>{formatShareTableDateLine(share, true)}</div>
                          {(() => {
                            const t = shareTableTimeSubline(share);
                            return t ? (
                              <div className="ots-table-dateCell__time">{t}</div>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatVnd(share.sessionPrice)}
                      </td>
                      <td style={{ fontSize: "0.85rem", maxWidth: "6.5rem" }}>
                        {renderSharePaymentStatusCell(share)}
                      </td>
                      <td>
                        <div className="ots-status-cell">
                          <span
                            className={`ots-badge ${
                              share.status === "waiting_acceptance" ||
                              share.status === "pending_trainer"
                                ? "ots-badge--warning"
                                : share.status === "approved"
                                  ? "ots-badge--success"
                                  : share.status === "rejected_by_partner"
                                    ? "ots-badge--danger"
                                    : "ots-badge--danger"
                            }`}
                          >
                            {STATUS_LABELS[share.status]?.label || share.status}
                          </span>
                          {(share.status === "waiting_acceptance" ||
                            share.status === "pending_trainer" ||
                            share.status === "approved") && (
                            <div className="ots-actions">
                              {share.status === "waiting_acceptance" && (
                                <>
                                  <button
                                    className="ots-btn ots-btn--sm ots-btn--info"
                                    type="button"
                                    onClick={() =>
                                      handleViewTrainerSchedule(share)
                                    }
                                    title="Xem lịch huấn luyện viên"
                                  >
                                    Lịch
                                  </button>
                                  <button
                                    className="ots-btn ots-btn--sm ots-btn--success"
                                    type="button"
                                    onClick={() =>
                                      handleAcceptShare(share.id, share)
                                    }
                                    title="Chấp nhận"
                                  >
                                    Chấp nhận
                                  </button>
                                  <button
                                    className="ots-btn ots-btn--sm ots-btn--danger"
                                    type="button"
                                    onClick={() => handleRejectShare(share.id)}
                                    title="Từ chối"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}
                              {share.status === "pending_trainer" && (
                                <>
                                  <button
                                    className="ots-btn ots-btn--sm ots-btn--info"
                                    type="button"
                                    onClick={() =>
                                      handleViewTrainerSchedule(share)
                                    }
                                    title="Xem lịch huấn luyện viên"
                                  >
                                    Lịch
                                  </button>
                                  <button
                                    className="ots-btn ots-btn--sm ots-btn--danger"
                                    type="button"
                                    onClick={() => handleRejectShare(share.id)}
                                    title="Từ chối"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}
                              {share.status === "approved" && (
                                <button
                                  className="ots-btn ots-btn--sm ots-btn--info"
                                  type="button"
                                  onClick={() =>
                                    handleViewTrainerSchedule(share)
                                  }
                                  title="Xem lịch huấn luyện viên"
                                >
                                  Lịch
                                </button>
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
              {receivedPagination.totalPages > 1 && (
                <div className="ots-pagination">
                  <button
                    className="ots-btn ots-btn--sm"
                    disabled={receivedCurrentPage === 1}
                    onClick={() =>
                      setReceivedCurrentPage(receivedCurrentPage - 1)
                    }
                  >
                    Trước
                  </button>
                  <span>
                    Trang {receivedCurrentPage} /{" "}
                    {receivedPagination.totalPages}
                  </span>
                  <button
                    className="ots-btn ots-btn--sm"
                    disabled={
                      receivedCurrentPage === receivedPagination.totalPages
                    }
                    onClick={() =>
                      setReceivedCurrentPage(receivedCurrentPage + 1)
                    }
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
        <div className="ots-bookings-layout">
          {/* Trainer Availability */}
          <div className="ots-availability-panel ots-availability-panel--trainer">
            <div className="ots-availability-panel__header">
              <div>
                <h3 className="ots-availability-panel__title">
                  Lịch dạy huấn luyện viên
                </h3>
                <p className="ots-availability-panel__subtitle">
                  Xem khung giờ còn trống của từng huấn luyện viên theo chi
                  nhánh và ngày cụ thể
                </p>
              </div>
              <div className="ots-availability-panel__filters">
                <select
                  className="ots-filter-select"
                  value={availabilityFilters.gymId}
                  onChange={(e) =>
                    setAvailabilityFilters((prev) => ({
                      ...prev,
                      gymId: e.target.value,
                    }))
                  }
                  disabled={Boolean(selectedGymId)}
                >
                  <option value="">
                    {selectedGymId
                      ? selectedGymName || "Chi nhánh đang quản lý"
                      : "Tất cả chi nhánh"}
                  </option>
                  {bookingGyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="ots-filter-input"
                  value={availabilityFilters.date}
                  onChange={(e) =>
                    setAvailabilityFilters((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                />
                <button
                  className="ots-btn ots-btn--secondary"
                  onClick={() => {
                    loadTrainerAvailability();
                    loadMemberDailySchedule();
                  }}
                >
                  Xem lịch 
                </button>
              </div>
            </div>

            <div className="ots-availability-panel__meta">
              <span>
                {DAY_LABELS[getDayKeyFromDate(availabilityFilters.date)] ||
                  "Ngày đã chọn"}
                {availabilityFilters.date
                  ? ` • ${formatDate(availabilityFilters.date)}`
                  : ""}
              </span>
              <span>
                {visibleTrainerAvailability.length} huấn luyện viên trong danh
                sách
              </span>
            </div>

            {loadingAvailability ? (
              <div className="ots-loading">
                Đang tải lịch rảnh của huấn luyện viên...
              </div>
            ) : visibleTrainerAvailability.length === 0 ? (
              <div className="ots-empty ots-empty--compact">
                <p>
                  Không có huấn luyện viên nào có lịch làm việc trong ngày đã
                  chọn.
                </p>
              </div>
            ) : (
              <>
                <div className="ots-availability-grid">
                  {paginatedTrainerAvailability.map(
                    ({
                      trainer,
                      freeRanges,
                      occupiedBlocks,
                      availableRanges,
                      availabilityState,
                    }) => (
                      <div key={trainer.id} className="ots-availability-card">
                        <div className="ots-availability-card__top">
                          <div className="ots-availability-card__identity">
                            <div className="ots-availability-card__avatarWrap">
                              {getAvatarUrl(trainer) ? (
                                <img
                                  src={getAvatarUrl(trainer)}
                                  alt={
                                    trainer.User?.username ||
                                    trainer.user?.username ||
                                    `Huấn luyện viên #${trainer.id}`
                                  }
                                  className="ots-availability-card__avatar"
                                />
                              ) : (
                                <span className="ots-availability-card__avatarFallback">
                                  {String(
                                    trainer.User?.username ||
                                      trainer.user?.username ||
                                      "H",
                                  )
                                    .slice(0, 1)
                                    .toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="ots-availability-card__name">
                                {trainer.User?.username ||
                                  trainer.user?.username ||
                                  `Huấn luyện viên #${trainer.id}`}
                              </div>
                              <div className="ots-availability-card__meta">
                                {trainer.Gym?.name || "Không rõ chi nhánh"}
                                {trainer.specialization
                                  ? ` • ${trainer.specialization}`
                                  : ""}
                              </div>
                              <div className="ots-availability-card__level">
                                HLV #{trainer.id}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="ots-availability-section">
                          <div className="ots-availability-section__label">
                            Khung giờ làm việc
                          </div>
                          <div className="ots-slot-list">
                            {availableRanges.length ? (
                              availableRanges.map((range, index) => (
                                <span
                                  key={`${trainer.id}-available-${index}`}
                                  className="ots-slot-pill ots-slot-pill--outline"
                                >
                                  {range.start} - {range.end}
                                </span>
                              ))
                            ) : (
                              <span className="ots-availability-muted">
                                Chưa cập nhật lịch làm việc
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ots-availability-section">
                          <div className="ots-availability-section__label">
                            Khung giờ còn rảnh
                          </div>
                          <div className="ots-slot-list">
                            {freeRanges.length ? (
                              freeRanges.map((range, index) => (
                                <span
                                  key={`${trainer.id}-free-${index}`}
                                  className="ots-slot-pill ots-slot-pill--free ots-slot-pill--interactive"
                                >
                                  {range.start} - {range.end}
                                </span>
                              ))
                            ) : (
                              <span className="ots-availability-muted">
                                {availabilityState === "off"
                                  ? "Huấn luyện viên không làm việc trong ngày này"
                                  : availabilityState === "unconfigured"
                                    ? "Huấn luyện viên chưa cập nhật lịch làm việc"
                                    : "Không còn khung giờ trống trong ngày này"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ots-availability-section">
                          <div className="ots-availability-section__label">
                            Khung giờ đang bận
                          </div>
                          <div className="ots-slot-list ots-slot-list--stacked">
                            {occupiedBlocks.length ? (
                              occupiedBlocks.map((block) => (
                                <div
                                  key={`${trainer.id}-busy-${block.id}`}
                                  className={`ots-slot-pill ots-slot-pill--busy ${block.busyRequested ? "ots-slot-pill--busy-requested" : ""}`}
                                >
                                  <span>
                                    {block.startTime} - {block.endTime}
                                  </span>
                                  <span className="ots-slot-pill__busyCol">
                                    <span>{getOccupiedBlockLabel(block)}</span>
                                    {String(block.type || "") === "trainer_share" &&
                                    String(block.sharePaymentStatus || "") ===
                                      "paid" ? (
                                      <span
                                        className={
                                          block.sharePaymentPtAcknowledgedAt
                                            ? "ots-paymentLabel--strikeResolved ots-slot-pill__paidTag"
                                            : "ots-slot-pill__paidTag"
                                        }
                                        title={
                                          block.sharePaymentPtAcknowledgedAt
                                            ? "PT đã xác nhận — hết tranh chấp thanh toán"
                                            : "Chủ phòng đã xác nhận chuyển khoản"
                                        }
                                      >
                                        Đã thanh toán
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="ots-availability-muted">
                                Chưa có lịch chiếm chỗ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
                {trainerAvailabilityTotalPages > 1 ? (
                  <div className="ots-bookings-pagination">
                    <button
                      type="button"
                      className="ots-btn ots-btn--sm"
                      disabled={trainerAvailabilityPage <= 1}
                      onClick={() =>
                        setTrainerAvailabilityPage((prev) =>
                          Math.max(1, prev - 1),
                        )
                      }
                    >
                      Trước
                    </button>
                    <span>
                      Trang {trainerAvailabilityPage}/
                      {trainerAvailabilityTotalPages}
                    </span>
                    <button
                      type="button"
                      className="ots-btn ots-btn--sm"
                      disabled={
                        trainerAvailabilityPage >= trainerAvailabilityTotalPages
                      }
                      onClick={() =>
                        setTrainerAvailabilityPage((prev) =>
                          Math.min(trainerAvailabilityTotalPages, prev + 1),
                        )
                      }
                    >
                      Sau
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="ots-availability-panel ots-availability-panel--member">
            <div className="ots-availability-panel__header">
              <div>
                <h3 className="ots-availability-panel__title">
                  Lịch tập hội viên
                </h3>
                <p className="ots-availability-panel__subtitle">
                  Danh sách lịch tập của hội viên theo chi nhánh và ngày đã chọn.
                  Bấm vào một buổi để xem đầy đủ thông tin.
                </p>
              </div>
            </div>

            {loadingMemberDailyBookings ? (
              <div className="ots-loading">Đang tải lịch tập hội viên...</div>
            ) : memberDailyBookings.length === 0 ? (
              <div className="ots-empty ots-empty--compact">
                <p>Không có lịch tập hội viên trong ngày đã chọn.</p>
              </div>
            ) : (
              <div className="ots-member-schedule-list">
                {paginatedMemberDailyBookings.map((booking) => {
                  const slotPres = getMemberSlotStatusPresentation(booking);
                  const shareSlot =
                    String(booking?.sessionType || "").toLowerCase() ===
                    "trainer_share";
                  return (
                    <div
                      key={booking.id}
                      role="button"
                      tabIndex={0}
                      className={`ots-member-schedule-item ots-member-schedule-item--clickable ${slotPres.cardBusyBorder ? "is-busy-requested" : ""}`}
                      onClick={() => openMemberBookingDetail(booking.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openMemberBookingDetail(booking.id);
                        }
                      }}
                    >
                      <div className="ots-member-schedule-item__left">
                        <div className="ots-member-schedule-item__time">
                          {normalizeTimeValue(booking.startTime)} -{" "}
                          {normalizeTimeValue(booking.endTime)}
                          {shareSlot ? (
                            <span className="ots-member-schedule-item__slotTag">
                              Mượn PT
                            </span>
                          ) : null}
                        </div>
                        <div className="ots-member-schedule-item__meta">
                          Hội viên:{" "}
                          {booking.Member?.User?.username ||
                            (booking.memberId
                              ? `#${booking.memberId}`
                              : "Không rõ")}{" "}
                          • Huấn luyện viên:{" "}
                          {booking.Trainer?.User?.username ||
                            (booking.trainerId
                              ? ` #${booking.trainerId}`
                              : " Không rõ")}
                        </div>
                      </div>
                      <div
                        className={`ots-member-schedule-item__status is-${slotPres.cssTone}`}
                      >
                        <span className="ots-member-schedule-item__statusPrimary">
                          {slotPres.primaryLabel}
                        </span>
                        {slotPres.detailLine ? (
                          <span className="ots-member-schedule-item__statusSub">
                            {slotPres.detailLine}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {memberScheduleTotalPages > 1 ? (
              <div className="ots-bookings-pagination">
                <button
                  type="button"
                  className="ots-btn ots-btn--sm"
                  disabled={memberSchedulePage <= 1}
                  onClick={() =>
                    setMemberSchedulePage((prev) => Math.max(1, prev - 1))
                  }
                >
                  Trước
                </button>
                <span>
                  Trang {memberSchedulePage}/{memberScheduleTotalPages}
                </span>
                <button
                  type="button"
                  className="ots-btn ots-btn--sm"
                  disabled={memberSchedulePage >= memberScheduleTotalPages}
                  onClick={() =>
                    setMemberSchedulePage((prev) =>
                      Math.min(memberScheduleTotalPages, prev + 1),
                    )
                  }
                >
                  Sau
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {memberBookingDetailOpen && (
        <div className="ots-modal">
          <div
            className="ots-modal__backdrop"
            onClick={closeMemberBookingDetail}
          />
          <div className="ots-modal__content ots-modal__content--booking-detail" style={{ maxWidth: "860px" }}>
            <div className="ots-modal__header">
              <h2>Chi tiết buổi tập</h2>
              <button
                type="button"
                className="ots-modal__close"
                onClick={closeMemberBookingDetail}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <div className="ots-modal__body ots-booking-detail-body">
              {memberBookingDetailLoading ? (
                <p className="ots-empty-text">Đang tải chi tiết...</p>
              ) : memberBookingDetailError ? (
                <p className="ots-alert ots-alert--danger">
                  {memberBookingDetailError}
                </p>
              ) : memberBookingDetail ? (
                (() => {
                  const b = memberBookingDetail;
                  const slotPres = getMemberSlotStatusPresentation(b);
                  const mu = b.Member?.User;
                  const tu = b.Trainer?.User;
                  const fmtDt = (v) => {
                    if (!v) return "—";
                    const d = new Date(v);
                    return Number.isNaN(d.getTime())
                      ? String(v)
                      : d.toLocaleString("vi-VN");
                  };
                  const row = (label, value) => (
                    <div className="ots-booking-detail__row" key={label}>
                      <div className="ots-booking-detail__label">{label}</div>
                      <div className="ots-booking-detail__value">{value}</div>
                    </div>
                  );
                  return (
                    <div className="ots-booking-detail">
                      {row("Mã buổi", `#${b.id}`)}
                      {row(
                        "Thời gian",
                        <>
                          {formatDate(b.bookingDate)} •{" "}
                          {normalizeTimeValue(b.startTime)} –{" "}
                          {normalizeTimeValue(b.endTime)}
                        </>,
                      )}
                      {row("Chi nhánh", b.Gym?.name || "—")}
                      {row(
                        "Hội viên",
                        <>
                          {mu?.username || (b.memberId ? `#${b.memberId}` : "—")}
                          {mu?.email ? (
                            <>
                              <br />
                              <span className="ots-booking-detail__muted">
                                {mu.email}
                              </span>
                            </>
                          ) : null}
                          {mu?.phone ? (
                            <>
                              <br />
                              <span className="ots-booking-detail__muted">
                                {mu.phone}
                              </span>
                            </>
                          ) : null}
                        </>,
                      )}
                      {b.Member?.membershipNumber
                        ? row("Mã thẻ hội viên", b.Member.membershipNumber)
                        : null}
                      {row(
                        "Huấn luyện viên",
                        <>
                          {tu?.username ||
                            (b.trainerId ? `#${b.trainerId}` : "—")}
                          {b.Trainer?.specialization ? (
                            <>
                              <br />
                              <span className="ots-booking-detail__muted">
                                {specializationToVietnamese(
                                  b.Trainer.specialization,
                                )}
                              </span>
                            </>
                          ) : null}
                        </>,
                      )}
                      {row("Gói / dịch vụ", b.Package?.name || "—")}
                      {row("Loại buổi", sessionTypeLabelVi(b.sessionType))}
                      {row(
                        "Trạng thái buổi",
                        <div className="ots-booking-detail__statusBlock">
                          <span
                            className={`ots-booking-detail__statusPill is-${slotPres.cssTone}`}
                          >
                            {slotPres.primaryLabel}
                          </span>
                          {slotPres.detailLine ? (
                            <div className="ots-booking-detail__statusDetail">
                              {slotPres.detailLine}
                            </div>
                          ) : null}
                        </div>,
                      )}
                      {b.checkinTime
                        ? row("Check-in", fmtDt(b.checkinTime))
                        : null}
                      {b.checkoutTime
                        ? row("Check-out", fmtDt(b.checkoutTime))
                        : null}
                      {b.rating
                        ? row("Đánh giá", `${b.rating}/5`)
                        : null}
                      {b.reviewComment
                        ? row("Nhận xét hội viên", b.reviewComment)
                        : null}
                      {b.sessionNotes
                        ? row("Ghi chú buổi tập", b.sessionNotes)
                        : null}
                      {b.notes ? (
                        <div className="ots-booking-detail__notes-block">
                          <div className="ots-booking-detail__label">
                            Ghi chú hệ thống / nội bộ
                          </div>
                          <pre className="ots-booking-detail__notes-pre">
                            {String(b.notes)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              ) : (
                <p className="ots-empty-text">Không có dữ liệu.</p>
              )}
            </div>
            <div className="ots-modal__footer">
              <button
                type="button"
                className="ots-btn ots-btn--secondary"
                onClick={closeMemberBookingDetail}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create/Edit Share */}
      {showModal && (
        <div className="ots-modal">
          <div
            className="ots-modal__backdrop"
            onClick={closeModal}
          />
          <div className="ots-modal__content">
            <div className="ots-modal__header">
              <h2>
                {editing
                  ? "Sửa yêu cầu"
                  : "Tạo yêu cầu xin mượn huấn luyện viên"}
              </h2>
              <button
                className="ots-modal__close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ots-form">
              {editing && (
                <div
                  className="ots-field__hint"
                  style={{ marginBottom: "12px", color: "#fbbf24" }}
                >
                  Bạn chỉ có thể cập nhật hội viên tham chiếu, ghi chú và thời
                  gian đối với phiếu 1 ngày hoặc theo khoảng ngày. Không đổi
                  phòng tập nguồn, huấn luyện viên hoặc kiểu lịch ở màn hình
                  sửa.
                </div>
              )}

              <Field
                label="Gym có huấn luyện viên (muốn xin mượn từ đây)"
                required
              >
                <select
                  className="ots-select"
                  value={form.fromGymId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fromGymId: e.target.value,
                      trainerId: "",
                      borrowSpecialization: "",
                      startTime: "",
                      endTime: "",
                    })
                  }
                  required
                  disabled={loadingLookups || Boolean(editing)}
                >
                  <option value="">
                    -- Chọn phòng tập cần mượn huấn luyện viên--
                  </option>
                  {gyms
                    .filter((g) => !myGymIds.includes(g.id))
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.address || g.location || "N/A"})
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Phòng tập nhận huấn luyện viên " required>
                <select
                  className="ots-select"
                  value={form.toGymId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      toGymId: e.target.value,
                      memberId: "",
                      memberPackageActivationId: "",
                    })
                  }
                  required
                  disabled={
                    loadingLookups || Boolean(selectedGymId) || Boolean(editing)
                  }
                >
                  <option value="">-- Chọn phòng tập --</option>
                  {gyms
                    .filter((g) => myGymIds.includes(g.id))
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.address || g.location || "N/A"})
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Chọn Hội Viên">
                <select
                  className="ots-select"
                  value={form.memberId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      memberId: e.target.value,
                      memberPackageActivationId: "",
                    })
                  }
                  disabled={loadingLookups || !form.toGymId}
                >
                  <option value="">
                    {!form.toGymId
                      ? "-- Chọn Gym nhận huấn luyện viên trước --"
                      : "-- Chọn hội viên cần mượn huấn luyện viên --"}
                  </option>
                  {form.toGymId &&
                    members
                      .filter(
                        (m) =>
                          m.gymId &&
                          m.gymId.toString() === form.toGymId.toString() &&
                          String(m.status || "").toLowerCase() === "active",
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.User?.username || "N/A"} -{" "}
                          {m.membershipNumber || "N/A"}
                        </option>
                      ))}
                </select>
              </Field>

              {form.memberId && (
                <Field label="Chọn gói của hội viên">
                  <select
                    className="ots-select"
                    value={form.memberPackageActivationId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        memberPackageActivationId: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Chọn gói --</option>
                    {memberPackageOptions.map((pkg) => (
                      <option
                        key={pkg.key}
                        value={pkg.packageActivationId || pkg.packageId}
                      >
                        {pkg.packageName}{" "}
                        {pkg.packageActivationId
                          ? `(Activation #${pkg.packageActivationId})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {form.memberId && (
                <Field label="Slot huấn luyện viên đã báo bận (chọn nhanh)">
                  {loadingMemberBusySlots ? (
                    <div className="op-trainer-hint">
                      Đang tải slot huấn luyện viên báo bận...
                    </div>
                  ) : filteredMemberBusySlots.length === 0 ? (
                    <div className="op-trainer-hint">
                      Chưa có slot huấn luyện viên báo bận cho hội viên này
                      {form.memberPackageActivationId
                        ? " (theo gói đã chọn)"
                        : ""}
                      .
                    </div>
                  ) : (
                    <div className="op-trainer-list">
                      {filteredMemberBusySlots.map((slot) => {
                          const slotBorrow = borrowSpecializationFromBusySlot(slot);
                          return (
                          <button
                            key={`busy-${slot.id}-${slot.date}-${slot.startTime}`}
                            type="button"
                            className="op-trainer-item is-selected"
                            onClick={() =>
                              setForm((prev) => {
                                const mappedSpec = borrowSpecializationFromBusySlot(slot);
                                return {
                                  ...prev,
                                  startDate: slot.date,
                                  endDate: slot.date,
                                  startTime: slot.startTime,
                                  endTime: slot.endTime,
                                  trainerId: "",
                                  borrowSpecialization:
                                    mappedSpec || prev.borrowSpecialization,
                                };
                              })
                            }
                          >
                            <span className="op-trainer-text">
                              <strong>{formatDate(slot.date)}</strong> •{" "}
                              {slot.startTime} - {slot.endTime}
                              {slot.packageName ? ` • ${slot.packageName}` : ""}
                              {slotBorrow
                                ? ` • CM: ${specializationToVietnamese(slotBorrow) || slotBorrow}`
                                : ""}
                            </span>
                          </button>
                          );
                        })}
                    </div>
                  )}
                </Field>
              )}

              {/* Chế độ lịch được cố định theo nghiệp vụ hiện tại */}

              {/* Single date mode */}
              {form.scheduleMode === "single" && (
                <>
                  <Field
                    label="Ngày mượn huấn luyện viên"
                    required
                    hint={
                      busyScheduleLocked && !editing
                        ? "Ngày này lấy theo đơn báo bận (một slot duy nhất). Đổi hội viên / gói hoặc chọn slot khác ở trên nếu cần."
                        : undefined
                    }
                  >
                    <input
                      type="date"
                      className="ots-input"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          startDate: e.target.value,
                          endDate: e.target.value,
                          startTime: "",
                          endTime: "",
                          trainerId: "",
                        })
                      }
                      min={new Date().toISOString().split("T")[0]}
                      required
                      readOnly={busyScheduleLocked && !editing}
                      style={
                        busyScheduleLocked && !editing
                          ? { opacity: 0.85, cursor: "not-allowed" }
                          : undefined
                      }
                    />
                  </Field>
                  <div className="ots-row">
                    <Field
                      label="Khung giờ huấn luyện viên"
                      required={Boolean(selectedTrainer)}
                      hint={
                        busyScheduleLocked && !editing
                          ? "Khung giờ theo đơn báo bận (không đổi ở đây)."
                          : !selectedTrainer
                            ? String(effectiveBorrowSpecialization || "").trim()
                              ? "Khung giờ gộp từ các PT cùng chuyên môn (theo slot báo bận hoặc PT đã chọn) tại phòng nguồn — mỗi khung 1 tiếng."
                              : "Không chọn PT: hiển thị khung giờ tổng hợp mọi PT phòng nguồn. Chọn slot báo bận hoặc chọn PT để lọc theo chuyên môn."
                            : singleDateAllSlots.length === 0
                              ? "Huấn luyện viên không có ca làm việc trong ngày này"
                              : singleDateSlotOptions.length === 0
                                ? "Tất cả slot trong ngày này đã bận"
                                : undefined
                      }
                    >
                      <select
                        className="ots-select"
                        value={
                          form.startTime && form.endTime
                            ? `${normalizeTimeValue(form.startTime)}-${normalizeTimeValue(form.endTime)}`
                            : ""
                        }
                        onChange={(e) => {
                          const [startTime, endTime] = String(
                            e.target.value || "",
                          ).split("-");
                          setForm({
                            ...form,
                            startTime: startTime || "",
                            endTime: endTime || "",
                          });
                        }}
                        disabled={
                          (busyScheduleLocked && !editing) ||
                          !form.startDate ||
                          (selectedTrainer
                            ? singleDateAllSlots.length === 0
                            : singleDateGymSlotDisplayOptions.length === 0)
                        }
                        required
                      >
                        <option value="">-- Chọn slot --</option>
                        {(selectedTrainer
                          ? singleDateAllSlots
                          : singleDateGymSlotDisplayOptions
                        ).map((slot) => {
                          const isBusy = selectedTrainer
                            ? isSingleSlotBusy(slot)
                            : false;
                          return (
                            <option
                              key={slot.value}
                              value={slot.value}
                              disabled={isBusy}
                            >
                              {slot.start} - {slot.end}
                              {slot.isCustom ? " (theo slot hội viên)" : ""}
                              {isBusy ? " (đã bận)" : ""}
                            </option>
                          );
                        })}
                      </select>
                      {!selectedTrainer && (
                        <small className="op-spec-empty-help">
                          {String(effectiveBorrowSpecialization || "").trim()
                            ? "Chỉ các khung mà ít nhất một PT cùng chuyên môn (đã xác định) đăng ký rảnh."
                            : "Gộp khung giờ mọi PT phòng nguồn; chọn slot báo bận hoặc PT để thu hẹp theo chuyên môn."}
                        </small>
                      )}
                    </Field>
                  </div>
                </>
              )}

              <Field
                label="Giá buổi mượn (VNĐ)"
                required
                hint="Giá một buổi PT dạy tại chi nhánh bạn. Bên cho mượn sẽ gửi tên ngân hàng và STK để bạn chuyển sau khi buổi hoàn thành."
              >
                <input
                  type="number"
                  step={1000}
                  className="ots-input"
                  value={form.sessionPrice}
                  onChange={(e) =>
                    setForm({ ...form, sessionPrice: e.target.value })
                  }
                  placeholder="Ví dụ: 500000"
                />
              </Field>

              <Field
                label="Huấn luyện viên cần mượn"
                hint="Chỉ liệt kê PT cùng chuyên môn (theo gói / slot báo bận) và còn rảnh đúng ngày — giờ đã chọn (mặc định theo báo bận nếu chỉ một slot). Để trống để gửi yêu cầu mở cho tất cả PT trong danh sách."
              >
                <select
                  className="ots-select"
                  value={form.trainerId}
                  onChange={(e) => {
                    const trainerId = e.target.value;
                    const t = availableTrainers.find(
                      (x) => String(x.id) === String(trainerId),
                    );
                    let nextBorrow = form.borrowSpecialization;
                    if (trainerId && t?.specialization) {
                      const derived = borrowCanonicalFromTrainerSpecialization(
                        t.specialization,
                      );
                      if (derived) nextBorrow = derived;
                    }
                    setForm({
                      ...form,
                      trainerId,
                      startTime: "",
                      endTime: "",
                      borrowSpecialization: nextBorrow,
                      endDate: "",
                    });
                  }}
                  disabled={
                    Boolean(editing) ||
                    !form.fromGymId ||
                    loadingLookups ||
                    !form.startDate ||
                    !form.startTime ||
                    !form.endTime ||
                    !String(effectiveBorrowSpecialization || "").trim() ||
                    loadingEligibleTrainers
                  }
                >
                  <option value="">
                    {!form.fromGymId
                      ? "-- Chọn phòng tập nguồn trước --"
                      : loadingEligibleTrainers
                        ? "-- Đang kiểm tra PT rảnh... --"
                        : !form.startDate ||
                            !form.startTime ||
                            !form.endTime
                          ? "-- Chọn slot báo bận hoặc đợi hệ thống điền ngày — giờ --"
                          : !String(effectiveBorrowSpecialization || "").trim()
                            ? "-- Chọn gói hoặc slot báo bận (chuyên môn) --"
                            : trainerBorrowSelectOptions.length === 0
                              ? "-- Không có PT rảnh cùng chuyên môn --"
                              : "-- Không chỉ định (gửi cho mọi PT trong danh sách) --"}
                  </option>
                  {trainerBorrowSelectOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.User?.username || "N/A"}{" "}
                      {t.specialization
                        ? `(${specializationToVietnamese(t.specialization) || t.specialization})`
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Đã bỏ các chế độ date_range và multiple_dates */}

              {/* Hiển thị lịch trainer */}
              {form.trainerId && form.startDate && (
                <div className="ots-field">
                  <label className="ots-field__label">
                    Lịch đã đặt của huấn luyện viên{" "}
                    {loadingShareSchedule && "(đang tải...)"}
                  </label>
                  <div className="ots-schedule-info">
                    {shareTrainerSchedule.length === 0 &&
                      !loadingShareSchedule && (
                        <p className="ots-empty-text">
                          Huấn luyện viên trống lịch trong khoảng thời gian này
                        </p>
                      )}
                    <div className="ots-schedule-days">
                      {shareTrainerSchedule.map((daySchedule, dayIdx) => {
                        const filteredBookings =
                          filterBookingsForBusySlotCheck(
                            daySchedule.date,
                            daySchedule.bookings,
                          );
                        const hasBookings = filteredBookings.length > 0;

                        return (
                          <div key={dayIdx} className="ots-schedule-day">
                            <div className="ots-schedule-day-header">
                              <span className="ots-schedule-date">
                                {formatDate(daySchedule.date)}
                              </span>
                              {!hasBookings && (
                                <span className="ots-schedule-empty-badge">
                                  Trống lịch
                                </span>
                              )}
                            </div>

                            {hasBookings && (
                              <div className="ots-schedule-list">
                                {filteredBookings.map((s, idx) => {
                                  const st = normalizeTimeValue(form.startTime);
                                  const et = normalizeTimeValue(form.endTime);
                                  const bs = normalizeTimeValue(s.startTime);
                                  const be = normalizeTimeValue(s.endTime);
                                  const isConflict =
                                    daySchedule.date === form.startDate &&
                                    Boolean(
                                      st &&
                                        et &&
                                        bs &&
                                        be &&
                                        st < be &&
                                        et > bs,
                                    );

                                  return (
                                    <div
                                      key={idx}
                                      className={`ots-schedule-item ${isConflict ? "ots-schedule-item--conflict" : ""}`}
                                    >
                                      <span className="ots-schedule-time">
                                        {s.startTime} - {s.endTime}
                                      </span>
                                      <span className="ots-schedule-type">
                                        {s.type === "booking"
                                          ? "Lịch tập"
                                          : "Có lịch"}
                                      </span>
                                      {s.Member && (
                                        <span className="ots-schedule-member">
                                          với {s.Member.User?.username}
                                        </span>
                                      )}
                                      {isConflict && (
                                        <span className="ots-conflict-badge">
                                          {" "}
                                          Xung đột!
                                        </span>
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

              {leadTimeError && (
                <div
                  className="ots-alert ots-alert--danger"
                  style={{ marginTop: "0.5rem" }}
                >
                  {leadTimeError}
                </div>
              )}

              <div className="ots-form__actions">
                <button
                  type="button"
                  className="ots-btn ots-btn--secondary"
                  onClick={closeModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="ots-btn ots-btn--primary"
                  disabled={Boolean(leadTimeError)}
                >
                  {editing ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xem lịch huấn luyện viên */}
      {showScheduleModal && selectedShareForSchedule && (
        <div className="ots-modal">
          <div
            className="ots-modal__backdrop"
            onClick={() => setShowScheduleModal(false)}
          />
          <div className="ots-modal__content" style={{ maxWidth: "860px" }}>
            <div className="ots-modal__header">
              <h2>
                Lịch làm việc của huấn luyện viên{" "}
                {selectedShareForSchedule.Trainer?.User?.username}
              </h2>
              <button
                className="ots-modal__close"
                onClick={() => setShowScheduleModal(false)}
              >
                ×
              </button>
            </div>

            <div className="ots-form">
              {/* Thông tin yêu cầu */}
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1.25rem",
                  background:
                    "linear-gradient(145deg, rgba(17, 25, 40, 0.96) 0%, rgba(14, 21, 34, 0.96) 100%)",
                  borderRadius: "14px",
                  color: "#f8fafc",
                  border: "1px solid rgba(255, 177, 0, 0.22)",
                  boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.05rem",
                      fontWeight: "700",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Thông tin yêu cầu
                  </h3>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "0.75rem",
                    fontSize: "0.95rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ opacity: 0.9, minWidth: "90px" }}>
                      {" "}
                      Ngày mượn:
                    </span>
                    <strong style={{ fontSize: "1rem" }}>
                      {selectedShareForSchedule.startDate
                        ? formatDate(selectedShareForSchedule.startDate)
                        : "N/A"}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ opacity: 0.9, minWidth: "90px" }}>
                      {" "}
                      Giờ:
                    </span>
                    <strong style={{ fontSize: "1rem" }}>
                      {(() => {
                        // Kiểm tra scheduleMode
                        if (
                          selectedShareForSchedule.scheduleMode ===
                            "specific_days" &&
                          selectedShareForSchedule.specificSchedules?.length > 0
                        ) {
                          // Hiển thị thời gian từ specific schedules
                          const uniqueTimes = [
                            ...new Set(
                              selectedShareForSchedule.specificSchedules.map(
                                (s) =>
                                  `${s.startTime?.substring(0, 5)} - ${s.endTime?.substring(0, 5)}`,
                              ),
                            ),
                          ];
                          return uniqueTimes.length === 1
                            ? uniqueTimes[0]
                            : "Theo lịch cụ thể";
                        } else if (
                          selectedShareForSchedule.scheduleMode ===
                            "weekdays" &&
                          selectedShareForSchedule.weekdaySchedules
                        ) {
                          // Weekday schedule
                          return "Theo thứ trong tuần";
                        } else if (
                          selectedShareForSchedule.startTime &&
                          selectedShareForSchedule.endTime &&
                          selectedShareForSchedule.startTime !== "00:00:00" &&
                          selectedShareForSchedule.endTime !== "00:00:00"
                        ) {
                          // Thời gian cố định
                          return `${selectedShareForSchedule.startTime.substring(0, 5)} - ${selectedShareForSchedule.endTime.substring(0, 5)}`;
                        } else {
                          return "Cả ngày";
                        }
                      })()}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ opacity: 0.9, minWidth: "90px" }}>
                      Từ Gym:
                    </span>
                    <strong style={{ fontSize: "1rem" }}>
                      {selectedShareForSchedule.fromGym?.name ||
                        selectedShareForSchedule.FromGym?.name ||
                        "N/A"}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ opacity: 0.9, minWidth: "90px" }}>
                      Đến Gym:
                    </span>
                    <strong style={{ fontSize: "1rem" }}>
                      {selectedShareForSchedule.toGym?.name ||
                        selectedShareForSchedule.ToGym?.name ||
                        "N/A"}
                    </strong>
                  </div>

                  {selectedShareForSchedule.scheduleMode === "specific_days" &&
                    selectedShareForSchedule.specificSchedules?.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                          marginTop: "0.5rem",
                          paddingTop: "0.75rem",
                          borderTop: "1px solid rgba(255,255,255,0.2)",
                        }}
                      >
                        <span style={{ opacity: 0.9, fontWeight: "600" }}>
                          Lịch cụ thể:
                        </span>
                        <div
                          style={{
                            padding: "0.75rem",
                            background: "rgba(255,255,255,0.15)",
                            borderRadius: "8px",
                            fontSize: "0.9rem",
                            backdropFilter: "blur(10px)",
                            display: "grid",
                            gap: "0.5rem",
                          }}
                        >
                          {selectedShareForSchedule.specificSchedules.map(
                            (schedule, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: "0.5rem",
                                  background: "rgba(255,255,255,0.1)",
                                  borderRadius: "6px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.75rem",
                                }}
                              >
                                <span style={{ fontWeight: "600" }}>
                                  {schedule.date
                                    ? formatDate(schedule.date)
                                    : `Ngày ${idx + 1}`}
                                </span>
                                <span>
                                  {schedule.startTime?.substring(0, 5)} -{" "}
                                  {schedule.endTime?.substring(0, 5)}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {selectedShareForSchedule.notes && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        marginTop: "0.5rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      <span style={{ opacity: 0.9, fontWeight: "600" }}>
                        {" "}
                        Lý do/Ghi chú:
                      </span>
                      <div
                        style={{
                          padding: "0.75rem",
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: "8px",
                          fontSize: "0.9rem",
                          lineHeight: "1.5",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        {selectedShareForSchedule.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lịch làm việc */}
              {loadingShareSchedule ? (
                <div
                  className="ots-loading"
                  style={{ padding: "2rem", textAlign: "center" }}
                >
                  <div
                    style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
                  ></div>
                  <div>Đang tải lịch...</div>
                </div>
              ) : shareTrainerSchedule.length === 0 ? (
                <div
                  className="ots-empty"
                  style={{ padding: "2rem", textAlign: "center" }}
                >
                  <div
                    style={{ fontSize: "3rem", marginBottom: "0.5rem" }}
                  ></div>
                  <p style={{ margin: 0, color: "#64748b" }}>
                    Không có lịch trong khoảng thời gian này
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: "450px",
                    overflowY: "auto",
                    paddingRight: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ fontSize: "1.25rem" }}></span>
                    <h4
                      style={{ margin: 0, color: "#d1d5db", fontSize: "1rem" }}
                    >
                      Lịch làm việc ({shareTrainerSchedule.length} ngày)
                    </h4>
                  </div>

                  {shareTrainerSchedule.map((schedule, idx) => {
                    const filteredScheduleBookings =
                      filterBookingsForBusySlotCheck(
                        schedule.date,
                        schedule.bookings,
                      );
                    return (
                      <div
                        key={idx}
                        style={{
                          marginBottom: "1rem",
                          padding: "1rem",
                          background:
                            filteredScheduleBookings.length === 0
                              ? "rgba(16, 74, 56, 0.22)"
                              : "rgba(92, 34, 34, 0.24)",
                          border: `1px solid ${filteredScheduleBookings.length === 0 ? "rgba(34, 197, 94, 0.35)" : "rgba(248, 113, 113, 0.4)"}`,
                          borderRadius: "12px",
                          boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom:
                              filteredScheduleBookings.length > 0
                                ? "0.75rem"
                                : 0,
                          }}
                        >
                          <h4
                            style={{
                              margin: 0,
                              color: "#f1f5f9",
                              fontSize: "0.95rem",
                              fontWeight: "700",
                            }}
                          >
                            {new Date(schedule.date).toLocaleDateString(
                              "vi-VN",
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              },
                            )}
                          </h4>
                          {filteredScheduleBookings.length === 0 ? (
                            <span
                              style={{
                                color: "#86efac",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                padding: "0.25rem 0.75rem",
                                background: "rgba(34, 197, 94, 0.18)",
                                borderRadius: "20px",
                              }}
                            >
                              Trống
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "#fecaca",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                padding: "0.25rem 0.75rem",
                                background: "rgba(248, 113, 113, 0.2)",
                                borderRadius: "20px",
                              }}
                            >
                              {filteredScheduleBookings.length} lịch
                            </span>
                          )}
                        </div>

                        {filteredScheduleBookings.length > 0 && (
                          <div style={{ marginTop: "0.75rem" }}>
                            {filteredScheduleBookings.map((booking, bidx) => (
                              <div
                                key={bidx}
                                style={{
                                  padding: "0.75rem",
                                  background: "rgba(15, 23, 42, 0.72)",
                                  borderRadius: "8px",
                                  marginBottom:
                                    bidx < schedule.bookings.length - 1
                                      ? "0.5rem"
                                      : 0,
                                  border: "1px solid rgba(248, 113, 113, 0.32)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: "700",
                                      color: "#fca5a5",
                                      fontSize: "0.95rem",
                                      minWidth: "110px",
                                    }}
                                  >
                                    {booking.startTime} - {booking.endTime}
                                  </span>
                                  {booking.Member?.User?.username && (
                                    <span style={{ color: "#cbd5e1" }}>
                                      {booking.Member.User.username}
                                    </span>
                                  )}
                                  {booking.status && (
                                    <span
                                      style={{
                                        padding: "0.15rem 0.5rem",
                                        background: "rgba(100, 116, 139, 0.22)",
                                        borderRadius: "12px",
                                        fontSize: "0.85rem",
                                        color: "#d1d5db",
                                      }}
                                    >
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
                {selectedShareForSchedule.status === "waiting_acceptance" && (
                  <>
                    <button
                      type="button"
                      className="ots-btn ots-btn--success"
                      onClick={() => {
                        handleAcceptShare(
                          selectedShareForSchedule.id,
                          selectedShareForSchedule,
                        );
                      }}
                    >
                      Đồng ý cho mượn huấn luyện viên
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
                {selectedShareForSchedule.status === "pending_trainer" && (
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal — dùng ots-modal + .ots-share-detail-modal để có layout/form rõ trên nền tối */}
      {showDetailModal && selectedShare && (
        <div className="ots-modal">
          <div
            className="ots-modal__backdrop"
            onClick={() => setShowDetailModal(false)}
          />
          <div
            className="ots-modal__content ots-share-detail-modal"
            style={{ maxWidth: "380px", width: "100%", maxHeight: "60vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ots-modal__header">
              <h2>
                Chi tiết yêu cầu chia sẻ huấn luyện viên #{selectedShare.id}
              </h2>
              <button
                type="button"
                className="ots-modal__close"
                onClick={() => setShowDetailModal(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="ots-modal__body">
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Từ Gym:</span>
                  <span className="detail-value">
                    {selectedShare.fromGym?.name || "—"}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Đến Gym:</span>
                  <span className="detail-value">
                    {selectedShare.toGym?.name || "—"}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Huấn luyện viên:</span>
                  <span className="detail-value">
                    {selectedShare.Trainer?.User?.username || "—"}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Ngày mượn:</span>
                  <span className="detail-value">
                    {formatDate(selectedShare.startDate)}
                  </span>
                </div>

                {selectedShare.startTime &&
                  selectedShare.startTime !== "00:00:00" && (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">Giờ bắt đầu:</span>
                        <span className="detail-value">
                          {selectedShare.startTime.substring(0, 5)}
                        </span>
                      </div>

                      <div className="detail-row">
                        <span className="detail-label">Giờ kết thúc:</span>
                        <span className="detail-value">
                          {selectedShare.endTime?.substring(0, 5) || "—"}
                        </span>
                      </div>
                    </>
                  )}

                <div className="detail-row">
                  <span className="detail-label">Trạng thái:</span>
                  <span className="detail-value">
                    <StatusBadge status={selectedShare.status} />
                  </span>
                </div>

                {selectedShare.status === "approved" && (
                  <div className="detail-row detail-row--full ots-share-paymentCard">
                    <div className="ots-share-paymentCard__title">
                      Thanh toán mượn PT ngoài chi nhánh (bạn trả tiền cho bên cho
                      mượn)
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Trạng thái TT:</span>
                      <span className="detail-value">
                        {renderSharePaymentStatusCell(selectedShare)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Giá buổi:</span>
                      <span className="detail-value">
                        {formatVnd(selectedShare.sessionPrice)}
                      </span>
                    </div>
                    {(() => {
                      const ps = selectedShare.sharePaymentStatus || "none";
                      if (ps === "awaiting_transfer" || ps === "paid" || ps === "disputed")
                        return null;
                      return (
                        <div
                          className="detail-row detail-row--full"
                          style={{
                            flexDirection: "column",
                            alignItems: "stretch",
                            gap: "0.5rem",
                          }}
                        >
                          <span className="detail-label">
                            Nhập / sửa giá buổi (VNĐ) — cần có trước khi đối tác
                            gửi STK:
                          </span>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="number"
                              min={1}
                              className="ots-input"
                              style={{ maxWidth: "220px" }}
                              value={detailSessionPriceInput}
                              onChange={(e) =>
                                setDetailSessionPriceInput(e.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={savingDetailPrice}
                              onClick={handleDetailSaveSessionPrice}
                            >
                              {savingDetailPrice ? "Đang lưu…" : "Lưu giá"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {(selectedShare.sharePaymentStatus === "awaiting_transfer" ||
                      selectedShare.sharePaymentStatus === "disputed") && (
                      <>
                        {selectedShare.sharePaymentStatus === "disputed" &&
                          selectedShare.sharePaymentDisputeNote && (
                            <div
                              className="detail-row detail-row--full"
                              style={{
                                padding: "0.65rem 0.75rem",
                                borderRadius: "8px",
                                background: "rgba(245, 158, 11, 0.12)",
                                border: "1px solid rgba(245, 158, 11, 0.35)",
                                marginBottom: "0.5rem",
                              }}
                            >
                              <span className="detail-label" style={{ display: "block", marginBottom: "0.35rem" }}>
                                Khiếu nại từ PT:
                              </span>
                              <span className="detail-value" style={{ whiteSpace: "pre-wrap" }}>
                                {selectedShare.sharePaymentDisputeNote}
                              </span>
                              {selectedShare.sharePaymentDisputedAt && (
                                <div style={{ marginTop: "0.35rem", fontSize: "0.85rem", opacity: 0.85 }}>
                                  {new Date(selectedShare.sharePaymentDisputedAt).toLocaleString("vi-VN")}
                                </div>
                              )}
                            </div>
                          )}
                        <div className="detail-row detail-row--full">
                          <span className="detail-label">
                            Tài khoản nhận (PT đã gửi):
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Ngân hàng:</span>
                          <span className="detail-value">
                            {selectedShare.lenderBankName || "—"}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Số TK:</span>
                          <span className="detail-value">
                            {selectedShare.lenderBankAccountNumber || "—"}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Chủ TK:</span>
                          <span className="detail-value">
                            {selectedShare.lenderAccountHolderName || "—"}
                          </span>
                        </div>
                        <div className="detail-row detail-row--full">
                          <span className="detail-label" style={{ display: "block", marginBottom: "0.35rem" }}>
                            Ảnh chứng từ chuyển khoản (tuỳ chọn, tối đa 8)
                          </span>
                          {confirmPaymentFiles.length > 0 && (
                            <ul
                              style={{
                                margin: "0 0 0.5rem",
                                paddingLeft: "1.1rem",
                                fontSize: "0.82rem",
                              }}
                            >
                              {confirmPaymentFiles.map((f, i) => (
                                <li key={`${f.name}-${i}`}>
                                  {f.name}{" "}
                                  <button
                                    type="button"
                                    className="btn-cancel"
                                    style={{
                                      marginLeft: 6,
                                      padding: "2px 8px",
                                      fontSize: "0.75rem",
                                    }}
                                    onClick={() =>
                                      setConfirmPaymentFiles((prev) =>
                                        prev.filter((_, j) => j !== i),
                                      )
                                    }
                                  >
                                    Bỏ
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            multiple
                            disabled={paymentActionLoading}
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setConfirmPaymentFiles((prev) => {
                                const room = Math.max(0, 8 - prev.length);
                                return [...prev, ...files.slice(0, room)];
                              });
                              e.target.value = "";
                            }}
                            style={{ marginBottom: "0.65rem", fontSize: "0.82rem" }}
                          />
                          <div className="detail-row detail-row--full" style={{ marginBottom: "0.65rem" }}>
                            <span className="detail-label" style={{ display: "block", marginBottom: "0.35rem" }}>
                              Ghi chú (tuỳ chọn)
                            </span>
                            <input
                              type="text"
                              className="ots-input"
                              value={confirmPaymentNote}
                              onChange={(e) => setConfirmPaymentNote(e.target.value)}
                              placeholder="VD: Thanh toán buổi 1/3 tháng 4/2026"
                              disabled={paymentActionLoading}
                              style={{ width: "100%", maxWidth: "320px" }}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={paymentActionLoading}
                            onClick={handleDetailConfirmPayment}
                          >
                            {paymentActionLoading
                              ? "Đang xác nhận…"
                              : "Xác nhận đã chuyển khoản"}
                          </button>
                        </div>
                      </>
                    )}

                    {selectedShare.sharePaymentStatus === "paid" &&
                      selectedShare.paymentMarkedPaidAt && (
                        <div className="detail-row">
                          <span className="detail-label">Đã xác nhận thanh toán:</span>
                          <span className="detail-value">
                            {new Date(
                              selectedShare.paymentMarkedPaidAt,
                            ).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      )}

                    {selectedShare.sharePaymentStatus === "paid" &&
                      parseTrainerShareProofUrls(selectedShare.paymentProofImageUrls).length >
                        0 && (
                        <div className="detail-row detail-row--full">
                          <span className="detail-label" style={{ display: "block", marginBottom: "0.35rem" }}>
                            Ảnh chứng từ thanh toán
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {parseTrainerShareProofUrls(selectedShare.paymentProofImageUrls).map(
                              (url, idx) => (
                                <a
                                  key={`${url}-${idx}`}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={normalizeSingleImageSrc(url)}
                                    alt=""
                                    style={{
                                      width: 72,
                                      height: 72,
                                      objectFit: "cover",
                                      borderRadius: 8,
                                      border: "1px solid rgba(0,0,0,0.12)",
                                    }}
                                  />
                                </a>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {selectedShare.sharePaymentStatus === "paid" &&
                      selectedShare.sharePaymentDisputeNote && (
                        <div
                          className={`detail-row detail-row--full ots-share-disputeNoteFromPt${
                            selectedShare.sharePaymentPtAcknowledgedAt
                              ? " ots-share-disputeNoteFromPt--resolved"
                              : ""
                          }`}
                        >
                          <span className="detail-label" style={{ display: "block", marginBottom: "0.35rem" }}>
                            Huấn luyện viên báo chưa nhận tiền (sau khi đã xác nhận thanh toán):
                          </span>
                          <span className="detail-value" style={{ whiteSpace: "pre-wrap" }}>
                            {selectedShare.sharePaymentDisputeNote}
                          </span>
                          {selectedShare.sharePaymentDisputedAt && (
                            <div style={{ marginTop: "0.35rem", fontSize: "0.85rem", opacity: 0.9 }}>
                              {new Date(selectedShare.sharePaymentDisputedAt).toLocaleString("vi-VN")}
                            </div>
                          )}
                        </div>
                      )}

                    {selectedShare.sharePaymentPtAcknowledgedAt && (
                      <div className="detail-row detail-row--full ots-share-ptAckResolved">
                        <span className="ots-share-ptAckResolved__icon" aria-hidden>
                          ✓
                        </span>
                        <div>
                          <div className="ots-share-ptAckResolved__title">
                            PT đã xác nhận — kết thúc phản hồi thanh toán
                          </div>
                          <div className="ots-share-ptAckResolved__time">
                            {new Date(selectedShare.sharePaymentPtAcknowledgedAt).toLocaleString("vi-VN")}
                          </div>
                          <p className="ots-share-ptAckResolved__hint">
                            Không cần gửi thêm phản hồi; trạng thái thanh toán đã được PT xác nhận.
                          </p>
                        </div>
                      </div>
                    )}

                    {(selectedShare.sharePaymentDisputeNote ||
                      selectedShare.sharePaymentStatus === "disputed") &&
                      !selectedShare.sharePaymentPtAcknowledgedAt && (
                      <div className="detail-row detail-row--full ots-share-borrowerReply">
                        <p className="ots-share-detail-hint">
                          {selectedShare.sharePaymentStatus === "paid"
                            ? "Đây là form phản hồi khiếu nại — cuộn trong khung nếu không thấy ô nhập hoặc nút Gửi."
                            : "Điền nội dung và ảnh chứng từ rồi bấm Gửi phản hồi cho PT."}
                        </p>
                        <div className="ots-share-borrowerReply__title">
                          Phản hồi cho huấn luyện viên — nội dung & ảnh chứng từ thanh toán
                        </div>
                        {selectedShare.borrowerDisputeResponseAt && (
                          <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", opacity: 0.85 }}>
                            Cập nhật gần nhất:{" "}
                            {new Date(selectedShare.borrowerDisputeResponseAt).toLocaleString("vi-VN")}
                          </p>
                        )}
                        <span className="detail-label" style={{ display: "block", marginBottom: "0.25rem" }}>
                          Nội dung phản hồi
                        </span>
                        <textarea
                          className="ots-input"
                          rows={3}
                          value={borrowerResponseText}
                          onChange={(e) => setBorrowerResponseText(e.target.value)}
                          style={{ width: "100%", minHeight: "72px", marginBottom: "0.65rem" }}
                          placeholder="Đối chiếu lệnh chi, thời điểm chuyển…"
                        />
                        <span className="detail-label" style={{ display: "block", marginBottom: "0.35rem" }}>
                          Ảnh chứng từ (tối đa 8)
                        </span>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "8px",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {borrowerProofUrls.map((url, idx) => (
                            <div key={`${url}-${idx}`} style={{ position: "relative" }}>
                              <img
                                src={normalizeSingleImageSrc(url)}
                                alt=""
                                style={{
                                  width: 72,
                                  height: 72,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  border: "1px solid rgba(0,0,0,0.12)",
                                }}
                              />
                              <button
                                type="button"
                                aria-label="Xóa ảnh"
                                onClick={() =>
                                  setBorrowerProofUrls((prev) => prev.filter((_, j) => j !== idx))
                                }
                                style={{
                                  position: "absolute",
                                  top: -6,
                                  right: -6,
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  border: "none",
                                  background: "#ef4444",
                                  color: "#fff",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        {pendingProofFiles.length > 0 && (
                          <ul style={{ margin: "0 0 0.5rem", paddingLeft: "1.1rem", fontSize: "0.82rem" }}>
                            {pendingProofFiles.map((f, i) => (
                              <li key={`${f.name}-${i}`}>
                                {f.name}{" "}
                                <button
                                  type="button"
                                  className="btn-cancel"
                                  style={{ marginLeft: 6, padding: "2px 8px", fontSize: "0.75rem" }}
                                  onClick={() =>
                                    setPendingProofFiles((prev) => prev.filter((_, j) => j !== i))
                                  }
                                >
                                  Bỏ
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setPendingProofFiles((prev) => {
                              const room = Math.max(
                                0,
                                8 - borrowerProofUrls.length - prev.length,
                              );
                              const add = files.slice(0, room);
                              return [...prev, ...add];
                            });
                            e.target.value = "";
                          }}
                          style={{ marginBottom: "0.65rem", fontSize: "0.82rem" }}
                        />
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={disputeResponseLoading}
                          onClick={handleBorrowerDisputeResponseSubmit}
                        >
                          {disputeResponseLoading ? "Đang gửi…" : "Gửi phản hồi cho PT"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedShare.Member && (
                  <div className="detail-row">
                    <span className="detail-label">Hội viên gắn kèm:</span>
                    <span className="detail-value">
                      {selectedShare.Member?.User?.username || "—"}
                    </span>
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
                  <span className="detail-value">
                    {formatDate(selectedShare.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="ots-modal__footer">
              {(selectedShare.status === "waiting_acceptance" ||
                selectedShare.status === "pending_trainer") && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedShare);
                    }}
                    className="btn-secondary"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
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
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="btn-cancel"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
