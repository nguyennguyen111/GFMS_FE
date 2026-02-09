import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

import ImageWithFallback from "../../../common/ImageWithFallback";

export default function GymHero({ gym }) {
  const images =
    Array.isArray(gym.images) && gym.images.length > 0
      ? gym.images
      : ["/placeholder-gym.jpg"];

  return (
    <div className="gym-hero">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        autoplay={{ delay: 4500, disableOnInteraction: false }}
        loop
        effect="fade"
        pagination={{ clickable: true }}
      >
        {images.map((img, index) => (
          <SwiperSlide key={index}>
            <ImageWithFallback
              src={img}
              alt={gym.name}
              fallback="/placeholder-gym.jpg"
            />
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="gym-hero__overlay">
        <h1>{gym.name}</h1>
        <p>{gym.address}</p>
      </div>
    </div>
  );
}
