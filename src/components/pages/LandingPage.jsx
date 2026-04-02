import React from 'react';
import './LandingPage.css';
import Hero from '../landing/Hero';
import Stats from '../landing/Stats';
import GymNetwork from '../landing/GymNetwork';
import Trainers from '../landing/Trainers';
import Pricing from '../landing/Pricing';
import CTA from '../landing/CTA';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <Hero />
      <Stats />
      <GymNetwork />
      <Trainers />
      <Pricing />
      <CTA />
    </div>
  );
};

export default LandingPage;