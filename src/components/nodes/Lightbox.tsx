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
  // card images are served at card size; opened large, let the browser pick
  // a sharper candidate from the same srcset (the small one stays on screen
  // until the bigger one has loaded)
  if (clone instanceof HTMLImageElement && clone.srcset) {
    clone.loading = "eager";
    clone.sizes = "100vw";
  }
  const overlay = document.createElement("div");
  overlay.className = styles.gallery;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Expanded media. Press Escape to close.");
  overlay.tabIndex = -1;
  // opened from the keyboard: move focus in, and hand it back on close
  const restoreFocus = document.activeElement === source;
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
    document.removeEventListener("keydown", onKey);
    if (restoreFocus) source.focus({ preventScroll: true });
    setTimeout(() => {
      source.classList.remove(styles.mediaOpen);
      overlay.remove();
    }, 500);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (
      (e.key === "Enter" || e.key === " ") &&
      document.activeElement === overlay
    ) {
      e.preventDefault();
      close();
    }
  };

  setTimeout(() => overlay.classList.add(styles.galleryIn), 10);
  setTimeout(() => {
    // 50px of backdrop around the media; on phones that would leave it
    // smaller than it already is in the card, so go nearly edge to edge
    const pad = window.innerWidth < 768 ? 24 : 100;
    const maxW = window.innerWidth - pad;
    const maxH = window.innerHeight - pad;
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
  if (restoreFocus) overlay.focus({ preventScroll: true });
}
