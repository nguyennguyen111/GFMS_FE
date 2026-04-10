import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";

export default function MemberWebLayout() {
  return (
    <div className="site site--compact member-app">
      <Header compact />
      <main className="site-main">
        <div className="site-container">
          <Outlet />
        </div>
      </main>
      <Footer compact />
    </div>
  );
}