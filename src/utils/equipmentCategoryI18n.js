const CATEGORY_NAME_BY_CODE = {
  "CAT-CARDIO": "Thiết bị tim mạch",
  "CAT-STRENGTH": "Thiết bị sức mạnh",
  "CAT-YOGA": "Yoga & Pilates",
  "CAT-TREADMILL": "Máy chạy bộ",
  "CAT-BIKE": "Xe đạp tập",
  "CAT-ELLIPTICAL": "Máy elip",
  "CAT-DUMBBELL": "Tạ tay",
  "CAT-BENCH": "Ghế tập tạ",
  "CAT-PLATES": "Bánh tạ",
  "CAT-YOGAMAT": "Thảm yoga",
};

const CATEGORY_NAME_FALLBACK = {
  "cardio equipment": "Thiết bị tim mạch",
  "strength training": "Thiết bị sức mạnh",
  "yoga & pilates": "Yoga & Pilates",
  treadmills: "Máy chạy bộ",
  "exercise bikes": "Xe đạp tập",
  "elliptical trainers": "Máy elip",
  dumbbells: "Tạ tay",
  benches: "Ghế tập tạ",
  "weight plates": "Bánh tạ",
  "yoga mats": "Thảm yoga",
};

export const translateEquipmentCategoryName = (name, code) => {
  const byCode = CATEGORY_NAME_BY_CODE[String(code || "").trim().toUpperCase()];
  if (byCode) return byCode;

  const key = String(name || "").trim().toLowerCase();
  if (!key) return "";
  return CATEGORY_NAME_FALLBACK[key] || name;
};

