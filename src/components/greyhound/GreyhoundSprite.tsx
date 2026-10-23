"use client";

import { useCallback, useEffect, useState } from "react";
import AsciiAnimator, { type Paint, type Shading } from "./AsciiAnimator";
import type { SpriteMeta } from "./sprites";

type Props = SpriteMeta & {
  shading?: Shading;
  // cap the distance maps (sprite px) before blending: parts that move a long
  // way between frames hand over at the midpoint instead of vanishing early
  // and reappearing late, which reads as a stall then a pop
  sdfClamp?: number;
  cursorLight?: boolean;
};

interface Morph {
  near: Float32Array[]; // signed distance per frame, negative inside
  any: Float32Array[];
  alpha: Uint8ClampedArray; // the blended frame, sprite resolution
}

const INF = 1e20;

// 1D squared distance transform (Felzenszwalb & Huttenlocher)
function edt1d(
  f: Float64Array,
  n: number,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

// squared distance from every pixel to the nearest pixel where seed is true
function edt(seed: (i: number) => boolean, w: number, h: number) {
  const grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = seed(i) ? 0 : INF;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
  return grid;
}

function signedDistance(inside: Uint8Array, w: number, h: number) {
  const toIn = edt((i) => inside[i] === 1, w, h);
  const toOut = edt((i) => inside[i] === 0, w, h);
  const sdf = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    sdf[i] = inside[i] ? 0.5 - Math.sqrt(toOut[i]) : Math.sqrt(toIn[i]) - 0.5;
  }
  return sdf;
}

// Plays a pre-processed silhouette sprite sheet (255 = near body, 128 = far
// legs, 0 = background) through the ASCII renderer, morphing between frames
// so motion stays smooth at the display's frame rate.
export default function GreyhoundSprite({
  src,
  frames,
  frameW,
  frameH,
  cycleMs,
  times,
  shading,
  sdfClamp,
  cursorLight,
}: Props) {
  const [morph, setMorph] = useState<Morph | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      const size = frameW * frameH;
      const near: Float32Array[] = [];
      const any: Float32Array[] = [];
      for (let f = 0; f < frames; f++) {
        const inNear = new Uint8Array(size);
        const inAny = new Uint8Array(size);
        for (let y = 0; y < frameH; y++) {
          for (let x = 0; x < frameW; x++) {
            const val = px[(y * c.width + f * frameW + x) * 4];
            inNear[y * frameW + x] = val >= 192 ? 1 : 0;
            inAny[y * frameW + x] = val >= 64 ? 1 : 0;
          }
        }
        const sn = signedDistance(inNear, frameW, frameH);
        const sa = signedDistance(inAny, frameW, frameH);
        if (sdfClamp) {
          for (let k = 0; k < size; k++) {
            sn[k] = Math.max(-sdfClamp, Math.min(sdfClamp, sn[k]));
            sa[k] = Math.max(-sdfClamp, Math.min(sdfClamp, sa[k]));
          }
        }
        near.push(sn);
        any.push(sa);
      }
      setMorph({
        near,
        any,
        alpha: new Uint8ClampedArray((frameW + 2) * (frameH + 2)),
      });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, frames, frameW, frameH, sdfClamp]);

  const paint = useCallback<Paint>(
    (out, outW, outH, t, x, y, w, h) => {
      if (!morph) return;
      let i = 0;
      while (i < frames - 1 && t >= times[i + 1]) i++;
      const j = (i + 1) % frames;
      const a = Math.min(
        1,
        Math.max(0, (t - times[i]) / (times[i + 1] - times[i])),
      );
      const nI = morph.near[i];
      const nJ = morph.near[j];
      const aI = morph.any[i];
      const aJ = morph.any[j];
      // blended frame into a buffer with a 1px empty border, so the
      // resample below needs no bounds checks
      const pw = frameW + 2;
      const alpha = morph.alpha;
      let sx = 0;
      let sy = 0;
      let sum = 0;
      let minX = frameW;
      let maxX = -1;
      let minY = frameH;
      let maxY = -1;
      for (let yy = 0, k = 0; yy < frameH; yy++) {
        const prow = (yy + 1) * pw + 1;
        for (let xx = 0; xx < frameW; xx++, k++) {
          const dn = nI[k] + (nJ[k] - nI[k]) * a;
          const da = aI[k] + (aJ[k] - aI[k]) * a;
          const cn = dn >= 0.5 ? 0 : dn <= -0.5 ? 255 : (0.5 - dn) * 255;
          const ca = da >= 0.5 ? 0 : da <= -0.5 ? 128 : (0.5 - da) * 128;
          const v = cn > ca ? cn : ca;
          alpha[prow + xx] = v;
          if (v) {
            sx += xx * v;
            sy += yy * v;
            sum += v;
            if (xx < minX) minX = xx;
            if (xx > maxX) maxX = xx;
            if (yy < minY) minY = yy;
            if (yy > maxY) maxY = yy;
          }
        }
      }
      if (!sum) return;
      // keyframes are pinned on their centre of mass; keep the morphed
      // in-betweens pinned too so the dog never drifts
      const dx = frameW / 2 - sx / sum;
      const dy = frameH / 2 - sy / sum;

      // bilinear resample into the output, only over the dog's bounding box
      const kx = frameW / w;
      const ky = frameH / h;
      const ox = x + dx / kx;
      const oy = y + dy / ky;
      const u0 = Math.max(0, Math.floor(ox + (minX - 1) / kx));
      const u1 = Math.min(outW, Math.ceil(ox + (maxX + 2) / kx));
      const v0 = Math.max(0, Math.floor(oy + (minY - 1) / ky));
      const v1 = Math.min(outH, Math.ceil(oy + (maxY + 2) / ky));
      const n = u1 - u0;
      if (n <= 0) return;
      const xi = new Int32Array(n);
      const xf = new Float32Array(n);
      for (let c = 0; c < n; c++) {
        const fx = Math.min(
          frameW,
          Math.max(-1, (u0 + c + 0.5 - ox) * kx - 0.5),
        );
        const x0 = Math.floor(fx);
        xi[c] = x0 + 1; // +1: border offset
        xf[c] = fx - x0;
      }
      for (let v = v0; v < v1; v++) {
        const fy = Math.min(frameH, Math.max(-1, (v + 0.5 - oy) * ky - 0.5));
        const y0 = Math.floor(fy);
        const wy = fy - y0;
        const r0 = (y0 + 1) * pw;
        const r1 = r0 + pw;
        const row = v * outW + u0;
        for (let c = 0; c < n; c++) {
          const x0 = xi[c];
          const wx = xf[c];
          const top =
            alpha[r0 + x0] + (alpha[r0 + x0 + 1] - alpha[r0 + x0]) * wx;
          const bot =
            alpha[r1 + x0] + (alpha[r1 + x0 + 1] - alpha[r1 + x0]) * wx;
          out[row + c] = top + (bot - top) * wy;
        }
      }
    },
    [morph, frames, frameW, frameH, times],
  );

  return (
    <AsciiAnimator
      aspect={frameW / frameH}
      cycleMs={cycleMs}
      paint={paint}
      ready={morph !== null}
      shading={shading}
      cursorLight={cursorLight}
    />
  );
}
