"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export default function ProjectImage({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement | null>(null);

  return (
    <Image
      ref={(img) => {
        ref.current = img;
        // already-complete image (e.g. restored from cache) never fires
        // onLoad, so mark it loaded here
        if (img?.complete) setLoaded(true);
      }}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onLoad={() => setLoaded(true)}
      style={{
        opacity: loaded ? 1 : 0,
        transition: "opacity 250ms",
      }}
    />
  );
}
