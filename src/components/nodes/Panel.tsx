"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Graph } from "./data";
import { openLightbox } from "./Lightbox";
import { bringToFront, sendBack } from "./stack";
import { TabIcon } from "./shapes";
import styles from "./nodes.module.css";
import type { NodeMedia, PortfolioNode } from "./types";

interface PanelProps {
  node: PortfolioNode | null;
  graph: Graph;
  visited: Set<string>;
  isMobile: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

const TYPE_NAMES: Record<PortfolioNode["type"], string> = {
  home: "Index",
  info: "Information",
  path: "Skill",
  experience: "Experience",
  hackathon: "Hackathon",
  project: "Project",
  education: "Education",
};

function ItemLink({
  id,
  graph,
  visited,
  onOpen,
  hovered,
  onHover,
}: {
  id: string;
  graph: Graph;
  visited: Set<string>;
  onOpen: (id: string) => void;
  hovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const n = graph.nodes[id];
  if (!n) return null;
  const cls = `${styles.indexLink} ${visited.has(id) ? styles.visited : ""} ${
    hovered ? styles.rowHovered : ""
  }`;
  return (
    <li>
      <a
        className={cls}
        href={`?node=${id}`}
        onClick={(e) => {
          e.preventDefault();
          onOpen(id);
        }}
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(id)}
        onBlur={() => onHover(null)}
      >
        <span className={styles.itemId} />
        <span className={styles.itemTitle}>
          <h2>{n.panelTitle ?? n.title}</h2>
          {/* skills show no subtitle in the panel (the map keeps it) */}
          {n.subtitle && n.type !== "path" ? (
            <h3>{n.panelSubtitle ?? n.subtitle}</h3>
          ) : null}
        </span>
      </a>
    </li>
  );
}

function GroupedList({
  ids,
  graph,
  visited,
  onOpen,
  hoveredId,
  onHover,
  children,
}: {
  ids: string[];
  graph: Graph;
  visited: Set<string>;
  onOpen: (id: string) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  children?: React.ReactNode;
}) {
  const rows: React.ReactNode[] = [];
  let lastGroup: string | undefined;
  ids.forEach((id) => {
    const g = graph.nodes[id]?.group;
    if (g && g !== lastGroup) {
      rows.push(
        <li key={`g-${g}`} className={styles.yearGroup}>
          {g}
        </li>,
      );
      lastGroup = g;
    }
    rows.push(
      <ItemLink
        key={id}
        id={id}
        graph={graph}
        visited={visited}
        onOpen={onOpen}
        hovered={hoveredId === id}
        onHover={onHover}
      />,
    );
  });
  return (
    <ul className={styles.list}>
      {rows}
      {children}
    </ul>
  );
}

interface Tab {
  key: string;
  icon: string;
  title: string;
  content: React.ReactNode;
}

function Accordion({
  tabs,
  open,
  setOpen,
  onMeasure,
}: {
  tabs: Tab[];
  open: string | null;
  setOpen: (k: string | null) => void;
  onMeasure: () => void;
}) {
  return (
    <>
      {tabs.map((t) => (
        <div
          key={t.key}
          className={`${styles.pageTab} ${open === t.key ? styles.tabOpen : ""}`}
        >
          <div
            className={styles.tabTitles}
            role="button"
            tabIndex={0}
            onClick={() => {
              setOpen(open === t.key ? null : t.key);
              onMeasure();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(open === t.key ? null : t.key);
                onMeasure();
              }
            }}
          >
            <span className={styles.tabIcon}>
              <TabIcon kind={t.icon} />
            </span>
            <span className={styles.tabTitle}>{t.title}</span>
            <span className={styles.tabIndicator} />
          </div>
          <div className={styles.tabContent}>{t.content}</div>
        </div>
      ))}
    </>
  );
}

function MobileMedia({ media }: { media: NodeMedia[] }) {
  return (
    <ul className={styles.list}>
      {media.map((m) => (
        <li key={m.src}>
          <div
            className={`${styles.mediaItem} ${styles.showMediaItem}`}
            onClick={(e) => openLightbox(e.currentTarget)}
          >
            {m.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.src} alt="" />
            ) : (
              <video
                src={m.src}
                data-sound={m.sound ? "1" : undefined}
                autoPlay
                muted
                playsInline
                loop
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Panel({
  node,
  graph,
  visited,
  isMobile,
  onOpen,
  onClose,
  hoveredId,
  onHover,
}: PanelProps) {
  const pageOpen = !!node;
  const [openTab, setOpenTab] = useState<string | null>(graph.defaultTab);
  const [height, setHeight] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const [measureTick, setMeasureTick] = useState(0);
  // height transitions are enabled only after mount so the card renders at
  // its final height on the first frame instead of growing from 0
  const [animReady, setAnimReady] = useState(false);
  useEffect(() => setAnimReady(true), []);

  const onMeasure = () => {
    // let the DOM update (tab open/close) before measuring
    setTimeout(() => setMeasureTick((v) => v + 1), 0);
  };

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const max = window.innerHeight - 100;
    const target = Math.min(inner.scrollHeight, max);
    setHeight(target);
    setScrollable(inner.scrollHeight > max);
  }, [node, openTab, isMobile, measureTick]);

  // reset the open accordion tab whenever the view changes
  useLayoutEffect(() => {
    setOpenTab(node ? defaultPageTab(node, isMobile) : graph.defaultTab);
  }, [node, isMobile, graph.defaultTab]);

  const indexTabs: Tab[] = [
    {
      key: "index",
      icon: "home",
      title: "Index",
      content: (
        <p>
          Fredrik Pettit studies computer science at the University of British
          Columbia and builds AI agents, machine learning systems and backend
          services.{" "}
          <a
            href="?node=about"
            onClick={(e) => {
              e.preventDefault();
              onOpen("about");
            }}
          >
            More information
          </a>
          .
        </p>
      ),
    },
    ...graph.sections.map((s) => ({
      key: s.key,
      icon: s.icon,
      title: s.title,
      content: (
        <>
          <GroupedList
            ids={s.ids}
            graph={graph}
            visited={visited}
            onOpen={onOpen}
            hoveredId={hoveredId}
            onHover={onHover}
          >
            {s.more ? (
              <li>
                <Link className={styles.indexLink} href={s.more.href}>
                  <span className={styles.itemId} />
                  <span className={styles.itemTitle}>
                    <h2>{s.more.label} →</h2>
                  </span>
                </Link>
              </li>
            ) : null}
          </GroupedList>
        </>
      ),
    })),
  ];

  const pageTabs: Tab[] = node
    ? buildPageTabs(node, graph, visited, isMobile, onOpen, hoveredId, onHover)
    : [];

  return (
    <div
      className={`${styles.pageContainer} ${scrollable ? styles.showGradient : ""}`}
      // hovering the card's visible part brings it back above any media
      onPointerEnter={(e) => bringToFront(e.currentTarget)}
      onPointerLeave={(e) => sendBack(e.currentTarget)}
    >
      <button
        className={styles.headerContent}
        style={{ display: pageOpen ? "block" : "none" }}
        onClick={onClose}
      >
        <div className={styles.pageTitles}>
          <div className={`${styles.tabTitles} ${styles.pageTitlesType}`}>
            <span className={styles.tabIcon}>
              <TabIcon kind="home" />
            </span>
            <span className={styles.tabTitle}>Index</span>
            <span
              className={`${styles.tabIndicator} ${styles.indexIndicator}`}
            />
          </div>
        </div>
      </button>

      <div
        className={`${styles.mainContent} ${animReady ? styles.heightAnim : ""}`}
        style={{ height: animReady ? height : "auto" }}
      >
        <div ref={innerRef}>
          {!pageOpen && (
            <div
              className={`${styles.pageIndex} ${styles.tabs} ${styles.group}`}
            >
              <div className={styles.panelResume}>
                <a href="/resume.pdf" target="_blank" rel="noreferrer">
                  Resume ↗
                </a>
              </div>
              <Accordion
                tabs={indexTabs}
                open={openTab}
                setOpen={setOpenTab}
                onMeasure={onMeasure}
              />
            </div>
          )}

          {pageOpen && node && (
            <div className={styles.pageContent}>
              <div className={styles.group}>
                <div className={`${styles.tabTitles} ${styles.pageTitlesType}`}>
                  <span className={styles.tabIcon}>
                    <TabIcon
                      kind={
                        node.type === "home"
                          ? "home"
                          : node.type === "info"
                            ? "info"
                            : node.type
                      }
                    />
                  </span>
                  <span className={styles.tabTitle}>
                    {TYPE_NAMES[node.type]}
                  </span>
                  <button
                    className={styles.closePage}
                    aria-label="Close"
                    onClick={onClose}
                  />
                </div>
                <div className={styles.pageMainTitle}>
                  <h2>{node.panelTitle ?? node.title}</h2>
                  {node.subtitle && node.type !== "path" ? (
                    <h4>{node.panelSubtitle ?? node.subtitle}</h4>
                  ) : null}
                </div>
                <div className={styles.pageContentInner}>
                  {node.body?.map((p, i) => <p key={i}>{p}</p>)}
                  {node.readMore ? (
                    <p>
                      {node.readMore.startsWith("http") ? (
                        <a
                          href={node.readMore}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Read more
                        </a>
                      ) : (
                        <Link href={node.readMore}>Read more</Link>
                      )}
                    </p>
                  ) : null}
                </div>
                <div className={styles.tabs}>
                  <Accordion
                    tabs={pageTabs}
                    open={openTab}
                    setOpen={setOpenTab}
                    onMeasure={onMeasure}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function defaultPageTab(node: PortfolioNode, isMobile: boolean): string | null {
  if (isMobile && node.media?.length) return "media";
  return null;
}

function buildPageTabs(
  node: PortfolioNode,
  graph: Graph,
  visited: Set<string>,
  isMobile: boolean,
  onOpen: (id: string) => void,
  hoveredId: string | null,
  onHover: (id: string | null) => void,
): Tab[] {
  const tabs: Tab[] = [];
  if (isMobile && node.media?.length) {
    tabs.push({
      key: "media",
      icon: "media",
      title: "Media",
      content: <MobileMedia media={node.media} />,
    });
  }
  if (node.bullets?.length) {
    tabs.push({
      key: "details",
      icon: "details",
      title: "Details",
      content: (
        <ul className={`${styles.list} ${styles.tabMetadata}`}>
          {node.bullets.map((b, i) => (
            <li key={i}>
              <span className={styles.metaSubtitle}>
                <p>{b}</p>
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (node.coursework?.length) {
    tabs.push({
      key: "coursework",
      icon: "details",
      title: "Coursework",
      content: (
        <ul className={styles.courseList}>
          {node.coursework.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ),
    });
  }
  if (node.tags?.length) {
    tabs.push({
      key: "stack",
      icon: "stack",
      title: "Stack",
      content: (
        <ul className={`${styles.list} ${styles.tabMetadata}`}>
          {node.tags.map((t) => (
            <li key={t}>
              <span className={styles.metaTitle}>{t}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (node.links?.length) {
    tabs.push({
      key: "links",
      icon: "links",
      title: "Links",
      content: (
        <ul className={`${styles.list} ${styles.tabMetadata}`}>
          {node.links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className={styles.indexLink}
              >
                <span className={styles.itemId} />
                <span className={styles.itemTitle}>
                  <h2>{l.name} ↗</h2>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ),
    });
  }
  const connectionIds = [...node.childIds, ...(node.connected ?? [])].filter(
    (id) => graph.nodes[id],
  );
  if (connectionIds.length) {
    tabs.push({
      key: "connections",
      icon: "connections",
      title: "Connections",
      content: (
        <GroupedList
          ids={connectionIds}
          graph={graph}
          visited={visited}
          onOpen={onOpen}
          hoveredId={hoveredId}
          onHover={onHover}
        />
      ),
    });
  }
  return tabs;
}
