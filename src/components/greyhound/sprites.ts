// Generated from the source GIF: silhouettes pinned on their centre of mass,
// with the muzzle replaced by one fixed closed muzzle (slightly sharper, with a
// raised, convex jaw line) that moves and tilts with the traced head, plus a
// thin ear angled back along the neck. The source GIF isn't a true loop (its
// last and first frames repeat the same pose and step backwards) and frame 10
// swings the legs out and back, so this uses source frames 2-17 minus 10: one
// clean stride. Playback times (cumulative 0..1, one more entry than frames)
// are paced evenly by how much the on-screen characters change.
export interface SpriteMeta {
  src: string;
  frames: number;
  frameW: number;
  frameH: number;
  cycleMs: number;
  times: number[];
}

export const GREYHOUND: SpriteMeta = {
  src: "/greyhound/greyhound.png",
  frames: 15,
  frameW: 360,
  frameH: 143,
  cycleMs: 450,
  times: [
    0.0, 0.0365, 0.0734, 0.1352, 0.229, 0.3045, 0.3766, 0.4417, 0.5109, 0.5995,
    0.6681, 0.7468, 0.8209, 0.8876, 0.9521, 1.0,
  ],
};
