"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { GRAPH, LAYOUT, LAYOUT_NUDGE, visibleTree } from "./data";
import MediaShowcase from "./MediaShowcase";
import styles from "./nodes.module.css";
import Panel from "./Panel";
import SiteNav from "../SiteNav";
import { NodeShape } from "./shapes";
import { Simulation, type SimNode } from "./simulation";

const NODE_SIZE = 36;

interface DragState {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  offsetX: number;
  offsetY: number;
}

export default function NodePortfolio() {
  const graph = GRAPH;
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  // initialized false so SSR and the first client render agree (hydration);
  // corrected in useLayoutEffect before paint, while nodes are still hidden
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });
  const [fontsReady, setFontsReady] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation | null>(null);
  const positionsRef = useRef<Map<string, SimNode>>(new Map());
  const nodeEls = useRef<Map<string, HTMLElement>>(new Map());
  const linkEls = useRef<Map<string, SVGPathElement>>(new Map());
  const curveDirs = useRef<Map<string, number>>(new Map());
  const prevNodes = useRef<Set<string>>(new Set());
  const prevLinks = useRef<Set<string>>(new Set());
  const dragRef = useRef<DragState | null>(null);
  // center offset of the settled full graph vs the raw map-area center,
  // reused so the collapsed view shares the same center
  const centerOffsetRef = useRef({ x: 0, y: 0 });
  // distinguishes the first sim run (static, pre-settled) from user-triggered
  // navigations, which bloom out from the map center like the reference
  const simRunRef = useRef<{ id: string | null; count: number }>({
    id: null,
    count: 0,
  });
  // set when currentId changes due to a URL navigation (nav link, back/
  // forward, deep link) rather than a map/panel click — those take the
  // static pre-settle path instead of blooming
  const staticNavRef = useRef(false);
  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;

  // --- helpers -----------------------------------------------------------

  const pushUrl = useCallback((id: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("node", id);
    else params.delete("node");
    params.delete("hint"); // the "click me" hint is only for the first view
    const qs = params.toString();
    window.history.pushState(
      { node: id },
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  }, []);

  const openNode = useCallback(
    (id: string, push = true) => {
      if (!graph.nodes[id] || id === graph.rootId) return;
      setCurrentId(id);
      if (id !== "about") setVisited((v) => new Set(v).add(id));
      if (push) pushUrl(id);
    },
    [pushUrl, graph],
  );

  const closeAll = useCallback(
    (push = true) => {
      setCurrentId(null);
      if (push) pushUrl(null);
    },
    [pushUrl],
  );

  const handleActivate = useCallback(
    (id: string) => {
      setHintDismissed(true);
      if (id === graph.rootId || id === currentIdRef.current) {
        closeAll();
      } else {
        openNode(id);
      }
    },
    [openNode, closeAll, graph.rootId],
  );

  // --- environment ---------------------------------------------------------

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1200px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // URL is the source of truth for the open node: deep links, back/forward
  // and the SiteNav "Node view" link all flow through here. Clicks inside the
  // component already set currentId, so this only fires for external nav.
  const searchParams = useSearchParams();
  // "click me" arrow on the orange root node, shown when arriving through the
  // site nav's About link from another page; gone after the first node click
  const [hintDismissed, setHintDismissed] = useState(false);
  const showHint = searchParams.get("hint") === "1" && !hintDismissed;
  useEffect(() => {
    const p = searchParams.get("node");
    const id = p && graph.nodes[p] && p !== graph.rootId ? p : null;
    if (id !== currentIdRef.current) {
      staticNavRef.current = true;
      if (id) {
        setCurrentId(id);
        // About me is never struck through as visited
        if (id !== "about") setVisited((v) => new Set(v).add(id));
      } else {
        setCurrentId(null);
      }
    }
  }, [searchParams, graph]);

  // escape closes the open page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !currentIdRef.current) return;
      if (document.querySelector(`.${styles.gallery}`)) return; // lightbox open
      closeAll();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeAll]);

  // --- map sizing ----------------------------------------------------------

  useEffect(() => {
    const measure = () => {
      const el = mapRef.current;
      if (!el) return;
      setMapSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isMobile]);

  // gate the first layout pass on fonts so label widths (and therefore the
  // bbox fit) are final when computed — capped so a stuck font can't block
  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (!cancelled) setFontsReady(true);
    };
    if (document.fonts.status === "loaded") done();
    else {
      document.fonts.ready.then(done);
      const t = setTimeout(done, 1500);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // --- simulation ----------------------------------------------------------

  const { nodes: visNodes, links: visLinks } = useMemo(
    () => visibleTree(graph, currentId),
    [graph, currentId],
  );

  // ids of the hovered node + its ancestor chain, and the tree links between
  // them; null when the hovered node isn't on the map (e.g. collapsed view)
  const hoverPath = useMemo(() => {
    if (!hoveredId || !visNodes.some((n) => n.id === hoveredId)) return null;
    const ids = new Set<string>();
    let cur: string | null = hoveredId;
    while (cur) {
      ids.add(cur);
      cur = graph.nodes[cur]?.parentId ?? null;
    }
    const keys = new Set(
      visLinks
        .filter((l) => ids.has(l.sourceId) && ids.has(l.targetId))
        .map((l) => l.key),
    );
    return { ids, keys };
  }, [hoveredId, visNodes, visLinks, graph]);

  // a panel row unmounts when its click swaps the panel content, so its
  // mouseleave never fires — drop the stale hover whenever the view changes
  useEffect(() => setHoveredId(null), [currentId]);

  // hover classes are applied imperatively — the stagger effect also manages
  // classes via classList, and React className writes would clobber them
  useEffect(() => {
    mapRef.current?.classList.toggle(styles.hasHover, !!hoverPath);
    nodeEls.current.forEach((el, id) => {
      el.classList.toggle(styles.inHoverPath, !!hoverPath?.ids.has(id));
      el.classList.toggle(styles.hoverNode, !!hoverPath && id === hoveredId);
    });
    linkEls.current.forEach((el, key) => {
      el.classList.toggle(styles.inHoverPath, !!hoverPath?.keys.has(key));
    });
  }, [hoverPath, hoveredId]);

  useEffect(() => {
    if (!mapSize.w || !mapSize.h || !fontsReady) return;
    const positions = positionsRef.current;
    const anchored = !currentId;
    // a run triggered by currentId actually changing (open/close/switch) is a
    // user navigation → discard positions and bloom; re-runs for the same
    // view (resize, isMobile, fonts) keep the static pre-settle path
    const run = simRunRef.current;
    const isNav =
      run.count > 0 && run.id !== currentId && !staticNavRef.current;
    staticNavRef.current = false;
    simRunRef.current = { id: currentId, count: run.count + 1 };
    if (isNav) positions.clear();

    // map area: desktop reserves the right side for the panel card and the
    // bottom for the site nav; on mobile the whole map box is used.
    let ax0: number, ax1: number, ay0: number, ay1: number;
    if (isMobile) {
      ax0 = 0;
      ax1 = mapSize.w;
      ay0 = 0;
      ay1 = mapSize.h;
    } else {
      const m = 0.06 * window.innerWidth;
      ax0 = m;
      ax1 = window.innerWidth - m - 420 - 0.04 * window.innerWidth;
      ay0 = 56;
      ay1 = mapSize.h - 140;
    }
    const areaW = ax1 - ax0;
    const areaH = ay1 - ay0;
    // separate x/y scales: fill the area vertically too; x needs room for
    // the widest single-line label (~200px) at the outermost nodes.
    const sx = Math.min(
      areaW / (840 + 200),
      // on stacked screens scale the LAYOUT extents (x range 965, y range
      // 670) into the map box so anchors don't land outside the bounds
      isMobile
        ? Math.min((mapSize.w - 68) / 965, Number.POSITIVE_INFINITY)
        : 1.25,
    );
    const sy = Math.min(
      areaH / (600 + 120),
      sx * 1.3,
      isMobile ? (mapSize.h - 68) / 670 : Number.POSITIVE_INFINITY,
    );

    // same map-area center and bounds in both full and collapsed states;
    // on desktop the settled full graph is fitted into [ax0, ax1 - 40] (the
    // correction is measured after settling, below) and the collapsed view
    // reuses that center via centerOffsetRef
    let cx = (ax0 + ax1) / 2;
    let cy = (ay0 + ay1) / 2;
    if (!isMobile && !anchored) {
      cx += centerOffsetRef.current.x;
      cy += centerOffsetRef.current.y;
    }

    const anchorTarget = (id: string): [number, number] | undefined => {
      const o = LAYOUT[id];
      if (!o) return undefined;
      return [cx + o[0] * sx - NODE_SIZE / 2, cy + o[1] * sy - NODE_SIZE / 2];
    };

    // deterministic seeding: root at center; root children on a ring; a
    // path's children fanned on an arc pointing away from the root; anything
    // else spawns near its parent. In the full map every node is anchored to
    // its LAYOUT offset and seeds exactly there. Only seeds nodes with no
    // stored position.
    const r1 = isMobile ? 70 : 140;
    const r2 = isMobile ? 45 : 90;
    const rootKids = graph.nodes[graph.rootId].childIds;
    const simNodes: SimNode[] = visNodes.map((vn) => {
      let sn = positions.get(vn.id);
      const anchor = anchored ? anchorTarget(vn.id) : undefined;
      if (!sn) {
        let x: number;
        let y: number;
        if (anchor) {
          x = anchor[0];
          y = anchor[1];
        } else if (vn.id === graph.rootId) {
          x = cx - NODE_SIZE / 2;
          y = cy - NODE_SIZE / 2;
        } else if (vn.data.parentId === graph.rootId) {
          const i = Math.max(0, rootKids.indexOf(vn.id));
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / rootKids.length;
          x = cx - NODE_SIZE / 2 + r1 * Math.cos(a);
          y = cy - NODE_SIZE / 2 + r1 * Math.sin(a);
        } else {
          const parent = vn.data.parentId
            ? positions.get(vn.data.parentId)
            : undefined;
          const parentData = vn.data.parentId
            ? graph.nodes[vn.data.parentId]
            : undefined;
          if (parent && parentData?.type === "path") {
            const sibs = parentData.childIds;
            const i = Math.max(0, sibs.indexOf(vn.id));
            const d = Math.atan2(
              parent.y + NODE_SIZE / 2 - cy,
              parent.x + NODE_SIZE / 2 - cx,
            );
            const a = d + (i - (sibs.length - 1) / 2) * 0.55;
            x = parent.x + r2 * Math.cos(a);
            y = parent.y + r2 * Math.sin(a);
          } else {
            const jx = (Math.random() - 0.5) * 60;
            const jy = (Math.random() - 0.5) * 60;
            x = parent ? parent.x + jx : cx - NODE_SIZE / 2 + jx;
            y = parent ? parent.y + jy : cy - NODE_SIZE / 2 + jy;
          }
        }
        sn = { id: vn.id, x, y, vx: 0, vy: 0 };
        positions.set(vn.id, sn);
      }
      sn.tx = anchor?.[0];
      sn.ty = anchor?.[1];
      return sn;
    });

    const byId = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks = visLinks
      .map((l) => ({
        source: byId.get(l.sourceId)!,
        target: byId.get(l.targetId)!,
      }))
      .filter((l) => l.source && l.target);

    const paint = () => {
      for (const l of visLinks) {
        const path = linkEls.current.get(l.key);
        const s = byId.get(l.sourceId);
        const t = byId.get(l.targetId);
        if (!path || !s || !t) continue;
        if (!curveDirs.current.has(l.key)) {
          curveDirs.current.set(l.key, s.y > t.y ? -30 : 30);
        }
        const c = curveDirs.current.get(l.key)!;
        const h = NODE_SIZE / 2;
        let d: string;
        if (l.targetType === "path" && !l.isConnected) {
          const x1 = s.x + (t.x - s.x) / 3;
          const y1 = s.y + (t.y - s.y) / 3 + c;
          const x2 = s.x + (2 * (t.x - s.x)) / 3;
          const y2 = s.y + (t.y - s.y) / 3 + c;
          d = `M${s.x + h},${s.y + h} L${x1 + h},${y1 + h} L${x2 + h},${y2 + h} L${t.x + h},${t.y + h}`;
        } else {
          d = `M${s.x + h},${s.y + h} L${t.x + h},${t.y + h}`;
        }
        path.setAttribute("d", d);
      }
      for (const n of simNodes) {
        const el = nodeEls.current.get(n.id);
        if (el) {
          el.style.left = `${n.x}px`;
          el.style.top = `${n.y}px`;
        }
      }
    };

    // d3-style phyllotaxis seed: nodes spawn clustered around the final
    // arrangement's centroid and bloom outward while the sim animates —
    // seeding at the raw area center would read as a sideways glide
    const seedSpiral = (scx: number, scy: number) => {
      // the finite phyllotaxis pattern isn't centered — subtract its own
      // centroid so the seed cluster is centered exactly on (scx, scy) and
      // the bloom expands in place
      const offs = simNodes.map((_, i) => {
        const r = 10 * Math.sqrt(0.5 + i);
        const a = i * Math.PI * (3 - Math.sqrt(5));
        return [r * Math.cos(a), r * Math.sin(a)] as const;
      });
      const ox = offs.reduce((s, o) => s + o[0], 0) / offs.length;
      const oy = offs.reduce((s, o) => s + o[1], 0) / offs.length;
      simNodes.forEach((sn, i) => {
        sn.x = scx + offs[i][0] - ox - NODE_SIZE / 2;
        sn.y = scy + offs[i][1] - oy - NODE_SIZE / 2;
        sn.vx = 0;
        sn.vy = 0;
        delete sn.fx;
        delete sn.fy;
      });
    };

    simRef.current?.stop();
    const sim = new Simulation(simNodes, simLinks, {
      cx,
      cy,
      linkDistance: anchored ? sx * 200 : isMobile ? 30 : 70,
      linkStrength: 0.1,
      charge: anchored ? -60 : -400,
      distanceMin: 10,
      distanceMax: 300,
      collideRadius: isMobile ? 22 : 44,
      // anchored blooms skip collide: several LAYOUT targets sit closer than
      // 2*collideRadius, so collide would hold nodes off their anchors
      collideStrength: anchored && isNav ? 0 : 0.7,
      alphaMin: isNav ? 1e-6 : 0.001,
      anchorStrength: anchored ? 0.45 : 0,
      centerStrength: anchored ? 0 : 1,
      bounds: isMobile
        ? {
            minX: 16,
            maxX: mapSize.w - 16 - NODE_SIZE,
            minY: 16,
            maxY: mapSize.h - 16 - NODE_SIZE,
          }
        : {
            minX: ax0,
            maxX: ax1 - NODE_SIZE,
            minY: ay0,
            maxY: ay1 - NODE_SIZE,
          },
      onTick: paint,
    });
    simRef.current = sim;
    if (anchored) {
      // pre-settle synchronously so the first painted frame is already at
      // equilibrium — no visible glide on load; the sim then idles until a
      // drag restarts it
      sim.alpha = 0.6;
      sim.settle(400);
      paint();
      // fit the real bbox of nodes+labels into the target box:
      // desktop [ax0, ax1 - 40] x [ay0, ay1]; stacked = map box inset.
      // On stacked labels are display:none, so zero-size rects are skipped.
      // scale down uniformly if needed (never up), then translate so the
      // bbox is centered in the target box. Settling re-drifts positions a
      // few px, so iterate the measure->correct->settle pass until the bbox
      // sits inside — all synchronous, before first paint
      const mapBox = mapRef.current?.getBoundingClientRect();
      const tx0 = isMobile ? (mapBox?.left ?? 0) + 16 : ax0;
      const tx1 = isMobile ? (mapBox?.right ?? mapSize.w) - 16 : ax1 - 40;
      const ty0 = isMobile ? (mapBox?.top ?? 0) + 16 : ay0;
      const ty1 = isMobile ? (mapBox?.bottom ?? mapSize.h) - 16 : ay1;
      const measure = () => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        nodeEls.current.forEach((el) => {
          const r = el.getBoundingClientRect();
          const lab = el
            .querySelector(`.${styles.nodeLabel}`)
            ?.getBoundingClientRect();
          const labValid = lab && lab.width > 0 && lab.height > 0;
          minX = Math.min(minX, r.left, labValid ? lab.left : r.left);
          maxX = Math.max(maxX, r.right, labValid ? lab.right : r.right);
          minY = Math.min(minY, r.top, labValid ? lab.top : r.top);
          maxY = Math.max(maxY, r.bottom, labValid ? lab.bottom : r.bottom);
        });
        return { minX, minY, maxX, maxY };
      };
      for (let iter = 0; iter < 4; iter++) {
        const b = measure();
        const insideX = b.minX >= tx0 - 0.5 && b.maxX <= tx1 + 0.5;
        const insideY = b.minY >= ty0 - 0.5 && b.maxY <= ty1 + 0.5;
        if (insideX && insideY) break;
        // 6px buffer so post-correction settle drift can't re-breach
        const s = Math.min(
          1,
          (tx1 - tx0 - 6) / Math.max(1, b.maxX - b.minX),
          (ty1 - ty0 - 6) / Math.max(1, b.maxY - b.minY),
        );
        const bx = (b.minX + b.maxX) / 2;
        const by = (b.minY + b.maxY) / 2;
        const tcx = (tx0 + tx1) / 2;
        const tcy = (ty0 + ty1) / 2;
        for (const sn of simNodes) {
          sn.x = tcx + (sn.x - bx) * s;
          sn.y = tcy + (sn.y - by) * s;
          if (sn.tx != null) sn.tx = tcx + (sn.tx - bx) * s;
          if (sn.ty != null) sn.ty = tcy + (sn.ty - by) * s;
        }
        sim.settle(80);
        paint();
        centerOffsetRef.current = { x: tcx - cx, y: tcy - cy };
      }
      // final exact translate for any residual settle-drift breach
      const b = measure();
      let ddx = 0;
      let ddy = 0;
      if (b.minX < tx0) ddx = tx0 - b.minX;
      else if (b.maxX > tx1) ddx = tx1 - b.maxX;
      if (b.minY < ty0) ddy = ty0 - b.minY;
      else if (b.maxY > ty1) ddy = ty1 - b.maxY;
      if (ddx || ddy) {
        for (const sn of simNodes) {
          sn.x += ddx;
          sn.y += ddy;
          if (sn.tx != null) sn.tx += ddx;
          if (sn.ty != null) sn.ty += ddy;
        }
        centerOffsetRef.current.x += ddx;
        centerOffsetRef.current.y += ddy;
        paint();
      }
      // centroid of the settled equilibrium (what the bloom actually
      // converges to — charge/links offset it from the raw anchor mean).
      // Run a deep invisible settle with the same anchorFloor the bloom
      // uses so the estimate matches the animated convergence point
      sim.anchorFloor = 0.15;
      sim.settle(300);
      let eqx = 0;
      let eqy = 0;
      for (const sn of simNodes) {
        eqx += sn.x;
        eqy += sn.y;
      }
      eqx /= simNodes.length;
      eqy /= simNodes.length;
      // land exactly on the fitted anchors — settle drift leaves residuals
      // that would otherwise differ from the post-bloom arrangement.
      // Anchors that fall outside the sim bounds (stacked layout, where the
      // fit can break early without transforming them) are clamped first so
      // snapped positions and bloom targets stay inside the map
      const bx0 = isMobile ? 16 : ax0;
      const bx1 = isMobile ? mapSize.w - 16 - NODE_SIZE : ax1 - NODE_SIZE;
      const by0 = isMobile ? 16 : ay0;
      const by1 = isMobile ? mapSize.h - 16 - NODE_SIZE : ay1 - NODE_SIZE;
      for (const sn of simNodes) {
        if (sn.tx != null) {
          sn.tx = Math.min(bx1, Math.max(bx0, sn.tx));
          sn.ty = Math.min(by1, Math.max(by0, sn.ty!));
          sn.x = sn.tx;
          sn.y = sn.ty!;
        }
        sn.vx = 0;
        sn.vy = 0;
      }
      // post-snap correction: snapped positions sit on the raw anchors,
      // which are offset from the settled positions the fit measured —
      // re-measure and translate/scale positions+anchors together until
      // the real (post-snap) bbox sits inside the target box
      for (let iter = 0; iter < 6; iter++) {
        const b = measure();
        if (
          b.minX >= tx0 - 0.5 &&
          b.maxX <= tx1 + 0.5 &&
          b.minY >= ty0 - 0.5 &&
          b.maxY <= ty1 + 0.5
        )
          break;
        const s = Math.min(
          1,
          (tx1 - tx0 - 6) / Math.max(1, b.maxX - b.minX),
          (ty1 - ty0 - 6) / Math.max(1, b.maxY - b.minY),
        );
        const bx = (b.minX + b.maxX) / 2;
        const by = (b.minY + b.maxY) / 2;
        const tcx = (tx0 + tx1) / 2;
        const tcy = (ty0 + ty1) / 2;
        for (const sn of simNodes) {
          sn.x = tcx + (sn.x - bx) * s;
          sn.y = tcy + (sn.y - by) * s;
          if (sn.tx != null) sn.tx = tcx + (sn.tx - bx) * s;
          if (sn.ty != null) sn.ty = tcy + (sn.ty - by) * s;
        }
        // measure() reads DOM rects — repaint before the next iteration
        paint();
      }
      // hand nudges go on after the fit so they move only their own node —
      // putting them in LAYOUT would re-center the whole graph
      for (const sn of simNodes) {
        const n = LAYOUT_NUDGE[sn.id];
        if (!n || sn.tx == null || sn.ty == null) continue;
        sn.tx += n[0] * sx;
        sn.ty += n[1] * sy;
        sn.x = sn.tx;
        sn.y = sn.ty;
      }
      paint();
      if (isNav) {
        // bloom: anchors already hold the fitted targets — reseed on the
        // spiral and let the sim animate the full map back into place.
        // the speed cap keeps the strong anchor pull from teleporting;
        // the floor keeps it converging after alpha decays so it lands
        // exactly on the fitted arrangement
        sim.maxSpeed = 7;
        sim.anchorFloor = 0.15;
        // seed around the settled-equilibrium centroid (not the raw anchor
        // mean) so the bloom expands in place instead of translating;
        // seedSpiral's center is a node rect center, so re-add NODE_SIZE/2
        seedSpiral(eqx + NODE_SIZE / 2, eqy + NODE_SIZE / 2);
        paint();
        sim.restart(1);
      }
    } else if (isNav) {
      // collapsed view: bloom from the center with the reference forces;
      // cx/cy already include the fitted offset, i.e. the point the center
      // force pulls to
      sim.maxSpeed = 7;
      sim.anchorFloor = 0.15;
      seedSpiral(cx, cy);
      paint();
      sim.restart(1);
    } else {
      // first load / resize: settle synchronously so the first painted
      // frame is already at equilibrium — no glide
      sim.alpha = 1;
      sim.settle(400);
      paint();
    }

    return () => sim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, mapSize.w, mapSize.h, isMobile, fontsReady]);

  // --- stagger classes -----------------------------------------------------

  useEffect(() => {
    let delay = 500;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const vn of visNodes) {
      const el = nodeEls.current.get(vn.id);
      if (!el) continue;
      if (prevNodes.current.has(vn.id)) {
        el.classList.add(styles.previouslyVisible);
      } else {
        const t = setTimeout(() => {
          el.classList.add(styles.newlyVisible);
        }, delay);
        timers.push(t);
        delay += 100;
      }
    }
    delay = 1000;
    for (const l of visLinks) {
      const el = linkEls.current.get(l.key);
      if (!el) continue;
      if (prevLinks.current.has(l.key)) {
        el.classList.add(styles.previouslyVisible);
      } else {
        const t = setTimeout(() => {
          el.classList.add(styles.newlyVisible);
        }, delay);
        timers.push(t);
        delay += 100;
      }
    }
    prevNodes.current = new Set(visNodes.map((n) => n.id));
    prevLinks.current = new Set(visLinks.map((l) => l.key));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, isMobile]);

  // --- drag ------------------------------------------------------------------

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    const sn = positionsRef.current.get(id);
    if (!sn) return;
    dragRef.current = {
      id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      offsetX: e.clientX - sn.x,
      offsetY: e.clientY - sn.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (
      !d.moved &&
      Math.hypot(e.clientX - d.startX, e.clientY - d.startY) >= 4
    ) {
      d.moved = true;
      simRef.current?.setAlphaTarget(0.3);
      simRef.current?.restart(0.3);
    }
    if (d.moved) {
      const sn = positionsRef.current.get(d.id);
      if (sn) {
        sn.fx = e.clientX - d.offsetX;
        sn.fy = e.clientY - d.offsetY;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    const sn = positionsRef.current.get(d.id);
    if (sn) {
      sn.fx = null;
      sn.fy = null;
    }
    simRef.current?.setAlphaTarget(0);
    if (!d.moved) handleActivate(d.id);
  };

  // --- render ----------------------------------------------------------------

  const currentNode = currentId ? graph.nodes[currentId] : null;

  return (
    <div className={styles.root}>
      <div ref={mapRef} className={styles.mapContainer}>
        <svg
          className={styles.mapLines}
          width={mapSize.w}
          height={mapSize.h}
          aria-hidden
        >
          {visLinks.map((l) => {
            const cls = [
              styles.link,
              l.isConnected ? styles.connectedLink : "",
              l.targetType === "experience" ? styles.secondaryLink : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <path
                key={l.key}
                className={cls}
                ref={(el) => {
                  if (el) linkEls.current.set(l.key, el);
                  else linkEls.current.delete(l.key);
                }}
              />
            );
          })}
        </svg>

        {visNodes.map((vn) => {
          const isCurrent = vn.id === currentId;
          const isRoot = vn.id === graph.rootId;
          const cls = [
            styles.node,
            isRoot ? styles.rootNode : "",
            vn.data.type === "info" ? styles.informationNode : "",
            vn.data.type === "home" ? styles.homeNode : "",
            styles[`nodeType_${vn.data.type}`] ?? "",
            isCurrent ? styles.currentNode : "",
            vn.isConnected ? styles.connectedNode : "",
            visited.has(vn.id) ? styles.visited : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div
              key={vn.id}
              role="button"
              tabIndex={0}
              aria-label={vn.data.title}
              className={cls}
              ref={(el) => {
                if (el) nodeEls.current.set(vn.id, el);
                else nodeEls.current.delete(vn.id);
              }}
              onPointerDown={(e) => onPointerDown(e, vn.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerEnter={() => {
                if (!dragRef.current) setHoveredId(vn.id);
              }}
              onPointerLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(vn.id)}
              onBlur={() => setHoveredId(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleActivate(vn.id);
                }
              }}
            >
              <div className={styles.nodeInner}>
                <NodeShape
                  type={vn.data.type}
                  state={
                    isCurrent
                      ? "current"
                      : vn.isConnected
                        ? "connected"
                        : "normal"
                  }
                />
              </div>
              {isRoot && showHint ? (
                <span className={styles.clickHint} aria-hidden>
                  <span className={styles.clickHintArrow}>←</span> click me
                </span>
              ) : null}
              <span className={styles.nodeLabel}>
                <span>
                  <h2>{vn.data.title}</h2>
                  {vn.data.subtitle ? (
                    <>
                      <br />
                      <h3>{vn.data.subtitle}</h3>
                    </>
                  ) : null}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.page}>
        {!isMobile && (
          <MediaShowcase
            media={currentNode?.media ?? []}
            nodeId={currentNode?.id ?? null}
          />
        )}
        <Panel
          node={currentNode}
          graph={graph}
          visited={visited}
          isMobile={isMobile}
          onOpen={(id) => openNode(id)}
          onClose={closeAll}
          hoveredId={hoveredId}
          onHover={setHoveredId}
        />
      </div>

      <SiteNav active="nodes" variant="nodes" />
    </div>
  );
}
