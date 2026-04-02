export const getUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
};

// ✅ key theo userId để không dính trainerId của người khác / lần test
const getTrainerKeyByUser = () => {
  const u = getUserFromStorage();
  const uid =
    u?.user?.id ||
    u?.user?.userId ||
    u?.userId ||
    null;

  // nếu không lấy được uid (chưa login) thì dùng key chung
  return uid ? `pt_trainerId_${uid}` : "pt_trainerId";
};

export const getTrainerId = () => {
  const user = getUserFromStorage();

  // ưu tiên trainerId nếu backend trả về sẵn trong user
  const fromUser =
    user?.trainerId ||
    user?.trainer?.id ||
    user?.trainer?.trainerId ||
    user?.user?.trainerId ||
    user?.user?.trainer?.id ||
    null;

  if (fromUser) return Number(fromUser);

  // ✅ lấy trainerId theo userId (không dính người khác)
  const key = getTrainerKeyByUser();
  const fromLocal = localStorage.getItem(key);
  if (fromLocal) return Number(fromLocal);

  // fallback: nếu trước đây bạn từng lưu key cũ "pt_trainerId" thì chỉ dùng khi key theo user chưa có
  const legacy = localStorage.getItem("pt_trainerId");
  return legacy ? Number(legacy) : null;
};

export const setTrainerId = (id) => {
  const key = getTrainerKeyByUser();
  localStorage.setItem(key, String(id));
};

export const clearTrainerId = () => {
  const key = getTrainerKeyByUser();
  localStorage.removeItem(key);
  // dọn luôn legacy để khỏi dính
  localStorage.removeItem("pt_trainerId");
};
