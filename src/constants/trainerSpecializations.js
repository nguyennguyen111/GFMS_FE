/**
 * 5 chuyên môn HLV — tương ứng 5 dòng gói (siết mỡ, tăng cơ, sức mạnh/thể hình, thể trạng, chiều cao)
 * Đây là tên CHUYÊN MÔN, không trùng tên gói bán cho hội viên.
 * Chuẩn hóa khớp GFMS_BE `src/constants/trainerSpecializations.js`.
 */
export const TRAINER_SPECIALIZATION_OPTIONS = Object.freeze([
  "Giảm mỡ & định hình toàn thân",
  "Tăng khối cơ & phát triển toàn diện",
  "Sức mạnh & phát triển thể hình",
  "Thể lực & nâng cao thể trạng",
  "Tư thế và vận động hỗ trợ chiều cao",
]);

export const TRAINER_SPECIALIZATION_MAX = TRAINER_SPECIALIZATION_OPTIONS.length;

const UNICODE_SPACE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

/** Giống BE `trainerSpecializationNormKey` — dùng trước khi gửi API */
export const trainerSpecializationNormKey = (s) => {
  return String(s ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/\uFF06/g, "&")
    .replace(UNICODE_SPACE, " ")
    .normalize("NFC")
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Map lựa chọn checkbox → chuỗi chuẩn trong TRAINER_SPECIALIZATION_OPTIONS (tránh lệch ký tự vô hình / &).
 * @param {string[]} selected
 * @returns {string[]}
 */
export const canonicalizeTrainerSpecializationSelections = (selected) => {
  const raw = Array.isArray(selected) ? selected : [];
  const keys = [...new Set(raw.map((x) => trainerSpecializationNormKey(x)).filter(Boolean))];
  const byKey = new Map(
    TRAINER_SPECIALIZATION_OPTIONS.map((opt) => [trainerSpecializationNormKey(opt), opt]),
  );
  const byCompact = new Map(
    TRAINER_SPECIALIZATION_OPTIONS.map((opt) => [
      trainerSpecializationNormKey(opt).replace(/\s+/g, ""),
      opt,
    ]),
  );
  const out = [];
  for (const key of keys) {
    let canon = byKey.get(key);
    if (!canon) canon = byCompact.get(key.replace(/\s+/g, ""));
    if (canon) out.push(canon);
  }
  return [...new Set(out)];
};

/** Chỉ số 0..4 gửi kèm API — backend ưu tiên field này, tránh lệch Unicode trên chuỗi. */
export const trainerSpecializationIdsFromSelections = (selected) => {
  const canon = canonicalizeTrainerSpecializationSelections(selected);
  const ids = [];
  for (const label of canon) {
    const i = TRAINER_SPECIALIZATION_OPTIONS.findIndex((o) => o === label);
    if (i >= 0) ids.push(i);
  }
  return ids;
};
