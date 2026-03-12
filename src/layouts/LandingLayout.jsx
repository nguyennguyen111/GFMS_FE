import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";

export default function LandingLayout() {
  return (
    <div className="site landing-app">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
