import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import "../styles/memberTheme.css"; // ✅ NEW

export default function WebsiteLayout() {
  return (
    <div className="site member-app">
      <Header />
      <main className="site-main">
        <div className="site-container">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
