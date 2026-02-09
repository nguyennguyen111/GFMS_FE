// src/components/guards/SelectedGymGuard.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSelectedGymId } from "../../utils/selectedGym";

export default function SelectedGymGuard({ children }) {
  const loc = useLocation();
  const gymId = getSelectedGymId();

  if (!gymId) {
    const next = encodeURIComponent(loc.pathname + (loc.search || ""));
    return <Navigate to={`/marketplace/gyms?next=${next}`} replace />;
  }

  return children;
}
