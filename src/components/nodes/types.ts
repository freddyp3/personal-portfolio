export type NodeType =
  | "home"
  | "info"
  | "path"
  | "experience"
  | "hackathon"
  | "project"
  | "education";

export interface NodeLink {
  name: string;
  href: string;
}

export interface NodeMedia {
  type: "image" | "video";
  src: string;
  // videos always autoplay muted; with sound they unmute when opened large
  sound?: boolean;
  // desktop showcase: hand-placed position (CSS lengths, against the page
  // column), width, tilt in degrees and stacking order (higher = in front;
  // the card always stays on top). Without it the item uses the default slot.
  place?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
    width?: string;
    rotate?: number;
    z?: number;
  };
}

export interface PortfolioNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle: string;
  group?: string;
  body?: string[];
  bullets?: string[];
  coursework?: string[];
  // longer name for the panel (lists and the open page); the map keeps title
  panelTitle?: string;
  panelSubtitle?: string;
  tags?: string[];
  links?: NodeLink[];
  // full write-up URL, shown as "Read more" under the body
  readMore?: string;
  media?: NodeMedia[];
  highlighted?: boolean;
  number?: number;
  connected?: string[];
  parentId: string | null;
  childIds: string[];
}
