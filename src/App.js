// File: src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Footer from './components/footer/Footer';
import HeroSection from './components/hero-section/HeroSection';
import Join from './components/join/Join';
import LoginPage from './components/auth/LoginPage';
import Plans from './components/plans/Plans';
import Programs from './components/programs/Programs';
import Reasons from './components/reasons/Reasons';
import Testimonials from './components/testimonials/Testimonials';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';

import AdminDashboard from './components/admin/AdminDashboard';

// ✅ Guard tối giản cho admin
const AdminGuard = ({ children }) => {
  try {
    const raw = localStorage.getItem('user');
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
          {/* Trang chủ */}
          <Route
            path="/"
            element={
              <>
                <HeroSection />
                <Programs />
                <Reasons />
                <Plans />
                <Testimonials />
                <Join />
                <Footer />
              </>
            }
          />

          {/* Auth routes */}
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

          {/* ✅ Redirect /admin -> /admin/dashboard */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
