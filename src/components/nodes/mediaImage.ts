import { getImageProps } from "next/image";
import type { NodeMedia } from "./types";

// Card media are shown at 250–360px on the map (and ~85vw once the layout
// stacks), but the source photos run up to several thousand px and 10 MB.
// Routing them through the Next image optimizer serves a resized WebP at the
// size actually drawn; the lightbox bumps `sizes` to pull a sharper one.
const CARD_SIZES = "(max-width: 1200px) 85vw, 360px";

export function cardImageProps(src: string) {
  const { props } = getImageProps({
    src,
    alt: "",
    width: 360,
    height: 360,
    sizes: CARD_SIZES,
  });
  return { sizes: props.sizes, srcSet: props.srcSet, src: props.src };
}

// Warm the cache for a card's images before it opens (the map calls this
// when a node or its list row is hovered or focused), so the photos are
// already there when the card animates in. Uses the same srcset/sizes as the
// card, so the browser fetches exactly the candidate it will draw.
const warmed = new Set<string>();

export function preloadCardImages(media: NodeMedia[] | undefined) {
  if (!media?.length) return;
  const conn = (navigator as { connection?: { saveData?: boolean } })
    .connection;
  if (conn?.saveData) return;
  for (const m of media) {
    if (m.type !== "image" || warmed.has(m.src)) continue;
    warmed.add(m.src);
    const p = cardImageProps(m.src);
    const img = new Image();
    if (p.sizes) img.sizes = p.sizes;
    if (p.srcSet) img.srcset = p.srcSet;
    img.src = p.src;
  }
}
