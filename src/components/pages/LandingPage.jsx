import React, { useEffect, useState } from 'react';
import './LandingPage.css';
import Hero from '../landing/Hero';
import Stats from '../landing/Stats';
import GymNetwork from '../landing/GymNetwork';
import Trainers from '../landing/Trainers';
import Pricing from '../landing/Pricing';
import CTA from '../landing/CTA';
import { mpGetLandingHighlights } from '../../services/marketplaceService';

const emptyHighlights = {
  stats: { totalMembers: 0, totalActiveGyms: 0, totalActiveTrainers: 0 },
  gyms: [],
  trainers: [],
  packages: [],
};

const unwrap = (res) => res?.data?.DT || emptyHighlights;

const LandingPage = () => {
  const [highlights, setHighlights] = useState(emptyHighlights);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await mpGetLandingHighlights();
        if (!mounted) return;
        setHighlights({ ...emptyHighlights, ...unwrap(res) });
      } catch (e) {
        console.error('load landing highlights error', e);
        if (mounted) setHighlights(emptyHighlights);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="landing-page">
      <Hero />
      <Stats stats={highlights.stats} loading={loading} />
      <GymNetwork gyms={highlights.gyms} loading={loading} />
      <Trainers trainers={highlights.trainers} loading={loading} />
      <Pricing packages={highlights.packages} loading={loading} />
      <CTA testimonials={highlights.testimonials} />
    </div>
  );
};

export default LandingPage;
