import React from "react";
import Header from "../header/Header";
import GFMSHero from "../landing/GFMSHero";
import RolesSection from "../landing/RolesSection";
import WorkflowSection from "../landing/WorkflowSection";
import ModulesSection from "../landing/ModulesSection";
import PricingSection from "../landing/PricingSection";
import FAQSection from "../landing/FAQSection";
import JoinCTA from "../landing/JoinCTA";
import Footer from "../footer/Footer";

const LandingPage = () => {
  return (
    <>
      <GFMSHero />
      <RolesSection />
      <WorkflowSection />
      <ModulesSection />
      <PricingSection />
      <FAQSection />
      <JoinCTA />
    </>
  );
};

export default LandingPage;