import { MapPin } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

import ImageWithFallback from "../../../common/ImageWithFallback";
import { normalizeImageList } from "../../../../utils/image";
import "../Marketplace.css";

export default function GymHero({ gym }) {
  const images = normalizeImageList(gym?.images);
  const slides = images.length ? images : ["/placeholder-gym.jpg"];

  return (
    <div className="mp-gym-hero">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        autoplay={{ delay: 4500, disableOnInteraction: false }}
        loop={slides.length > 1}
        effect="fade"
        pagination={{ clickable: true }}
        className="mp-gym-hero-swiper"
      >
        {slides.map((img, index) => (
          <SwiperSlide key={index}>
            <div className="mp-gym-hero-slide">
              <ImageWithFallback
                src={img}
                alt={gym?.name || "Gym"}
                fallback="/placeholder-gym.jpg"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="mp-gym-hero-overlay">
        <div className="mp-gym-hero-content">
          <span className="mp-gym-hero-label">GFMS LOCATION</span>
          <h1>{gym?.name}</h1>

          <p>
            <MapPin size={16} />
            <span>{gym?.address || "Chưa có địa chỉ"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}