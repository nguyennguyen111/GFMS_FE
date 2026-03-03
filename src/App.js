import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import LandingPage from "./components/pages/LandingPage";
import "./styles/memberUI.css";

import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";

import AdminDashboard from "./components/admin/AdminDashboard";
import OwnerDashboard from "./components/owner/OwnerDashboard";

/* ================= MEMBER ================= */
import MemberWebLayout from "./layouts/MemberWebLayout";
import MemberHomePage from "./components/member/pages/MemberHomePage";
import MemberPackagesPage from "./components/member/pages/MemberPackagesPage";
import MemberBookingCreatePage from "./components/member/pages/MemberBookingCreatePage";
import MemberBookingsPage from "./components/member/pages/MemberBookingsPage";
import MemberCheckinPage from "./components/member/pages/MemberCheckinPage";
import MemberMyPackagesPage from "./components/member/pages/MemberMyPackagesPage";
import MemberPackageDetailPage from "./components/member/pages/MemberPackageDetailPage";

import MemberProfilePage from "./components/member/pages/MemberProfilePage";
import MemberNotificationsPage from "./components/member/pages/MemberNotificationsPage";
import MemberMessagesPage from "./components/member/pages/MemberMessagesPage";
import MemberProgressPage from "./components/member/pages/MemberProgressPage";
import MemberReviewsPage from "./components/member/pages/MemberReviewsPage";

/* ================= PT ================= */
import PTLayout from "./layouts/PTLayout";
import PTList from "./components/pt-portal/PTList";
import PTForm from "./components/pt-portal/PTForm";
import PTDetails from "./components/pt-portal/PTDetails";
import PTScheduleUpdate from "./components/pt-portal/PTScheduleUpdate";
import PTSchedule from "./components/pt-portal/PTSchedule";
import PTDashboard from "./components/pt-portal/PTDashboard";
import PTCreateProfile from "./components/pt-portal/PTCreateProfile";
import PTProfile from "./components/pt-portal/PTProfile";
import PTSkills from "./components/pt-portal/PTSkills";
import PTClients from "./components/pt-portal/PTClients";
import PTFeedback from "./components/pt-portal/PTFeedback";
import PTPayrollPage from "./components/pt-portal/PTPayrollPage";
import PTWalletPage from "./components/pt-portal/PTWalletPage";
import PTRequests from "./components/pt-portal/PTRequests";

/* ================= MARKETPLACE ================= */
import WebsiteLayout from "./layouts/WebsiteLayout";
import GymListPage from "./components/pages/marketplace/gyms/GymListPage";
import TrainerListPage from "./components/pages/marketplace/trainers/TrainerListPage";
import TrainerDetailsPage from "./components/pages/marketplace/trainers/TrainerDetailsPage";
import GymDetailsPage from "./components/pages/marketplace/gyms/GymDetailsPage";
import PackageDetailsPage from "./components/pages/marketplace/packages/PackageDetailsPage";

/* ================= SIGNING (PUBLIC) ================= */
import SignContractPage from "./components/public/SignContractPage";

/* ================= ADMIN GUARD (FIX) ================= */
const AdminGuard = ({ children }) => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return <Navigate to="/login" replace />;

    const data = JSON.parse(raw);

    // Support both shapes:
    // - stored directly: { id, email, groupId, ... }
    // - wrapped: { user: { ... } }
    const storedUser = data?.user ?? data;

    const groupId = Number(storedUser?.groupId ?? storedUser?.group_id);

    // groupId = 1 là Admin
    if (groupId !== 1) return <Navigate to="/" replace />;

    return children;
  } catch {
    return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <Router>
      <Routes>
        {/* ===== PUBLIC SIGNING ===== */}
        <Route path="/sign-contract" element={<SignContractPage />} />

        {/* ===== PUBLIC / MARKETPLACE ===== */}
        <Route element={<WebsiteLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/marketplace/gyms" element={<GymListPage />} />
          <Route path="/marketplace/gyms/:gymId" element={<GymDetailsPage />} />
          <Route path="/marketplace/trainers" element={<TrainerListPage />} />
          <Route path="/marketplace/trainers/:trainerId" element={<TrainerDetailsPage />} />
          <Route path="/marketplace/packages/:packageId" element={<PackageDetailsPage />} />
        </Route>

        {/* ===== AUTH ===== */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* ===== ADMIN ===== */}
        <Route
          path="/admin/*"
          element={
            <AdminGuard>
              <AdminDashboard />
            </AdminGuard>
          }
        />

        {/* ===== OWNER ===== */}
        <Route path="/owner/*" element={<OwnerDashboard />} />

        {/* ===== MEMBER ===== */}
        <Route path="/member" element={<MemberWebLayout />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<MemberHomePage />} />
          <Route path="packages" element={<MemberPackagesPage />} />
          <Route path="my-packages" element={<MemberMyPackagesPage />} />
          <Route path="my-packages/:activationId" element={<MemberPackageDetailPage />} />
          <Route path="bookings" element={<MemberBookingsPage />} />
          <Route path="bookings/new" element={<MemberBookingCreatePage />} />
          <Route path="checkin/:id" element={<MemberCheckinPage />} />

          {/* dropdown */}
          <Route path="profile" element={<MemberProfilePage />} />
          <Route path="notifications" element={<MemberNotificationsPage />} />
          <Route path="messages" element={<MemberMessagesPage />} />
          <Route path="progress" element={<MemberProgressPage />} />
          <Route path="reviews" element={<MemberReviewsPage />} />
        </Route>

        {/* ===== PT ===== */}
        <Route path="/pt" element={<PTLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PTDashboard />} />

          {/* CRUD PT */}
          <Route path="trainers" element={<PTList />} />
          <Route path="create" element={<PTForm />} />
          <Route path="edit/:id" element={<PTForm />} />

          {/* PT pages (no :id) */}
          <Route path="profile" element={<PTProfile />} />
          <Route path="profile/create" element={<PTCreateProfile />} />
          <Route path="clients" element={<PTClients />} />
          <Route path="feedback" element={<PTFeedback />} />
          <Route path="payroll" element={<PTPayrollPage />} />
          <Route path="wallet" element={<PTWalletPage />} />
          <Route path="requests" element={<PTRequests />} />

          {/* PT pages (need :id) */}
          <Route path=":id/details" element={<PTDetails />} />
          <Route path=":id/skills" element={<PTSkills />} />
          <Route path=":id/schedule" element={<PTSchedule />} />
          <Route path=":id/schedule-update" element={<PTScheduleUpdate />} />

          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* ===== FALLBACK ===== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
