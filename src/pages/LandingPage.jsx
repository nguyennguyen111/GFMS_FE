import React from "react";
import Header from "../components/header/Header";
import GFMSHero from "../components/landing/GFMSHero";
import RolesSection from "../components/landing/RolesSection";
import WorkflowSection from "../components/landing/WorkflowSection";
import ModulesSection from "../components/landing/ModulesSection";
import PricingSection from "../components/landing/PricingSection";
import FAQSection from "../components/landing/FAQSection";
import JoinCTA from "../components/landing/JoinCTA";
import Footer from "../components/footer/Footer";

const LandingPage = () => {
  return (
    <>
      <Header />
      <GFMSHero />
      <RolesSection />
      <WorkflowSection />
      <ModulesSection />
      <PricingSection />
      <FAQSection />
      <JoinCTA />
      <Footer />
    </>
  );
};

export default LandingPage;
