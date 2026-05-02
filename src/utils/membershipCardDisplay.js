/** Ngày lịch (local) — khớp endDate backend (addMonths). */
export const startOfLocalDay = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Chênh lệch ngày (có thể âm nếu đã quá hạn). null = ngày không hợp lệ. */
export const getMembershipDaysLeft = (endDateInput) => {
  const end = new Date(endDateInput);
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  if (Number.isNaN(end.getTime())) return null;
  const endDay = startOfLocalDay(end);
  const today = startOfLocalDay(now);
  if (!endDay || !today) return null;
  return Math.round((endDay.getTime() - today.getTime()) / msPerDay);
};

/** Tiêu đề thẻ trên profile: tháng làm tròn từ số ngày còn lại. */
export const getMembershipPlanHeadline = (daysLeft, isActive) => {
  if (!isActive || daysLeft <= 0) return "ĐÃ HẾT HẠN";
  if (daysLeft < 7) return `CÒN ${daysLeft} NGÀY`;
  const approxMonths = Math.max(1, Math.round(daysLeft / 30));
  return `CÒN ${approxMonths} THÁNG`;
};

/** Dòng trạng thái thẻ (trang mua thẻ / banner). */
export const formatMembershipCurrentCardSummary = (endDateInput) => {
  const raw = getMembershipDaysLeft(endDateInput);
  if (raw === null) return null;
  const endStr = new Date(endDateInput).toLocaleDateString("vi-VN");
  if (raw < 0) {
    return `Đã hết hạn — ${endStr}`;
  }
  const daysLeft = raw;
  if (daysLeft < 7) {
    return `Thời hạn còn lại: ${daysLeft} ngày — hết hạn ${endStr}`;
  }
  const m = Math.max(1, Math.round(daysLeft / 30));
  return `Thời hạn còn lại: ${m} tháng (${daysLeft} ngày) — hết hạn ${endStr}`;
};
