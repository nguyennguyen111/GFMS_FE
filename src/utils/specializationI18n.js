const PAIRS = [
  ["functional training", "Tập chức năng"],
  ["strength training", "Tăng sức mạnh"],
  ["personal training", "HLV cá nhân"],
  ["nutrition coaching", "Huấn luyện dinh dưỡng"],
  ["muscle building", "Tăng cơ"],
  ["body building", "Thể hình"],
  ["bodybuilding", "Thể hình"],
  ["fat burning", "Đốt mỡ"],
  ["weight loss", "Giảm mỡ"],
  ["weightloss", "Giảm mỡ"],
  ["muscle gain", "Tăng cơ"],
  ["weight gain", "Tăng cân"],
  ["fat loss", "Giảm mỡ"],
  ["rehabilitation", "Phục hồi chức năng"],
  ["calisthenics", "Tập thể dục tự thân"],
  ["powerlifting", "Cử tạ"],
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
  ["tập chức năng", "Tập chức năng"],
  ["tăng sức mạnh", "Tăng sức mạnh"],
  ["huấn luyện dinh dưỡng", "Huấn luyện dinh dưỡng"],
  ["tăng cơ", "Tăng cơ"],
  ["thể hình", "Thể hình"],
  ["đốt mỡ", "Đốt mỡ"],
  ["giảm mỡ", "Giảm mỡ"],
  ["tăng cân", "Tăng cân"],
  ["phục hồi chức năng", "Phục hồi chức năng"],
  ["tập thể dục tự thân", "Tập thể dục tự thân"],
  ["cử tạ", "Cử tạ"],
  ["kéo giãn", "Kéo giãn"],
  ["linh hoạt khớp", "Linh hoạt khớp"],
  ["dinh dưỡng", "Dinh dưỡng"],
  ["bơi lội", "Bơi lội"],
  ["chạy bộ", "Chạy bộ"],
  ["đạp xe", "Đạp xe"],
  ["quyền anh", "Quyền anh"],
  ["tập cardio", "Tập cardio"],
];

const MAP = new Map(PAIRS.map(([k, v]) => [k.toLowerCase(), v]));

export function specializationToVietnamese(raw) {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";

  const parts = s
    .replace(/[;]/g, ",")
    .split(/[\n,|]+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const dedup = new Set();
  const normalized = [];

  parts.forEach((part) => {
    const mapped = MAP.get(part.toLowerCase()) || part;
    const key = mapped.toLowerCase();
    if (!dedup.has(key)) {
      dedup.add(key);
      normalized.push(mapped);
    }
  });

  return normalized.join(", ");
}
