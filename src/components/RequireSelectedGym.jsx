// src/components/RequireSelectedGym.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSelectedGymId } from "../utils/selectedGym";

export default function RequireSelectedGym({ children }) {
  const location = useLocation();
  const gymId = getSelectedGymId();

  // nếu chưa chọn gym -> đá về marketplace
  if (!gymId) {
    return <Navigate to="/marketplace/gyms" replace state={{ from: location.pathname }} />;
  }

  return children;
}
