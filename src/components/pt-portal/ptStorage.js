export const getUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
};

export const getTrainerId = () => {
  const user = getUserFromStorage();

  // ưu tiên trainerId nếu backend trả về sẵn
  const fromUser =
    user?.trainerId ||
    user?.trainer?.id ||
    user?.trainer?.trainerId ||
    null;

  // fallback: user nhập 1 lần, lưu localStorage riêng
  const fromLocal = localStorage.getItem("pt_trainerId");

  return fromUser || (fromLocal ? Number(fromLocal) : null);
};

export const setTrainerId = (id) => {
  localStorage.setItem("pt_trainerId", String(id));
};
