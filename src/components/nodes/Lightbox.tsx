import styles from "./nodes.module.css";

// FLIP lightbox: clones the clicked media element into a fixed overlay at its
// original rect, fades the backdrop in, then animates the clone to fit the
// viewport. Clicking or Esc animates it back.
export function openLightbox(source: HTMLElement) {
  const media = source.querySelector("img, video") as
    | HTMLImageElement
    | HTMLVideoElement
    | null;
  if (!media) return;
  const rect = media.getBoundingClientRect();
  const clone = media.cloneNode(true) as HTMLElement;
  // videos with sound play out loud once opened large (the click is the
  // user gesture browsers require); in the card they stay muted
  // (cloneNode drops the muted property, so set it explicitly either way)
  if (clone instanceof HTMLVideoElement) {
    clone.muted = clone.dataset.sound !== "1";
    clone.currentTime = (media as HTMLVideoElement).currentTime;
    clone.play().catch(() => {});
  }
  const overlay = document.createElement("div");
  overlay.className = styles.gallery;
  overlay.appendChild(clone);
  document.body.appendChild(overlay);
  source.classList.add(styles.mediaOpen);

  Object.assign(clone.style, {
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    cursor: "zoom-out",
  });

  const close = () => {
    Object.assign(clone.style, {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      top: `${rect.top}px`,
      left: `${rect.left}px`,
    });
    overlay.classList.remove(styles.galleryIn);
    setTimeout(() => {
      source.classList.remove(styles.mediaOpen);
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    }, 500);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  setTimeout(() => overlay.classList.add(styles.galleryIn), 10);
  setTimeout(() => {
    const maxW = window.innerWidth - 100;
    const maxH = window.innerHeight - 100;
    const fit = maxW / maxH;
    const aspect = rect.width / rect.height;
    let w: number;
    let h: number;
    if (aspect > fit) {
      w = maxW;
      h = maxW / aspect;
    } else {
      h = maxH;
      w = maxH * aspect;
    }
    Object.assign(clone.style, {
      width: `${w}px`,
      height: `${h}px`,
      top: `${(window.innerHeight - h) / 2}px`,
      left: `${(window.innerWidth - w) / 2}px`,
    });
  }, 100);

  overlay.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
}
