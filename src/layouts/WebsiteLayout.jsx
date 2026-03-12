import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import "../styles/siteShell.css";

export default function WebsiteLayout() {
  return (
    <div className="site-shell">
      <Header />
      <main className="site-main">
        <div className="site-container--wide">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}