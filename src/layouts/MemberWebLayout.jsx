import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";

export default function MemberWebLayout() {
  return (
    <div className="site">
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
