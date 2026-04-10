import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import ChatBot from "../components/chatbot/ChatBot";

export default function WebsiteLayout() {
  const location = useLocation();
  const isCompact = location.pathname !== "/";

  return (
    <>
      <div className={`site ${isCompact ? "site--compact" : ""}`.trim()}>
        <Header compact />
        <main className="site-main">
          <Outlet />
        </main>
        <Footer compact />
      </div>
      <ChatBot />
    </>
  );
}
