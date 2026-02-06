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

// ✅ Member layout + pages
import MemberWebLayout from "./layouts/MemberWebLayout";
import MemberHomePage from "./components/member/pages/MemberHomePage";
import MemberPackagesPage from "./components/member/pages/MemberPackagesPage";
import MemberBookingCreatePage from "./components/member/pages/MemberBookingCreatePage";
import MemberBookingsPage from "./components/member/pages/MemberBookingsPage";
import MemberCheckinPage from "./components/member/pages/MemberCheckinPage";
import MemberMyPackagesPage from "./components/member/pages/MemberMyPackagesPage";

// dropdown pages
import MemberProfilePage from "./components/member/pages/MemberProfilePage";
import MemberNotificationsPage from "./components/member/pages/MemberNotificationsPage";
import MemberMessagesPage from "./components/member/pages/MemberMessagesPage";
import MemberProgressPage from "./components/member/pages/MemberProgressPage";
import MemberReviewsPage from "./components/member/pages/MemberReviewsPage";

// ✅ PT layout + pages
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
import PTShareRequests from "./components/pt-portal/PTShareRequests";
import PTPackages from "./components/pt-portal/PTPackages";
import PTRequests from "./components/pt-portal/PTRequests";

// ✅ Guard tối giản cho admin
const AdminGuard = ({ children }) => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return <Navigate to="/login" replace />;

    const data = JSON.parse(raw);
    const groupId = data?.user?.groupId;

    // groupId=1 là Admin theo DB của bạn
    if (groupId !== 1) return <Navigate to="/" replace />;

    return children;
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
};

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

          {/* ✅ Admin routes (Protected) */}
          <Route
            path="/admin/*"
            element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Owner */}
          <Route path="/owner/*" element={<OwnerDashboard />} />
          <Route path="/owner" element={<Navigate to="/owner/packages" replace />} />

          {/* ✅ Member website layout */}
          <Route path="/member" element={<MemberWebLayout />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<MemberHomePage />} />
            <Route path="packages" element={<MemberPackagesPage />} />
            <Route path="my-packages" element={<MemberMyPackagesPage />} />
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

          {/* ✅ PT routes (được bọc layout để sidebar không mất) */}
          <Route path="/pt" element={<PTLayout />}>
            {/* Nếu gõ /pt thì đẩy về dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />

            <Route path="dashboard" element={<PTDashboard />} />

            {/* các trang PT không có :id */}
            <Route path="profile" element={<PTProfile />} />
            <Route path="profile/create" element={<PTCreateProfile />} />
            <Route path="clients" element={<PTClients />} />
            <Route path="feedback" element={<PTFeedback />} />
            <Route path="payroll" element={<PTPayrollPage />} />
            <Route path="wallet" element={<PTWalletPage />} />
            <Route path="packages" element={<PTPackages />} />
            <Route path="requests" element={<PTRequests />} />

            {/* portal routes */}
            <Route path="trainers" element={<PTList />} />
            <Route path="create" element={<PTForm />} />
            <Route path="edit/:id" element={<PTForm />} />

            {/* các trang cần :id */}
            <Route path=":id/details" element={<PTDetails />} />
            <Route path=":id/skills" element={<PTSkills />} />
            <Route path=":id/schedule" element={<PTSchedule />} />
            <Route path=":id/schedule-update" element={<PTScheduleUpdate />} />
            <Route path="share-requests" element={<PTShareRequests />} />

            {/* fallback trong /pt */}
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
