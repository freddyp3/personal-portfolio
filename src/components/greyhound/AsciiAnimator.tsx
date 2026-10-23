"use client";

import { GeistMono } from "geist/font/mono";
import { useEffect, useRef, useState } from "react";

// sub-samples per character cell
const GW = 4;
const GH = 8;
const MARGIN = 2;

// body texture, light → dense. Each band is a small family of glyphs laid
// out on a diagonal rhythm so the fill varies without looking random.
const BANDS = [":;=+~", "+=*<>x", "*x%#&", "#%&$@8"];
const FAR = ".:-~'";

// "light" shading: the silhouette is treated as a rounded, puffed-up body lit
// from the top-left; these bands run from lit (left) to shadowed (right)
const LIGHT_BANDS = [":-~;", ":;=+~", "+=*<>x", "*x%#&", "#%&$@8"];
const LIGHT = (() => {
  const v = [-0.55, -0.75, 0.65]; // x right, y down, z towards the viewer
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / n);
})();
const RELIEF = 11; // how strongly the body's slope tilts the surface

export type Shading = "depth" | "light";

// fills `out` (an alpha buffer, outW x outH sub-samples, already zeroed) with
// the dog at stride phase t, fitted into the rect (x, y, w, h). Done on the
// CPU: drawing to a canvas and reading it back every frame stalls Safari,
// which keeps canvases on the GPU.
export type Paint = (
  out: Uint8ClampedArray,
  outW: number,
  outH: number,
  t: number,
  x: number,
  y: number,
  w: number,
  h: number,
) => void;

interface Props {
  aspect: number; // dog width / height in square units
  cycleMs: number;
  paint: Paint;
  ready?: boolean;
  label?: string;
  shading?: Shading;
  // "light" shading only: the light comes from the cursor instead of the
  // fixed top-left, so the lit side of the dog follows the mouse
  cursorLight?: boolean;
}

// how far (fraction of the viewport width) the cursor has to be from the dog
// for the light to come fully from the side; closer, it shifts to the front
const LIGHT_SIDE_FRAC = 0.35;
const LIGHT_EASE_MS = 120;

function cursorLightDir(dx: number, dy: number, vw: number): number[] {
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return [0, 0, 1];
  const side = Math.min(1, dist / (LIGHT_SIDE_FRAC * vw));
  const v = [(dx / dist) * side, (dy / dist) * side, 0.65];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / n);
}

interface Grid {
  cols: number;
  rows: number;
  fontSize: number;
}

// edge families: glyphs that sit on the side of the cell facing the body
const EDGE = {
  top: "_.,_",
  bottom: "'`-~",
  side: "|!|:",
  rise: "/(/",
  fall: "\\)\\",
};

function edgeGlyph(gx: number, gy: number, k: number) {
  // gradient points into the body; the edge runs perpendicular to it
  const a = (Math.atan2(gy, gx) * 180) / Math.PI;
  const n = ((a % 180) + 180) % 180;
  const pick = (s: string) => s[k % s.length];
  if (n < 22.5 || n >= 157.5) return pick(EDGE.side);
  if (n < 67.5) return pick(gy > 0 ? EDGE.rise : EDGE.fall);
  if (n < 112.5) return pick(gy > 0 ? EDGE.top : EDGE.bottom);
  return pick(gy > 0 ? EDGE.fall : EDGE.rise);
}

function toAscii(
  img: Uint8ClampedArray,
  cols: number,
  rows: number,
  prev: Uint8Array | null,
  shading: Shading,
  cellRatio: number, // cell height / cell width
  light: number[] = LIGHT, // unit vector towards the light (x right, y down)
): { text: string; state: Uint8Array } {
  const cw = cols * GW;
  const near = new Float32Array(cols * rows);
  const far = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let n = 0;
      let f = 0;
      for (let sy = 0; sy < GH; sy++) {
        const base = (r * GH + sy) * cw + c * GW;
        for (let sx = 0; sx < GW; sx++) {
          const a = img[base + sx];
          if (a > 190) n++;
          else if (a > 70) f++;
        }
      }
      near[r * cols + c] = n / (GW * GH);
      far[r * cols + c] = f / (GW * GH);
    }
  }

  // how deep inside the body each cell sits (separable box blur)
  const tmp = new Float32Array(cols * rows);
  const depth = new Float32Array(cols * rows);
  const RX = 4;
  const RY = 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let s = 0;
      for (let d = -RX; d <= RX; d++) {
        const cc = c + d;
        if (cc >= 0 && cc < cols) s += near[r * cols + cc];
      }
      tmp[r * cols + c] = s / (2 * RX + 1);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let s = 0;
      for (let d = -RY; d <= RY; d++) {
        const rr = r + d;
        if (rr >= 0 && rr < rows) s += tmp[rr * cols + c];
      }
      depth[r * cols + c] = s / (2 * RY + 1);
    }
  }

  // height field for lighting: the depth map blurred once more so the
  // surface is a smooth dome rather than a plateau
  let height: Float32Array | null = null;
  if (shading === "light") {
    const t2 = new Float32Array(cols * rows);
    height = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let s = 0;
        for (let d = -RX; d <= RX; d++) {
          const cc = c + d;
          if (cc >= 0 && cc < cols) s += depth[r * cols + cc];
        }
        t2[r * cols + c] = s / (2 * RX + 1);
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let s = 0;
        for (let d = -RY; d <= RY; d++) {
          const rr = r + d;
          if (rr >= 0 && rr < rows) s += t2[rr * cols + c];
        }
        // sqrt: steep near the outline, flat inside, so light and shadow
        // hug the edges and the middle of the body stays solid
        height[r * cols + c] = Math.sqrt(s / (2 * RY + 1));
      }
    }
  }
  const hAt = (r: number, c: number) =>
    height && r >= 0 && r < rows && c >= 0 && c < cols
      ? height[r * cols + c]
      : 0;

  // hysteresis: a cell only flips when the edge clearly crosses it, so
  // outline characters don't blink as the shape moves by a hair
  const state = new Uint8Array(cols * rows);
  for (let i = 0; i < state.length; i++) {
    const thr =
      prev && prev.length === state.length ? (prev[i] ? 0.14 : 0.3) : 0.22;
    state[i] = near[i] >= thr ? 1 : 0;
  }
  const on = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && state[r * cols + c] === 1;
  const v = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols ? near[r * cols + c] : 0;

  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (!on(r, c)) {
        line += near[i] + far[i] >= 0.45 ? FAR[(c + 2 * r) % FAR.length] : " ";
        continue;
      }
      const edge =
        !on(r - 1, c) || !on(r + 1, c) || !on(r, c - 1) || !on(r, c + 1);
      if (edge) {
        const gx =
          v(r - 1, c + 1) +
          2 * v(r, c + 1) +
          v(r + 1, c + 1) -
          (v(r - 1, c - 1) + 2 * v(r, c - 1) + v(r + 1, c - 1));
        const gy =
          v(r + 1, c - 1) +
          2 * v(r + 1, c) +
          v(r + 1, c + 1) -
          (v(r - 1, c - 1) + 2 * v(r - 1, c) + v(r - 1, c + 1));
        if (Math.abs(gx) + Math.abs(gy) > 0.6) {
          line += edgeGlyph(gx, gy, c + r);
          continue;
        }
      }
      let band: string;
      if (height) {
        // slope per screen pixel (rows are cellRatio times taller than cols)
        const gx = (hAt(r, c + 1) - hAt(r, c - 1)) / 2;
        const gy = (hAt(r + 1, c) - hAt(r - 1, c)) / 2 / cellRatio;
        const nx = -RELIEF * gx;
        const ny = -RELIEF * gy;
        const len = Math.hypot(nx, ny, 1);
        const lit = Math.max(
          0,
          (nx * light[0] + ny * light[1] + light[2]) / len,
        );
        // flat, camera-facing body → dense band; lit slopes step lighter,
        // slopes facing away from the light step into the darkest band
        const flat = Math.min(0.999, light[2]);
        const last = LIGHT_BANDS.length - 1;
        const level =
          lit >= flat
            ? (last - 1) * (1 - (lit - flat) / (1 - flat))
            : last - 1 + (flat - lit) / flat;
        band = LIGHT_BANDS[Math.max(0, Math.min(last, Math.round(level)))];
      } else {
        const d = depth[i];
        band = BANDS[d < 0.4 ? 0 : d < 0.6 ? 1 : d < 0.8 ? 2 : 3];
      }
      line += band[(c + 2 * r + ((c >> 3) & 1)) % band.length];
    }
    lines.push(line);
  }
  return { text: lines.join("\n"), state };
}

export default function AsciiAnimator({
  aspect,
  cycleMs,
  paint,
  ready = true,
  label = "A greyhound running",
  shading = "depth",
  cursorLight = false,
}: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [cell, setCell] = useState({ w: 0.6, h: 1 });

  useEffect(() => {
    const compute = () => {
      const span = measureRef.current;
      if (!span) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw < 640;
      const fontSize = mobile ? 5 : 7;
      span.style.fontSize = `${fontSize}px`;
      const cellW = span.getBoundingClientRect().width / 100 || fontSize * 0.6;
      const cellH = fontSize;
      const ratio = aspect * (cellH / cellW);
      let cols = Math.floor((vw * (mobile ? 0.86 : 0.55)) / cellW);
      let rows = Math.round((cols - MARGIN * 2) / ratio) + MARGIN * 2;
      const maxRows = Math.floor((vh * 0.55) / cellH);
      if (rows > maxRows) {
        rows = maxRows;
        cols = Math.round((rows - MARGIN * 2) * ratio) + MARGIN * 2;
      }
      setCell({ w: cellW, h: cellH });
      setGrid({ cols, rows, fontSize });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [aspect]);

  useEffect(() => {
    if (!grid || !ready) return;
    const pre = preRef.current;
    if (!pre) return;
    const { cols, rows } = grid;
    const bufW = cols * GW;
    const bufH = rows * GH;
    const buf = new Uint8ClampedArray(bufW * bufH);

    const params = new URLSearchParams(window.location.search);
    const tParam = params.get("t");
    const frozen =
      tParam !== null && Number.isFinite(Number(tParam))
        ? Number(tParam)
        : null;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // cursor light: track the mouse (touch screens have no cursor and keep
    // the default top-left light); the light eases towards the cursor
    const tracking =
      cursorLight &&
      shading === "light" &&
      !window.matchMedia("(hover: none)").matches;
    let pointer: { x: number; y: number } | null = null;
    let light = LIGHT.slice();
    // the dog's on-screen centre, cached: reading the layout every frame
    // right after replacing the text forces a full relayout (slow in Safari)
    let centre: { x: number; y: number } | null = null;
    const measureCentre = () => {
      const r = pre.getBoundingClientRect();
      centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const targetLight = () => {
      if (!pointer) return LIGHT;
      if (!centre) measureCentre();
      return cursorLightDir(
        pointer.x - centre!.x,
        pointer.y - centre!.y,
        window.innerWidth,
      );
    };
    const resetCentre = () => {
      centre = null;
    };

    let prevState: Uint8Array | null = null;
    const draw = (t: number) => {
      buf.fill(0);
      paint(
        buf,
        bufW,
        bufH,
        t,
        MARGIN * GW,
        MARGIN * GH,
        (cols - MARGIN * 2) * GW,
        (rows - MARGIN * 2) * GH,
      );
      const res = toAscii(
        buf,
        cols,
        rows,
        prevState,
        shading,
        cell.h / cell.w,
        light,
      );
      prevState = res.state;
      pre.textContent = res.text;
    };

    // ?fps=1: on-screen frame meter (frames/s, slowest frame, hitches over
    // 25ms in the last 2s) to tell real dropped frames from motion artifacts
    let meter: HTMLDivElement | null = null;
    const gaps: { at: number; gap: number }[] = [];
    if (params.get("fps") === "1") {
      meter = document.createElement("div");
      meter.style.cssText =
        "position:fixed;top:8px;right:8px;z-index:1000;font:12px monospace;background:#000;color:#0f0;padding:4px 6px;white-space:pre";
      document.body.appendChild(meter);
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pointer = { x: e.clientX, y: e.clientY };
      if (frozen !== null) {
        // frozen (?t=) view: no animation loop, so relight right away
        light = targetLight();
        draw(((frozen % 1) + 1) % 1);
      }
    };
    const onLeave = () => {
      pointer = null;
    };
    if (tracking) {
      window.addEventListener("pointermove", onMove);
      document.documentElement.addEventListener("pointerleave", onLeave);
      window.addEventListener("resize", resetCentre);
      window.addEventListener("scroll", resetCentre, true);
    }

    let raf = 0;
    if (frozen !== null) {
      draw(((frozen % 1) + 1) % 1);
    } else if (reduced) {
      draw(0.5);
    } else {
      const start = performance.now();
      let last = start;
      const loop = (now: number) => {
        const t0 = performance.now();
        if (tracking) {
          const target = targetLight();
          const k = 1 - Math.exp(-Math.min(100, now - last) / LIGHT_EASE_MS);
          const mixed = light.map((c, i) => c + (target[i] - c) * k);
          const n = Math.hypot(mixed[0], mixed[1], mixed[2]) || 1;
          light = mixed.map((c) => c / n);
        }
        draw(((now - start) / cycleMs) % 1);
        if (meter) {
          gaps.push({ at: now, gap: now - last });
          while (gaps.length && gaps[0].at < now - 2000) gaps.shift();
          const worst = Math.max(...gaps.map((g) => g.gap));
          const hitches = gaps.filter((g) => g.gap > 25).length;
          meter.textContent = `${(gaps.length / 2).toFixed(0)} fps  slowest ${worst.toFixed(0)}ms  hitches ${hitches}  draw ${(performance.now() - t0).toFixed(1)}ms`;
        }
        last = now;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      meter?.remove();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resetCentre);
      window.removeEventListener("scroll", resetCentre, true);
    };
  }, [grid, ready, paint, cycleMs, shading, cell, cursorLight]);

  return (
    <>
      <span className="sr-only">{label}</span>
      <span
        ref={measureRef}
        aria-hidden
        className={GeistMono.className}
        style={{
          position: "absolute",
          visibility: "hidden",
          lineHeight: 1,
          whiteSpace: "pre",
        }}
      >
        {"M".repeat(100)}
      </span>
      <pre
        ref={preRef}
        aria-hidden
        className={GeistMono.className}
        style={{
          margin: 0,
          fontSize: grid?.fontSize ?? 7,
          lineHeight: `${cell.h}px`,
          letterSpacing: 0,
          color: "#000",
        }}
      />
    </>
  );
}
