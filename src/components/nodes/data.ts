import career from "@/data/career.json";
import education from "@/data/education.json";
import home from "@/data/home.json";
import projects from "@/data/projects.json";
import socials from "@/data/socials.json";
import type { NodeMedia, PortfolioNode } from "./types";

export interface IndexSection {
  key: string;
  icon: string;
  title: string;
  description: string;
  ids: string[];
  more?: { href: string; label: string };
}

export interface Graph {
  nodes: Record<string, PortfolioNode>;
  rootId: string;
  sections: IndexSection[];
  defaultTab: string | null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function endYear(end?: string): string {
  if (!end) return "Currently";
  if (/present/i.test(end)) return "Currently";
  const m = end.match(/\d{4}/);
  return m ? m[0] : "Currently";
}

// "May 2026" / "December 2025" → sortable month number (year * 12 + month);
// a missing or "present" end sorts as the latest possible
function monthIndex(s?: string): number {
  if (!s || /present/i.test(s)) return Number.POSITIVE_INFINITY;
  const y = Number(s.match(/\d{4}/)?.[0] ?? 0);
  const m = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ].indexOf(s.trim().slice(0, 3).toLowerCase());
  return y * 12 + Math.max(0, m);
}

function yearOf(s?: string): string | undefined {
  const m = s?.match(/\d{4}/);
  return m ? m[0] : undefined;
}

// nodes kept out of the map/panel (still in projects.json for the main site)
const HIDDEN_IDS = new Set([
  "premier-predictor",
  "java-oop-quiz-application",
  "minecraft-data-science-project",
  "photo-time-capsule",
]);

// preview-matched layout: target offsets from the root, in layout units (y down)
export const LAYOUT: Record<string, [number, number]> = {
  home: [0, 0],
  about: [0, -175],
  ubc: [23, 256],
  "ai-agents": [-233, -111],
  aem: [-410, -238],
  scheming: [-297, -385],
  gitintent: [-102, -321],
  "youtube-shorts-ai-optimizer": [-397, -17],
  "machine-learning": [187, -93],
  "chelsea-fc-play-predictor": [143, -385],
  "apex-fsd": [372, -274],
  "vital-sense-radar": [418, -76],
  "backend-systems": [-79, 110],
  "email-synced-cashflow-tracker": [-383, 130],
  ellustros: [-346, 320],
  teaching: [169, 174],
  "ubc-computer-science": [373, 71],
  "under-the-gui-academy": [343, 320],
};

// per-node offsets (layout units) applied after the graph is fitted and
// centered, so they move just that node without shifting the rest
export const LAYOUT_NUDGE: Record<string, [number, number]> = {
  ellustros: [30, -30],
  "under-the-gui-academy": [-30, -30],
};

const existingImages = new Set([
  "/img/aem.png",
  "/img/apex-fsd.jpg",
  "/img/cashflow-demo.mp4",
  "/img/cashflow-home.png",
  "/img/cashflow-tiktok-stats.png",
  "/img/cashflow.png",
  "/img/ellustros.png",
  "/img/fredrik-1.jpeg",
  "/img/fredrik-3.png",
  "/img/fredrik-4.png",
  "/img/fredrik-5.jpg",
  "/img/gitintent.jpg",
  "/img/minecraft.png",
  "/img/momento.png",
  "/img/predictor.png",
  "/img/quiz.png",
  "/img/scheming.jpg",
  "/img/ubc.png",
  "/img/utg.png",
]);

/* ------------------------------------------------------------------ */
/* Shared leaves (experience / projects / hackathons / about)          */
/* ------------------------------------------------------------------ */

interface LeafExtras {
  connected?: string[];
  resumeSubtitle?: string;
}

const leaves: Record<string, PortfolioNode> = {};
const leafExtras: Record<string, LeafExtras> = {};

function addLeaf(
  n: Omit<PortfolioNode, "childIds" | "parentId">,
  extras: LeafExtras = {},
) {
  leaves[n.id] = { ...n, parentId: null, childIds: [] };
  leafExtras[n.id] = extras;
}

// --- experience ---
const careerIdMap: Record<string, string> = {
  AEM: "aem",
  ELLUSTROS: "ellustros",
  "UBC Department of Computer Science": "ubc-computer-science",
  "Under the GUI Academy": "under-the-gui-academy",
};
const careerTitleMap: Record<string, string> = {
  "UBC Department of Computer Science": "UBC Computer Science",
};
const EXPERIENCE_IDS: string[] = [];

// most recent first: ongoing roles, then by end date, then by start date
const careerByTime = [...career.career].sort((a, b) => {
  const pa = a.positions[0] as { start: string; end?: string };
  const pb = b.positions[0] as { start: string; end?: string };
  return (
    monthIndex(pb.end) - monthIndex(pa.end) ||
    monthIndex(pb.start) - monthIndex(pa.start)
  );
});

for (const job of careerByTime) {
  const id = careerIdMap[job.name] ?? slugify(job.name);
  const pos = job.positions[0] as { end?: string } & (typeof job.positions)[0];
  const startY = yearOf(pos.start);
  const endY = yearOf(pos.end);
  const yearLabel = !pos.end
    ? "now"
    : endY && startY && endY !== startY
      ? `${startY}–${endY}`
      : (endY ?? "now");
  const shortTitle = pos.title.split(" | ")[0];
  EXPERIENCE_IDS.push(id);
  addLeaf(
    {
      id,
      type: "experience",
      title: careerTitleMap[job.name] ?? job.name,
      subtitle: pos.title,
      group: endYear(pos.end),
      bullets: pos.description,
      links:
        job.href && id !== "ubc-computer-science"
          ? [{ name: job.name, href: job.href }]
          : [],
      highlighted: id === "aem",
    },
    {
      connected:
        id === "aem" ? ["machine-learning", "backend-systems"] : undefined,
      resumeSubtitle: `${shortTitle}, ${yearLabel}`,
    },
  );
}

// --- hackathons + projects ---
const HACKATHON_IDS = ["apex-fsd", "scheming", "gitintent"];
const hackathonSubtitles: Record<string, string> = {
  "apex-fsd": "StormHacks 2026 winner",
  scheming: "HackMIT 2026",
  gitintent: "UC Berkeley 2026",
};
const projectSubtitles: Record<string, string> = {
  "email-synced-cashflow-tracker": "Resale business backend",
  "youtube-shorts-ai-optimizer": "AI video tooling",
  "premier-predictor": "Match outcome model",
  "java-oop-quiz-application": "Desktop app",
  "vital-sense-radar": "Wi-Fi sensing hardware",
  "chelsea-fc-play-predictor": "Sports analytics",
  "photo-time-capsule": "Mobile app",
  "minecraft-data-science-project": "Data science",
};
// résumé ordering for projects (strongest first)
const RESUME_PROJECT_IDS = [
  "email-synced-cashflow-tracker",
  "youtube-shorts-ai-optimizer",
  "vital-sense-radar",
  "chelsea-fc-play-predictor",
  "premier-predictor",
  "photo-time-capsule",
  "java-oop-quiz-application",
  "minecraft-data-science-project",
];
const cashflowMedia: NodeMedia[] = [
  { type: "video", src: "/img/cashflow-demo.mp4" },
  { type: "image", src: "/img/cashflow-home.png" },
  { type: "image", src: "/img/cashflow-tiktok-stats.png" },
];

// node-id -> full write-up shown as "Read more" under the panel body
const WRITE_UPS: Record<string, string> = {
  "email-synced-cashflow-tracker": "/write-ups/cashflow-tracker",
};

const PROJECT_IDS: string[] = [];
const projectEntries: Record<string, ProjectEntry> = {};
for (const p of projects.projects) {
  const isHackathon = p.name.includes(" - ");
  const title = isHackathon ? p.name.split(" - ")[0].trim() : p.name;
  const id = slugify(title);
  const links = p.links.map((l) => ({ name: l.name, href: l.href }));
  const readMore =
    WRITE_UPS[id] ??
    p.links.find((l) => l.name === "Devpost" || l.name === "Plume")?.href;
  let media: NodeMedia[] | undefined;
  if (id === "email-synced-cashflow-tracker") {
    media = cashflowMedia;
  } else if (id === "scheming") {
    // hand-placed scatter around the card: tilted, overlapping a little,
    // deliberately untidy
    media = [
      {
        type: "image",
        src: "/img/scheming.jpg",
        place: { top: "5%", left: "-4%", width: "330px", rotate: -5, z: 2 },
      },
      {
        type: "video",
        src: "/img/scheming-hackmit.mp4",
        sound: true,
        place: { top: "14%", right: "2%", width: "210px", rotate: 4, z: 1 },
      },
      {
        type: "image",
        src: "/img/hackmit-team.jpg",
        place: { bottom: "3%", left: "-9%", width: "205px", rotate: -3, z: 3 },
      },
      {
        type: "video",
        src: "/img/scheming-demo.mp4",
        sound: true,
        place: { bottom: "4%", left: "28%", width: "320px", rotate: 0, z: 4 },
      },
    ];
  } else if (id === "gitintent") {
    // hand-placed scatter around the card (a different layout from Scheming)
    media = [
      {
        type: "image",
        src: "/img/gitintent.jpg",
        place: { top: "6%", left: "-6%", width: "300px", rotate: 3, z: 3 },
      },
      {
        type: "image",
        src: "/img/gitintent-berkeley.jpg",
        place: { bottom: "3%", left: "-9%", width: "215px", rotate: -5, z: 4 },
      },
      // audio stripped from the file: this one stays silent
      {
        type: "video",
        src: "/img/gitintent-berkeley.mp4",
        place: { bottom: "4%", right: "4%", width: "175px", rotate: 5, z: 1 },
      },
      {
        type: "image",
        src: "/img/gitintent-diagram.png",
        place: { bottom: "2%", left: "-12%", width: "300px", rotate: 0, z: 5 },
      },
    ];
  } else if (id === "apex-fsd") {
    // from the StormHacks LinkedIn post (images 1, 5, 8, 9; 1 and 8 were
    // GIFs, converted to looping videos)
    media = [
      {
        type: "image",
        src: "/img/apex-fsd-team.jpg",
        place: { top: "4%", left: "-6%", width: "300px", rotate: 0, z: 3 },
      },
      {
        type: "video",
        src: "/img/apex-fsd-demo.mp4",
        place: { top: "6%", right: "2%", width: "170px", rotate: 0, z: 1 },
      },
      // post image 8, "Inference on un-seen roads" (GIF → looping video)
      {
        type: "video",
        src: "/img/apex-fsd-inference.mp4",
        place: { bottom: "4%", left: "-8%", width: "170px", rotate: 0, z: 4 },
      },
      {
        type: "image",
        src: "/img/apex-fsd-dataset.jpg",
        place: { bottom: "10%", right: "0%", width: "300px", rotate: 0, z: 2 },
      },
    ];
  } else if (p.image && existingImages.has(p.image)) {
    media = [{ type: "image", src: p.image }];
  }
  const group = isHackathon ? "2026" : "Featured";
  const subtitle = isHackathon
    ? (hackathonSubtitles[id] ?? "Hackathon")
    : (projectSubtitles[id] ?? "");
  projectEntries[id] = {
    id,
    title,
    subtitle,
    description: p.description,
    image:
      p.image && existingImages.has(p.image)
        ? p.image
        : media?.find((m) => m.type === "image")?.src,
    tags: p.tags,
    links,
    readMore,
  };
  const connected =
    id === "gitintent" || id === "youtube-shorts-ai-optimizer"
      ? ["backend-systems"]
      : undefined;
  addLeaf(
    {
      id,
      type: isHackathon ? "hackathon" : "project",
      title,
      subtitle,
      group,
      body: [p.description],
      tags: p.tags,
      links,
      readMore,
      media,
      highlighted: id === "apex-fsd",
    },
    {
      connected,
      resumeSubtitle: isHackathon ? undefined : p.tags.slice(0, 2).join(", "),
    },
  );
  if (!isHackathon) PROJECT_IDS.push(id);
}

// --- about / education source data ---
const edu = education.education[0];
const eduPos = edu.positions[0];
const eduGpa =
  eduPos.description.find((b) => /GPA:/i.test(b))?.match(/GPA:\s*(.+)/i)?.[1] ??
  "";
const eduEndYear = yearOf(eduPos.end) ?? "";

function aboutLeaf(includeEducation: boolean): PortfolioNode {
  return {
    id: "about",
    type: "info",
    title: "About me",
    subtitle: "",
    body: includeEducation
      ? [
          home.introduction.description.replace(/ /g, " "),
          `${edu.name} — ${eduPos.title}, ${eduPos.start} – ${eduPos.end}.`,
        ]
      : [home.introduction.description.replace(/ /g, " ")],
    bullets: includeEducation ? eduPos.description : undefined,
    links: [
      ...socials.socials.map((s) => ({ name: s.name, href: s.href })),
      { name: "Resume", href: "/resume.pdf" },
    ],
    media: [
      { type: "image", src: "/img/fredrik-1.jpeg" },
      { type: "image", src: "/img/fredrik-3.png" },
      { type: "image", src: "/img/fredrik-4.png" },
      { type: "image", src: "/img/fredrik-5.jpg" },
    ],
    parentId: "home",
    childIds: [],
  };
}

// official UBC titles (Vancouver academic calendar)
const COURSE_TITLES: Record<string, string> = {
  "CPSC 340": "Machine Learning and Data Mining",
  "CPSC 320": "Intermediate Algorithm Design and Analysis",
  "CPSC 310": "Introduction to Software Engineering",
  "CPSC 213": "Introduction to Computer Systems",
};

function ubcNode(): PortfolioNode {
  return {
    id: "ubc",
    type: "education",
    title: "UBC",
    panelTitle: edu.name,
    subtitle: `BSc CS (AI), GPA ${eduGpa}, ${eduEndYear}`,
    panelSubtitle: `Bachelor of Science in Computer Science, Artificial Intelligence Option, GPA ${eduGpa}, ${eduEndYear}`,
    body: [`${edu.name} — ${eduPos.title}, ${eduPos.start} – ${eduPos.end}.`],
    // "Relevant Coursework: A (X), B (Y)" → ["A (X)", "B (Y)"], with the
    // short names in education.json expanded to UBC's official course titles
    coursework: (
      eduPos.description
        .find((d) => /^relevant coursework:/i.test(d))
        ?.replace(/^relevant coursework:\s*/i, "")
        .split(/,\s*(?![^()]*\))/) ?? []
    )
      .filter(Boolean)
      .map((c) => {
        const code = c.match(/\(([^)]+)\)/)?.[1];
        const full = code ? COURSE_TITLES[code] : undefined;
        return full ? `${full} (${code})` : c;
      }),
    parentId: "home",
    childIds: [],
  };
}

function cloneLeaf(id: string): PortfolioNode {
  const l = leaves[id];
  return {
    ...l,
    childIds: [...l.childIds],
    links: l.links?.map((x) => ({ ...x })),
  };
}

/* ------------------------------------------------------------------ */
/* Skills graph (unchanged layout: root -> about + 4 paths)            */
/* ------------------------------------------------------------------ */

function buildGraph(): Graph {
  const nodes: Record<string, PortfolioNode> = {};
  const pathDefs: {
    id: string;
    title: string;
    body: string;
    childIds: string[];
  }[] = [
    {
      id: "ai-agents",
      title: "AI Agents & LLMs",
      body: "Agents that read, reason and act, and the evals that keep them honest.",
      childIds: ["aem", "scheming", "gitintent", "youtube-shorts-ai-optimizer"],
    },
    {
      id: "machine-learning",
      title: "Machine Learning",
      body: "Models trained on scraped, sensed and simulated data.",
      childIds: [
        "apex-fsd",
        "premier-predictor",
        "chelsea-fc-play-predictor",
        "minecraft-data-science-project",
        "vital-sense-radar",
      ],
    },
    {
      id: "backend-systems",
      title: "Backend Systems",
      body: "APIs, queues and caches that keep products running.",
      childIds: [
        "email-synced-cashflow-tracker",
        "ellustros",
        "photo-time-capsule",
        "java-oop-quiz-application",
      ],
    },
    {
      id: "teaching",
      title: "Teaching",
      body: "Helping other people learn to think like a programmer.",
      childIds: ["ubc-computer-science", "under-the-gui-academy"],
    },
  ];

  for (const def of pathDefs) {
    def.childIds = def.childIds.filter((id) => !HIDDEN_IDS.has(id));
  }
  const childSet = new Set(pathDefs.flatMap((d) => d.childIds));
  for (const id of Object.keys(leaves)) {
    if (childSet.has(id)) {
      const n = cloneLeaf(id);
      n.connected = leafExtras[id].connected;
      const resumeSubtitle = leafExtras[id].resumeSubtitle;
      if (resumeSubtitle) n.subtitle = resumeSubtitle;
      nodes[id] = n;
    }
  }

  // skill areas show no media: photos and videos only appear on their own
  // project/experience card
  pathDefs.forEach((def, i) => {
    nodes[def.id] = {
      id: def.id,
      type: "path",
      title: def.title,
      subtitle: "Skill area",
      number: i + 1,
      body: [def.body],
      parentId: "home",
      childIds: def.childIds,
    };
    for (const cid of def.childIds) nodes[cid].parentId = def.id;
  });

  nodes["about"] = aboutLeaf(false);
  nodes["ubc"] = ubcNode();
  nodes["home"] = {
    id: "home",
    type: "home",
    title: "Fredrik Pettit",
    subtitle: "",
    parentId: null,
    childIds: ["about", "ubc", ...pathDefs.map((p) => p.id)],
  };

  return {
    nodes,
    rootId: "home",
    defaultTab: null,
    sections: [
      {
        key: "experience",
        icon: "experience",
        title: "Experience",
        description: "Internships and teaching roles, most recent first.",
        ids: EXPERIENCE_IDS,
      },
      {
        key: "projects",
        icon: "project",
        title: "Projects",
        description: "Things I've built, strongest first.",
        ids: RESUME_PROJECT_IDS.filter((id) => !HIDDEN_IDS.has(id)),
        more: { href: "/projects", label: "View more" },
      },
      {
        key: "hackathons",
        icon: "hackathon",
        title: "Hackathons",
        description: "Weekend builds, judged on stage.",
        ids: HACKATHON_IDS,
      },
      {
        key: "education",
        icon: "education",
        title: "Education",
        description: "Where I study.",
        ids: ["ubc"],
      },
      {
        key: "paths",
        icon: "path",
        title: "Skills",
        description: "The threads that connect the work.",
        ids: ["backend-systems", "ai-agents", "machine-learning", "teaching"],
      },
    ],
  };
}

export const GRAPH: Graph = buildGraph();

/* ------------------------------------------------------------------ */
/* All projects page (/projects): every projects.json entry, grouped   */
/* ------------------------------------------------------------------ */

export interface ProjectEntry {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image?: string;
  tags: string[];
  links: { name: string; href: string }[];
  mapHref?: string;
  readMore?: string;
}

// /projects order: these first, then the rest in résumé order, then anything
// else in projects.json order
const PROJECT_PAGE_ORDER = [
  "apex-fsd",
  "email-synced-cashflow-tracker",
  "scheming",
  "gitintent",
  "youtube-shorts-ai-optimizer",
  ...RESUME_PROJECT_IDS,
  ...Object.keys(projectEntries),
].filter((id, i, all) => projectEntries[id] && all.indexOf(id) === i);

export const PROJECT_GROUPS: { title: string; items: ProjectEntry[] }[] = [
  {
    title: "Projects",
    items: PROJECT_PAGE_ORDER.map((id) => ({
      ...projectEntries[id],
      mapHref: GRAPH.nodes[id] ? `/about?node=${id}` : undefined,
    })),
  },
];

/* ------------------------------------------------------------------ */
/* Visible tree                                                      */
/* ------------------------------------------------------------------ */

export interface VisibleNode {
  id: string;
  data: PortfolioNode;
  isConnected: boolean;
}

export interface VisibleLink {
  key: string;
  sourceId: string;
  targetId: string;
  isConnected: boolean;
  targetType: PortfolioNode["type"];
}

export function visibleTree(
  graph: Graph,
  currentId: string | null,
): { nodes: VisibleNode[]; links: VisibleLink[] } {
  const nodes = graph.nodes;
  const out: VisibleNode[] = [];
  const outLinks: VisibleLink[] = [];
  const seen = new Set<string>();

  const push = (id: string, isConnected = false) => {
    if (seen.has(id) || !nodes[id]) return;
    seen.add(id);
    out.push({ id, data: nodes[id], isConnected });
  };
  const link = (sourceId: string, targetId: string, isConnected = false) => {
    outLinks.push({
      key: `${sourceId}>${targetId}`,
      sourceId,
      targetId,
      isConnected,
      targetType: nodes[targetId].type,
    });
  };

  if (!currentId || !nodes[currentId] || currentId === graph.rootId) {
    const walk = (id: string) => {
      push(id);
      for (const cid of nodes[id].childIds) {
        link(id, cid);
        walk(cid);
      }
    };
    walk(graph.rootId);
    // cross-skill links are always visible in the full map
    const linked = new Set<string>();
    for (const vn of out) {
      for (const cid of nodes[vn.id].connected ?? []) {
        if (!nodes[cid] || !seen.has(cid)) continue;
        const key = `${vn.id}>${cid}`;
        if (linked.has(key)) continue;
        linked.add(key);
        link(vn.id, cid, true);
      }
    }
    return { nodes: out, links: outLinks };
  }

  const chain: string[] = [];
  let cur = nodes[currentId].parentId;
  while (cur) {
    chain.unshift(cur);
    cur = nodes[cur].parentId;
  }
  for (let i = 0; i < chain.length; i++) {
    push(chain[i]);
    if (i > 0) link(chain[i - 1], chain[i]);
  }
  push(currentId);
  if (chain.length) link(chain[chain.length - 1], currentId);
  for (const cid of nodes[currentId].childIds) {
    push(cid);
    link(currentId, cid);
  }
  for (const cid of nodes[currentId].connected ?? []) {
    if (!nodes[cid]) continue;
    push(cid, true);
    link(currentId, cid, true);
  }
  return { nodes: out, links: outLinks };
}
