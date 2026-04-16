import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import ChatBot from "../components/chatbot/ChatBot";

export default function WebsiteLayout() {
  const isCompact = true;

  return (
    <>
      <div className={`site ${isCompact ? "site--compact" : ""}`.trim()}>
        <Header />
        <main className="site-main">
          <Outlet />
        </main>
        <Footer />
      </div>
      <ChatBot />
    </>
  );
}
