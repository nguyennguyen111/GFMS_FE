// src/components/pages/LandingPage.jsx
import React from "react";
import HeroSection from "../landing/HeroSection";
import StatsSection from "../landing/StatsSection";
import LogoStripSection from "../landing/LogoStripSection";
import ModulesSectionModern from "../landing/ModulesSectionModern";
import TestimonialSection from "../landing/TestimonialSection";
import PricingSectionModern from "../landing/PricingSectionModern";
import FAQAccordionSection from "../landing/FAQAccordionSection";
import CTASection from "../landing/CTASection";
import FloatingUtilities from "../landing/FloatingUtilities";
import "./LandingPage.css";

export default function LandingPage() {
  return (
    <div className="landing-modern-page">
      <HeroSection />
      <StatsSection />
      <LogoStripSection />
      <ModulesSectionModern />
      <TestimonialSection />
      <PricingSectionModern />
      <FAQAccordionSection />
      <CTASection />
      <FloatingUtilities />
    </div>
  );
}