// src/components/common/ImageWithFallback.jsx
import React, { useState } from "react";

export default function ImageWithFallback({
  src,
  alt,
  fallback = "/placeholder.jpg",
  ...props
}) {
  const [img, setImg] = useState(src || fallback);

  return (
    <img
      src={img}
      alt={alt}
      onError={() => setImg(fallback)}
      {...props}
    />
  );
}
