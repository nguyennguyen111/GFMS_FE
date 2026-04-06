import { useCallback, useEffect, useState } from "react";
import {
  clearSelectedGym as clearSelectedGymStorage,
  getSelectedGym,
  setSelectedGym as setSelectedGymStorage,
} from "../utils/selectedGym";

export default function useSelectedGym() {
  const [selectedGym, setSelectedGymState] = useState(() => getSelectedGym());

  const syncSelectedGym = useCallback(() => {
    setSelectedGymState(getSelectedGym());
  }, []);

  useEffect(() => {
    window.addEventListener("selectedGymChanged", syncSelectedGym);
    window.addEventListener("storage", syncSelectedGym);
    return () => {
      window.removeEventListener("selectedGymChanged", syncSelectedGym);
      window.removeEventListener("storage", syncSelectedGym);
    };
  }, [syncSelectedGym]);

  const setSelectedGym = useCallback((gym) => {
    setSelectedGymStorage(gym);
    setSelectedGymState(getSelectedGym());
  }, []);

  const clearSelectedGym = useCallback(() => {
    clearSelectedGymStorage();
    setSelectedGymState(null);
  }, []);

  return {
    selectedGym,
    selectedGymId: selectedGym?.id ?? null,
    selectedGymName: selectedGym?.name || "",
    setSelectedGym,
    clearSelectedGym,
  };
}