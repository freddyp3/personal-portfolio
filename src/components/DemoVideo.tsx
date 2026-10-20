"use client";

import { useEffect, useRef } from "react";

interface Props {
  src: string;
  className?: string;
  volume?: number;
}

export default function DemoVideo({ src, className, volume = 0.5 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  return (
    <video
      ref={videoRef}
      controls
      preload="metadata"
      className={className}
      src={src}
    >
      Your browser does not support the video tag.
    </video>
  );
}
