// src/components/common/ImageWithFallback.jsx
import React, { useEffect, useMemo, useState } from "react";
import { normalizeSingleImageSrc } from "../../utils/image";

export default function ImageWithFallback({
  src,
  alt = "",
  fallback = "/placeholder-gym.jpg",
  className = "",
  ...rest
}) {
  const mainSrc = useMemo(() => normalizeSingleImageSrc(src), [src]);
  const fallbackSrc = useMemo(() => normalizeSingleImageSrc(fallback, { preferBackend: false }), [fallback]);

  const [currentSrc, setCurrentSrc] = useState(mainSrc || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(mainSrc || fallbackSrc);
  }, [mainSrc, fallbackSrc]);

  return (
    <img
      {...rest}
      className={className}
      src={currentSrc || fallbackSrc}
      alt={alt}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}