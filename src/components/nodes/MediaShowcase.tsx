"use client";

import savedLayout from "@/data/media-layout.json";
import { useCallback, useEffect, useRef, useState } from "react";
import { openLightbox } from "./Lightbox";
import { bringToFront, sendBack } from "./stack";
import styles from "./nodes.module.css";
import type { NodeMedia } from "./types";

type Place = NonNullable<NodeMedia["place"]>;

// positions saved from the layout editor (?edit=1), per node id and media
// src; they win over the defaults in data.ts
const SAVED = savedLayout as Record<string, Record<string, Place>>;

interface Item {
  media: NodeMedia;
  index: number; // media-index-1..4 slot
  closing: boolean;
}

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;

function MediaEl({
  item,
  place,
  editing,
  selected,
  onSelect,
  onChange,
}: {
  item: Item;
  place?: Place;
  editing: boolean;
  selected: boolean;
  onSelect: () => void;
  onChange: (p: Place) => void;
}) {
  const [ready, setReady] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const cls = [
    styles.mediaItem,
    styles[`mediaIndex${(item.index % 4) + 1}`],
    landscape ? styles.mediaLandscape : "",
    ready && !item.closing ? styles.showMediaItem : "",
    editing ? styles.mediaEditing : "",
    editing && selected ? styles.mediaSelected : "",
  ]
    .filter(Boolean)
    .join(" ");

  const reveal = (w: number, h: number) => {
    setLandscape(w / h > 1);
    setTimeout(() => setReady(true), 100);
  };

  const style = {
    ...(place
      ? {
          top: place.top ?? "auto",
          right: place.right ?? "auto",
          bottom: place.bottom ?? "auto",
          left: place.left ?? "auto",
          width: place.width,
          zIndex: place.z !== undefined ? place.z - 10 : undefined,
          "--rot": `${place.rotate ?? 0}deg`,
        }
      : {}),
    // no easing while editing, so the item follows the pointer exactly
    ...(editing ? { transition: "opacity 300ms" } : {}),
  } as React.CSSProperties;

  // drag the item to move it, drag the corner handle to scale it
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const el = e.currentTarget;
    const col = el.offsetParent as HTMLElement | null;
    if (!col) return;
    const scaling = (e.target as HTMLElement).dataset.handle === "scale";
    const start = {
      x: e.clientX,
      y: e.clientY,
      left: el.offsetLeft,
      top: el.offsetTop,
      width: el.offsetWidth,
    };
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (scaling) {
        onChange({
          ...place,
          left: pct(start.left, col.clientWidth),
          top: pct(start.top, col.clientHeight),
          right: undefined,
          bottom: undefined,
          width: `${Math.max(60, Math.round(start.width + dx))}px`,
        });
      } else {
        onChange({
          ...place,
          left: pct(start.left + dx, col.clientWidth),
          top: pct(start.top + dy, col.clientHeight),
          right: undefined,
          bottom: undefined,
          width: `${start.width}px`,
        });
      }
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  return (
    <div
      className={cls}
      style={style}
      data-media-src={item.media.src}
      onPointerDown={onPointerDown}
      onPointerEnter={(e) => {
        if (!editing) bringToFront(e.currentTarget);
      }}
      onPointerLeave={(e) => sendBack(e.currentTarget)}
      onClick={(e) => {
        if (!editing) openLightbox(e.currentTarget);
      }}
      role="button"
      tabIndex={-1}
    >
      {item.media.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.media.src}
          alt=""
          draggable={false}
          onLoad={(e) =>
            reveal(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
          }
        />
      ) : (
        <video
          src={item.media.src}
          data-sound={item.media.sound ? "1" : undefined}
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
          onCanPlay={(e) => {
            reveal(e.currentTarget.videoWidth, e.currentTarget.videoHeight);
            e.currentTarget.play().catch(() => {});
          }}
        />
      )}
      {editing && <span className={styles.scaleHandle} data-handle="scale" />}
    </div>
  );
}

export default function MediaShowcase({
  media,
  nodeId,
}: {
  media: NodeMedia[];
  nodeId: string | null;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const firstLoad = useRef(true);
  const key = media.map((m) => m.src).join(",");
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // layout editor: dev server only, turned on with ?edit=1
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<Record<string, Place>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    setEditing(
      process.env.NODE_ENV !== "production" &&
        new URLSearchParams(window.location.search).get("edit") === "1",
    );
  }, []);
  useEffect(() => {
    setEdits({});
    setSelected(null);
    setStatus("");
  }, [nodeId]);

  useEffect(() => {
    const hadItems = itemsRef.current.length > 0;
    setItems((prev) => prev.map((it) => ({ ...it, closing: true })));
    const delay = firstLoad.current ? 1500 : hadItems ? 400 : 0;
    firstLoad.current = false;
    const t = setTimeout(() => {
      setItems(
        media
          .slice(0, 6)
          .map((m, i) => ({ media: m, index: i, closing: false })),
      );
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const placeFor = useCallback(
    (m: NodeMedia): Place | undefined =>
      edits[m.src] ?? (nodeId ? SAVED[nodeId]?.[m.src] : undefined) ?? m.place,
    [edits, nodeId],
  );

  // the exact on-screen layout of every item on this card, as saved data
  const snapshot = useCallback(() => {
    const out: Record<string, Place> = {};
    for (const it of itemsRef.current) {
      const el = document.querySelector<HTMLElement>(
        `[data-media-src="${CSS.escape(it.media.src)}"]`,
      );
      const col = el?.offsetParent as HTMLElement | null;
      if (!el || !col) continue;
      const p = placeFor(it.media);
      out[it.media.src] = {
        left: pct(el.offsetLeft, col.clientWidth),
        top: pct(el.offsetTop, col.clientHeight),
        width: `${el.offsetWidth}px`,
        rotate: p?.rotate ?? 0,
        z: p?.z ?? 0,
      };
    }
    return out;
  }, [placeFor]);

  const save = useCallback(async () => {
    if (!nodeId) return;
    const layout = snapshot();
    setStatus("saving…");
    try {
      const res = await fetch("/api/media-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, items: layout }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus(`saved ${nodeId} → src/data/media-layout.json`);
      // eslint-disable-next-line no-console
      console.log("media layout", nodeId, layout);
    } catch (err) {
      setStatus(`save failed (${String(err)})`);
    }
  }, [nodeId, snapshot]);

  // keyboard: Enter saves; with an item selected, arrows nudge, + / - scale,
  // [ / ] tilt, F / B bring to front / send back, Esc deselects
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        save();
        return;
      }
      if (!selected) return;
      const it = itemsRef.current.find((x) => x.media.src === selected);
      const el = document.querySelector<HTMLElement>(
        `[data-media-src="${CSS.escape(selected)}"]`,
      );
      const col = el?.offsetParent as HTMLElement | null;
      if (!it || !el || !col) return;
      const cur = placeFor(it.media) ?? {};
      const base: Place = {
        ...cur,
        left: pct(el.offsetLeft, col.clientWidth),
        top: pct(el.offsetTop, col.clientHeight),
        right: undefined,
        bottom: undefined,
        width: `${el.offsetWidth}px`,
      };
      const step = e.shiftKey ? 10 : 1;
      const zs = itemsRef.current.map((x) => placeFor(x.media)?.z ?? 0);
      let next: Place | null = null;
      switch (e.key) {
        case "ArrowLeft":
          next = { ...base, left: pct(el.offsetLeft - step, col.clientWidth) };
          break;
        case "ArrowRight":
          next = { ...base, left: pct(el.offsetLeft + step, col.clientWidth) };
          break;
        case "ArrowUp":
          next = { ...base, top: pct(el.offsetTop - step, col.clientHeight) };
          break;
        case "ArrowDown":
          next = { ...base, top: pct(el.offsetTop + step, col.clientHeight) };
          break;
        case "+":
        case "=":
          next = { ...base, width: `${Math.round(el.offsetWidth * 1.05)}px` };
          break;
        case "-":
        case "_":
          next = {
            ...base,
            width: `${Math.max(60, Math.round(el.offsetWidth / 1.05))}px`,
          };
          break;
        case "[":
        case "{":
          next = { ...base, rotate: (cur.rotate ?? 0) - (e.shiftKey ? 5 : 1) };
          break;
        case "]":
        case "}":
          next = { ...base, rotate: (cur.rotate ?? 0) + (e.shiftKey ? 5 : 1) };
          break;
        case "f":
        case "F":
          next = { ...base, z: Math.max(...zs) + 1 };
          break;
        case "b":
        case "B":
          next = { ...base, z: Math.min(...zs) - 1 };
          break;
        case "Escape":
          setSelected(null);
          return;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
      setEdits((m) => ({ ...m, [selected]: next! }));
    };
    // capture phase so the map's own Escape/arrow handling doesn't run first
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editing, selected, save, placeFor]);

  const sel = selected ? placeFor({ type: "image", src: selected }) : undefined;

  return (
    <>
      {items.map((it) => (
        <MediaEl
          key={it.media.src + it.index}
          item={it}
          place={placeFor(it.media)}
          editing={editing}
          selected={selected === it.media.src}
          onSelect={() => {
            setSelected(it.media.src);
            const z = placeFor(it.media)?.z ?? 0;
            const max = Math.max(
              0,
              ...itemsRef.current
                .filter((x) => x.media.src !== it.media.src)
                .map((x) => placeFor(x.media)?.z ?? 0),
            );
            if (z <= max)
              setEdits((m) => ({
                ...m,
                [it.media.src]: { ...placeFor(it.media), z: max + 1 },
              }));
          }}
          onChange={(p) =>
            setEdits((m) => ({
              ...m,
              [it.media.src]: { ...p, z: m[it.media.src]?.z ?? p.z },
            }))
          }
        />
      ))}
      {editing && (
        <div className={styles.layoutToolbar}>
          <strong>layout editor</strong> · {nodeId ?? "no card open"}
          {"\n"}drag: move · drag corner: scale · [ ]: tilt (shift ×5)
          {"\n"}+ / −: scale · arrows: nudge (shift ×10) · F / B: front / back
          {"\n"}Enter: save this card
          {selected && sel
            ? `\n\n${selected.replace("/img/", "")}\n` +
              `left ${sel.left ?? "-"} top ${sel.top ?? "-"} ` +
              `width ${sel.width ?? "-"} tilt ${sel.rotate ?? 0}° z ${sel.z ?? 0}`
            : ""}
          {status ? `\n\n${status}` : ""}
        </div>
      )}
    </>
  );
}
