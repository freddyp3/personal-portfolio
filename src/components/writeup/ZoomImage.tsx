"use client";

import { openLightbox } from "@/components/nodes/Lightbox";
import Image, { type ImageProps } from "next/image";
import styles from "./writeup.module.css";

export default function ZoomImage({ alt, ...props }: ImageProps) {
  return (
    <button
      type="button"
      className={styles.zoom}
      aria-label={`Expand image: ${alt}`}
      onClick={(e) => openLightbox(e.currentTarget)}
    >
      <Image alt={alt} {...props} />
    </button>
  );
}
