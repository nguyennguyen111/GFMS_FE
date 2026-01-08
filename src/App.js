import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import LandingPage from "./pages/LandingPage";
import "./styles/memberUI.css";

import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";

import AdminDashboard from "./components/admin/AdminDashboard";
import OwnerDashboard from "./components/owner/OwnerDashboard";

// ✅ NEW layout + pages
import MemberWebLayout from "./layouts/MemberWebLayout";
import MemberHomePage from "./components/member/pages/MemberHomePage";
import MemberPackagesPage from "./components/member/pages/MemberPackagesPage";
import MemberBookingCreatePage from "./components/member/pages/MemberBookingCreatePage";
import MemberBookingsPage from "./components/member/pages/MemberBookingsPage";
import MemberCheckinPage from "./components/member/pages/MemberCheckinPage";
import MemberMyPackagesPage from "./components/member/pages/MemberMyPackagesPage";

// dropdown pages (nếu bạn đã tạo theo mình)
import MemberProfilePage from "./components/member/pages/MemberProfilePage";
import MemberNotificationsPage from "./components/member/pages/MemberNotificationsPage";
import MemberMessagesPage from "./components/member/pages/MemberMessagesPage";
import MemberProgressPage from "./components/member/pages/MemberProgressPage";
import MemberReviewsPage from "./components/member/pages/MemberReviewsPage";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Admin */}
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Owner */}
          <Route path="/owner/*" element={<OwnerDashboard />} />
          <Route path="/owner" element={<Navigate to="/owner/packages" replace />} />

          {/* ✅ Member website layout */}
          <Route path="/member" element={<MemberWebLayout />}>
            <Route index element={<Navigate to="/member/home" replace />} />
            <Route path="home" element={<MemberHomePage />} />

            <Route path="packages" element={<MemberPackagesPage />} />
            <Route path="/member/my-packages" element={<MemberMyPackagesPage />} />
            <Route path="bookings" element={<MemberBookingsPage />} />
            <Route path="bookings/new" element={<MemberBookingCreatePage />} />
            <Route path="checkin/:id" element={<MemberCheckinPage />} />

            {/* dropdown routes */}
            <Route path="my" element={<MemberMyPackagesPage />} />
            <Route path="profile" element={<MemberProfilePage />} />
            <Route path="notifications" element={<MemberNotificationsPage />} />
            <Route path="messages" element={<MemberMessagesPage />} />
            <Route path="progress" element={<MemberProgressPage />} />
            <Route path="reviews" element={<MemberReviewsPage />} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
