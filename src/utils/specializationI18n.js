const PAIRS = [
  ["functional training", "Tập chức năng"],
  ["strength training", "Tăng sức mạnh"],
  ["personal training", "HLV cá nhân"],
  ["nutrition coaching", "Huấn luyện dinh dưỡng"],
  ["muscle building", "Tăng cơ"],
  ["body building", "Thể hình"],
  ["fat burning", "Đốt mỡ"],
  ["weight loss", "Giảm mỡ"],
  ["muscle gain", "Tăng cơ"],
  ["weight gain", "Tăng cân"],
  ["fat loss", "Giảm mỡ"],
  ["rehabilitation", "Phục hồi chức năng"],
  ["calisthenics", "Tập thể dục tự thân"],
  ["powerlifting", "Cử tạ"],
  ["bodybuilding", "Thể hình"],
  ["crossfit", "CrossFit"],
  ["pilates", "Pilates"],
  ["stretching", "Kéo giãn"],
  ["mobility", "Linh hoạt khớp"],
  ["nutrition", "Dinh dưỡng"],
  ["swimming", "Bơi lội"],
  ["running", "Chạy bộ"],
  ["cycling", "Đạp xe"],
  ["boxing", "Quyền anh"],
  ["cardio", "Tập cardio"],
  ["yoga", "Yoga"],
  ["hiit", "HIIT"],
  ["weightloss", "Giảm mỡ"],
];

const SORTED = [...PAIRS].sort((a, b) => b[0].length - a[0].length);

export function specializationToVietnamese(raw) {
  if (raw == null) return "";
  let s = String(raw).trim();
  if (!s) return "";
  s = s.replace(/[;]/g, ",");
  for (const [en, vi] of SORTED) {
    const esc = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = en.includes(" ")
      ? new RegExp(esc, "gi")
      : new RegExp(`\\b${esc}\\b`, "gi");
    s = s.replace(pattern, vi);
  }
  return s.replace(/\s*,\s*/g, ", ").trim();
}
