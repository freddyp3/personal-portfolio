// Hand-rolled force simulation matching d3-force defaults:
// forceLink (distance, strength, degree bias), forceManyBody (charge,
// distanceMin/distanceMax) and forceCenter (shifts mean position to center).

export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
  tx?: number;
  ty?: number;
}

export interface SimLink {
  source: SimNode;
  target: SimNode;
  distance: number;
  strength: number;
  bias: number;
}

export interface SimulationOptions {
  cx: number;
  cy: number;
  linkDistance?: number;
  linkStrength?: number;
  charge?: number;
  distanceMin?: number;
  distanceMax?: number;
  velocityDecay?: number;
  alphaMin?: number;
  alphaDecay?: number;
  collideRadius?: number;
  collideStrength?: number;
  anchorStrength?: number;
  centerStrength?: number;
  // caps per-tick speed so strong anchors still converge exactly but the
  // motion reads as a bloom instead of a jump
  maxSpeed?: number;
  // minimum effective alpha for the anchor pull — keeps anchors converging
  // after alpha decays so a bloom lands exactly on its targets
  anchorFloor?: number;
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  onTick?: () => void;
}

const JIGGLE = () => (Math.random() - 0.5) * 1e-6;

export class Simulation {
  nodes: SimNode[];
  links: SimLink[];
  alpha = 1;
  alphaTarget = 0;
  private alphaMin: number;
  private alphaDecay: number;
  private velocityDecay: number;
  private charge: number;
  private distanceMin: number;
  private distanceMax: number;
  private cx: number;
  private cy: number;
  private collideRadius: number;
  private collideStrength: number;
  private anchorStrength: number;
  private centerStrength: number;
  maxSpeed: number;
  anchorFloor: number;
  private bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  private onTick?: () => void;
  private raf: number | null = null;
  private running = false;

  constructor(
    nodes: SimNode[],
    links: { source: SimNode; target: SimNode }[],
    opts: SimulationOptions,
  ) {
    this.nodes = nodes;
    this.cx = opts.cx;
    this.cy = opts.cy;
    this.charge = opts.charge ?? -400;
    this.distanceMin = opts.distanceMin ?? 10;
    this.distanceMax = opts.distanceMax ?? 300;
    this.velocityDecay = opts.velocityDecay ?? 0.4;
    this.alphaMin = opts.alphaMin ?? 0.001;
    this.alphaDecay = opts.alphaDecay ?? 1 - Math.pow(0.001, 1 / 300);
    this.collideRadius = opts.collideRadius ?? 0;
    this.collideStrength = opts.collideStrength ?? 0.7;
    this.anchorStrength = opts.anchorStrength ?? 0;
    this.centerStrength = opts.centerStrength ?? 1;
    this.maxSpeed = opts.maxSpeed ?? 0;
    this.anchorFloor = opts.anchorFloor ?? 0;
    this.bounds = opts.bounds;
    this.onTick = opts.onTick;

    const degree = new Map<SimNode, number>();
    this.links = links.map((l) => {
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
      return { ...l, distance: 0, strength: 0, bias: 0 };
    });
    const linkDistance = opts.linkDistance ?? 70;
    const linkStrength = opts.linkStrength ?? 0.1;
    for (const l of this.links) {
      l.distance = linkDistance;
      l.strength = linkStrength;
      l.bias =
        (degree.get(l.source) ?? 1) /
        ((degree.get(l.source) ?? 1) + (degree.get(l.target) ?? 1));
    }
  }

  setCenter(cx: number, cy: number) {
    this.cx = cx;
    this.cy = cy;
  }

  setAlphaTarget(t: number) {
    this.alphaTarget = t;
  }

  restart(alpha = 1) {
    this.alpha = alpha;
    if (!this.running) {
      this.running = true;
      const step = () => {
        if (!this.running) return;
        this.tick();
        if (this.alpha < this.alphaMin) {
          this.running = false;
          this.raf = null;
          return;
        }
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }
  }

  // synchronous pre-settle: run N ticks without RAF so the first painted
  // frame is already at equilibrium
  settle(ticks: number) {
    for (let i = 0; i < ticks; i++) this.tick();
  }

  stop() {
    this.running = false;
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private tick() {
    this.alpha += (this.alphaTarget - this.alpha) * this.alphaDecay;
    const alpha = this.alpha;

    // link force (one iteration, d3-style)
    for (const l of this.links) {
      const s = l.source;
      const t = l.target;
      let dx = t.x + t.vx - s.x - s.vx || JIGGLE();
      let dy = t.y + t.vy - s.y - s.vy || JIGGLE();
      let dist = Math.sqrt(dx * dx + dy * dy);
      const k = ((dist - l.distance) / dist) * alpha * l.strength;
      dx *= k;
      dy *= k;
      t.vx -= dx * l.bias;
      t.vy -= dy * l.bias;
      s.vx += dx * (1 - l.bias);
      s.vy += dy * (1 - l.bias);
    }

    // many-body charge, O(n^2)
    const n = this.nodes;
    const min2 = this.distanceMin * this.distanceMin;
    const max2 = this.distanceMax * this.distanceMax;
    for (let i = 0; i < n.length; i++) {
      const a = n[i];
      for (let j = 0; j < n.length; j++) {
        if (i === j) continue;
        const b = n[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 >= max2) continue;
        if (d2 === 0) {
          dx = JIGGLE();
          dy = JIGGLE();
          d2 = dx * dx + dy * dy;
        }
        if (d2 < min2) d2 = Math.sqrt(min2 * d2);
        const w = (this.charge * alpha) / d2;
        a.vx += dx * w;
        a.vy += dy * w;
      }
    }

    // collide force (d3.forceCollide-style, one iteration)
    if (this.collideRadius > 0) {
      const r = this.collideRadius * 2;
      for (let i = 0; i < n.length; i++) {
        const a = n[i];
        for (let j = i + 1; j < n.length; j++) {
          const b = n[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= r) continue;
          if (dist === 0) {
            dx = JIGGLE();
            dy = JIGGLE();
            dist = Math.sqrt(dx * dx + dy * dy);
          }
          const k = ((r - dist) / dist) * this.collideStrength * 0.5;
          dx *= k;
          dy *= k;
          a.x -= dx;
          a.y -= dy;
          b.x += dx;
          b.y += dy;
        }
      }
    }

    // anchor force: pull toward a fixed target position
    if (this.anchorStrength > 0) {
      const aAlpha = Math.max(alpha, this.anchorFloor);
      for (const node of n) {
        if (node.fx != null) continue;
        if (node.tx != null) node.vx += (node.tx - node.x) * this.anchorStrength * aAlpha;
        if (node.ty != null) node.vy += (node.ty - node.y) * this.anchorStrength * aAlpha;
      }
    }

    // bounds: soft push back inside, then a hard clamp
    if (this.bounds) {
      const { minX, maxX, minY, maxY } = this.bounds;
      for (const node of n) {
        if (node.x < minX) node.vx += (minX - node.x) * alpha * 0.5;
        if (node.x > maxX) node.vx -= (node.x - maxX) * alpha * 0.5;
        if (node.y < minY) node.vy += (minY - node.y) * alpha * 0.5;
        if (node.y > maxY) node.vy -= (node.y - maxY) * alpha * 0.5;
      }
    }

    // center force (like d3.forceCenter, strength 1)
    let sx = 0;
    let sy = 0;
    for (const node of n) {
      sx += node.x;
      sy += node.y;
    }
    sx = (sx / n.length - this.cx) * this.centerStrength;
    sy = (sy / n.length - this.cy) * this.centerStrength;
    for (const node of n) {
      node.x -= sx;
      node.y -= sy;
    }

    // integrate
    for (const node of n) {
      if (node.fx == null) node.vx *= 1 - this.velocityDecay;
      if (node.fy == null) node.vy *= 1 - this.velocityDecay;
      if (this.maxSpeed > 0 && node.fx == null && node.fy == null) {
        const sp = Math.hypot(node.vx, node.vy);
        if (sp > this.maxSpeed) {
          const k = this.maxSpeed / sp;
          node.vx *= k;
          node.vy *= k;
        }
      }
      if (node.fx != null) {
        node.x = node.fx;
        node.vx = 0;
      } else {
        node.x += node.vx;
      }
      if (node.fy != null) {
        node.y = node.fy;
        node.vy = 0;
      } else {
        node.y += node.vy;
      }
      if (this.bounds) {
        const { minX, maxX, minY, maxY } = this.bounds;
        node.x = Math.min(maxX, Math.max(minX, node.x));
        node.y = Math.min(maxY, Math.max(minY, node.y));
      }
    }

    this.onTick?.();
  }
}
