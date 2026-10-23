// Shared stacking order for the panel card and the floating media (they're
// siblings in the page column). Hovering an element's visible part raises it
// above everything else; pointer events only reach whatever is on top, so
// media hidden under the card can't be raised through it. Only one element is
// raised at a time: raising another, or leaving it, puts it back on its own
// layer.
const RAISED_Z = "100";
let raised: { el: HTMLElement; prev: string } | null = null;

export function bringToFront(el: HTMLElement) {
  if (raised?.el === el) return;
  sendBack();
  raised = { el, prev: el.style.zIndex };
  el.style.zIndex = RAISED_Z;
}

// restore the raised element's own layer (only if it's `el`, when given)
export function sendBack(el?: HTMLElement) {
  if (!raised || (el && raised.el !== el)) return;
  raised.el.style.zIndex = raised.prev;
  raised = null;
}
