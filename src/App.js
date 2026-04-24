import "./App.css";
import React, { useEffect, useState } from "react";
import AppToastHost from "./components/common/AppToastHost";
import AppDialogHost from "./components/common/AppDialogHost";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { bootstrapAuthSession } from "./services/authService";
import { hydrateAuthSessionFromStorage } from "./services/authSession";
import { getAccessToken, getCurrentUser } from "./utils/auth";

import LandingPage from "./components/pages/LandingPage";

import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";

import AdminDashboard from "./components/admin/AdminDashboard";
import OwnerDashboard from "./components/owner/OwnerDashboard";

/* ================= MEMBER ================= */
import MemberBookingsPage from "./components/member/pages/MemberBookingsPage";
import MemberCheckinPage from "./components/member/pages/MemberCheckinPage";
import MemberMyPackagesPage from "./components/member/pages/MemberMyPackagesPage";
import MemberPackageDetailPage from "./components/member/pages/MemberPackageDetailPage";
import MemberPaymentSuccessPage from "./components/member/pages/MemberPaymentSuccessPage";

import MemberProfilePage from "./components/member/pages/MemberProfilePage";
import MemberMembershipCardPage from "./components/member/pages/MemberMembershipCardPage";
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
import PTFinancePage from "./components/pt-portal/PTFinancePage";
import PTDemoVideos from "./components/pt-portal/PTDemoVideos";
import PTRequests from "./components/pt-portal/PTRequests";
import PTNotificationsPage from "./components/pt-portal/PTNotificationsPage";
import PTMessagesPage from "./components/pt-portal/PTMessagesPage";
import PTRescheduleRequestsPage from "./components/pt-portal/PTRescheduleRequestsPage";

/* ================= MARKETPLACE ================= */
import WebsiteLayout from "./layouts/WebsiteLayout";
import GymListPage from "./components/pages/marketplace/gyms/GymListPage";
import TrainerListPage from "./components/pages/marketplace/trainers/TrainerListPage";
import TrainerDetailsPage from "./components/pages/marketplace/trainers/TrainerDetailsPage";
import GymDetailsPage from "./components/pages/marketplace/gyms/GymDetailsPage";
import PackageDetailsPage from "./components/pages/marketplace/packages/PackageDetailsPage";
import MemberBookingWizard from "./components/member/pages/bookingWizard/MemberBookingWizard";
import SupportPage from "./components/pages/support/SupportPage";
import FAQPage from "./components/pages/support/FAQPage";

/* ================= SIGNING (PUBLIC) ================= */
import SignContractPage from "./components/public/SignContractPage";
import EquipmentScanPage from "./components/public/EquipmentScanPage";

/* ================= ADMIN GUARD (FIX) ================= */
const AdminGuard = ({ children }) => {
  try {
    const token = getAccessToken();
    const user = getCurrentUser();
    if (!user || !token) return <Navigate to="/login" replace />;
    const groupId = Number(user?.groupId ?? user?.group_id);
    if (groupId !== 1) return <Navigate to="/" replace />;
    return children;
  } catch {
    return <Navigate to="/login" replace />;
  }
};

const RoleGuard = ({ allowedGroupIds = [], children }) => {
  const user = getCurrentUser();
  const token = getAccessToken();
  const groupId = Number(user?.groupId ?? user?.group_id ?? 0);

  if (!user || !token || !groupId) return <Navigate to="/login" replace />;
  if (!allowedGroupIds.includes(groupId)) return <Navigate to="/" replace />;

  return children;
};


function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function App() {
  const [authBootstrapped, setAuthBootstrapped] = useState(false);

  useEffect(() => {
    let mounted = true;
    hydrateAuthSessionFromStorage();
    bootstrapAuthSession().finally(() => {
      if (mounted) setAuthBootstrapped(true);
    });

    const hardStop = setTimeout(() => {
      if (mounted) setAuthBootstrapped(true);
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(hardStop);
    };
  }, []);

  if (!authBootstrapped) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Loading...</div>;
  }

  return (
    <Router>
      <ScrollToTop />
      <AppToastHost />
      <AppDialogHost />
      <Routes>
        {/* ===== PUBLIC SIGNING ===== */}
        <Route path="/sign-contract" element={<SignContractPage />} />
        <Route path="/equipment/scan/:qrToken" element={<EquipmentScanPage />} />

        {/* ===== PUBLIC / MARKETPLACE ===== */}
        <Route element={<WebsiteLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/marketplace/gyms" element={<GymListPage />} />
          <Route path="/marketplace/gyms/:gymId" element={<GymDetailsPage />} />
          <Route path="/marketplace/trainers" element={<TrainerListPage />} />
          <Route path="/marketplace/trainers/:trainerId" element={<TrainerDetailsPage />} />
          <Route path="/marketplace/packages/:packageId" element={<PackageDetailsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/faq" element={<FAQPage />} />
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
        <Route
          path="/owner/*"
          element={
            <RoleGuard allowedGroupIds={[2]}>
              <OwnerDashboard />
            </RoleGuard>
          }
        />

        {/* ===== MEMBER ===== */}
        <Route
          path="/member"
          element={
            <RoleGuard allowedGroupIds={[4]}>
              <WebsiteLayout />
            </RoleGuard>
          }
        >
          <Route index element={<Navigate to="bookings" replace />} />
          <Route path="my-packages" element={<MemberMyPackagesPage />} />
          <Route path="my-packages/:activationId" element={<MemberPackageDetailPage />} />
          <Route path="bookings" element={<MemberBookingsPage />} />
          <Route path="payment-success" element={<MemberPaymentSuccessPage />} />
          <Route path="checkin/:id" element={<MemberCheckinPage />} />
          <Route path="booking/wizard" element={<MemberBookingWizard />} />

          {/* dropdown */}
          <Route path="profile" element={<MemberProfilePage />} />
          <Route path="membership-cards" element={<MemberMembershipCardPage />} />
          <Route path="notifications" element={<MemberNotificationsPage />} />
          <Route path="messages" element={<MemberMessagesPage />} />
          <Route path="progress" element={<MemberProgressPage />} />
          <Route path="reviews" element={<MemberReviewsPage />} />
        </Route>

        {/* ===== PT ===== */}
        <Route
          path="/pt"
          element={
            <RoleGuard allowedGroupIds={[3]}>
              <PTLayout />
            </RoleGuard>
          }
        >
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
          <Route path="messages" element={<PTMessagesPage />} />
          <Route path="feedback" element={<PTFeedback />} />
          <Route path="demo-videos" element={<PTDemoVideos />} />
          <Route path="finance" element={<PTFinancePage />} />
          <Route path="payroll" element={<Navigate to="/pt/finance" replace />} />
          <Route path="wallet" element={<Navigate to="/pt/finance" replace />} />
          <Route path="requests" element={<PTRequests />} />
          <Route path="reschedule-requests" element={<PTRescheduleRequestsPage />} />
          <Route path="notifications" element={<PTNotificationsPage />} />

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
