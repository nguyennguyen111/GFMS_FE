/**
 * Ngày buổi tập theo lịch LOCAL — tránh lệch khi API trả ISO (UTC) hoặc Date parse sai.
 */
export function ymdFromBookingDate(bookingDate) {
  if (bookingDate == null || bookingDate === "") return "";
  if (typeof bookingDate === "string") {
    const t = bookingDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  }
  const d = bookingDate instanceof Date ? bookingDate : new Date(bookingDate);
  if (Number.isNaN(d.getTime())) {
    const m = String(bookingDate).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const splitClock = (timeStr) => {
  if (timeStr == null || timeStr === "") return { h: NaN, m: NaN };
  const clean = String(timeStr).trim().split(/\s+/)[0];
  const parts = clean.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return { h, m };
};

/** Chuẩn HH:mm 5 ký tự — so khớp slot lịch rảnh với startTime booking (9:00 vs 09:00). */
export function normalizeHHMM5(timeStr) {
  const { h, m } = splitClock(timeStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
