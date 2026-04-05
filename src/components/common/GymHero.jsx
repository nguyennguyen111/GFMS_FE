// src/components/pages/marketplace/common/GymHero.jsx
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

import ImageWithFallback from "./ImageWithFallback";
import { normalizeImageList } from "../../utils/image";
import "../Marketplace.css";

export default function GymHero({ gym }) {
  const images = normalizeImageList(gym?.images);
  const slides = images.length ? images : ["/placeholder-gym.jpg"];

  return (
    <div className="gym-hero">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        autoplay={{ delay: 4500, disableOnInteraction: false }}
        loop={slides.length > 1}
        effect="fade"
        pagination={{ clickable: true }}
      >
        {slides.map((img, index) => (
          <SwiperSlide key={index}>
            <ImageWithFallback
              src={img}
              alt={gym?.name || "Gym"}
              fallback="/placeholder-gym.jpg"
            />
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="gym-hero-overlay">
        <h1>{gym?.name}</h1>
        <p>
          <span className="material-symbols-outlined">location_on</span>
          {gym?.address}
        </p>
      </div>
    </div>
  );
}