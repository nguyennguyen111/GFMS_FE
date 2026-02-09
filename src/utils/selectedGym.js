const KEY = "selectedGym";

/**
 * Selected Gym format:
 * { id: number|string, name: string }
 */

export function getSelectedGym() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.id) return null;
    return { id: obj.id, name: obj.name || `Gym #${obj.id}` };
  } catch {
    return null;
  }
}

export function setSelectedGym(gym) {
  if (!gym || !gym.id) return;
  const data = { id: gym.id, name: gym.name || `Gym #${gym.id}` };
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("selectedGymChanged"));
}

export function clearSelectedGym() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("selectedGymChanged"));
}

/** ✅ Backward-compatible helpers (để không cần sửa BookingCreatePage) */
export function getSelectedGymId() {
  const g = getSelectedGym();
  return g?.id ?? null;
}

export function getSelectedGymName() {
  const g = getSelectedGym();
  return g?.name ?? "";
}
