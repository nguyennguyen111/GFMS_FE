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
// ✅ Import AdminDashboard
import AdminDashboard from './components/admin/AdminDashboard';
//  ✅ Import Trainer Components
import PTList from './components/pt-portal/PTList';
import PTForm from './components/pt-portal/PTForm';
import PTDetails from './components/pt-portal/PTDetails';
import PTScheduleUpdate from './components/pt-portal/PTScheduleUpdate';
import PTSchedule from './components/pt-portal/PTSchedule';
import PTDashboard from './components/pt-portal/PTDashboard';
import PTCreateProfile from './components/pt-portal/PTCreateProfile';
import PTProfile from './components/pt-portal/PTProfile';
import PTSkills from './components/pt-portal/PTSkills';
import PTClients from './components/pt-portal/PTClients';
import PTFeedback from './components/pt-portal/PTFeedback';

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
          {/* ✅ Trainer routes */}
          <Route path="/pt/dashboard" element={<PTDashboard />} />
          <Route path="/pt/profile/create" element={<PTCreateProfile />} />
          <Route path="/pt/profile" element={<PTProfile />} />
          <Route path="/pt/:id/skills" element={<PTSkills />} />
          <Route path="/pt/clients" element={<PTClients />} />
          <Route path="/pt/feedback" element={<PTFeedback />} />

          {/* ✅ PT components (from pt-portal) */}
          <Route path="/pt/trainers" element={<PTList />} />
          <Route path="/pt/create" element={<PTForm />} />
          <Route path="/pt/edit/:id" element={<PTForm />} />
          <Route path="/pt/:id/details" element={<PTDetails />} />
          <Route path="/pt/:id/schedule" element={<PTSchedule />} />
          <Route path="/pt/:id/schedule-update" element={<PTScheduleUpdate />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
