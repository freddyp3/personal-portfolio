import { useId } from "react";
import type { NodeType } from "./types";

export const TYPE_COLORS: Record<NodeType, string> = {
  home: "#FF5F1F",
  info: "#111111",
  path: "#7A8743",
  experience: "#F7DB45",
  hackathon: "#BFA99F",
  project: "#3573B6",
  education: "#9DB4C0",
};

interface ShapeProps {
  type: NodeType;
  state: "normal" | "current" | "connected";
  number?: number;
}

// The reference home/Index flower (coloured-node-home.svg), shared by the
// map node and the panel tab icon.
function FlowerIcon({ size }: { size: number }) {
  const maskId = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 21 21"
      fill="none"
      aria-hidden
      className="node-flower"
    >
      <mask id={maskId} fill="white">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.39784 3.0105C6.18138 1.86374 4.26537 1.88538 3.07532 3.07543C1.88538 4.26538 1.86363 6.18115 3.01008 7.39763C1.33926 7.44716 0 8.81719 0 10.5C0 12.1829 1.33943 13.553 3.0104 13.6024C1.86386 14.8189 1.88558 16.7347 3.07556 17.9247C4.26554 19.1147 6.18138 19.1364 7.39785 17.9898C7.44735 19.6607 8.81739 21 10.5002 21C12.183 21 13.553 19.6608 13.6026 17.99C14.8191 19.1363 16.7348 19.1145 17.9247 17.9246C19.1146 16.7347 19.1364 14.8189 17.9899 13.6024C19.6607 13.5529 21 12.1828 21 10.5C21 8.81708 19.6606 7.44699 17.9896 7.39762C19.1361 6.18114 19.1144 4.26534 17.9244 3.07538C16.7346 1.88556 14.8191 1.8637 13.6026 3.00979C13.5529 1.3391 12.183 0 10.5002 0C8.81727 0 7.44716 1.33948 7.39784 3.0105Z"
        />
      </mask>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.39784 3.0105C6.18138 1.86374 4.26537 1.88538 3.07532 3.07543C1.88538 4.26538 1.86363 6.18115 3.01008 7.39763C1.33926 7.44716 0 8.81719 0 10.5C0 12.1829 1.33943 13.553 3.0104 13.6024C1.86386 14.8189 1.88558 16.7347 3.07556 17.9247C4.26554 19.1147 6.18138 19.1364 7.39785 17.9898C7.44735 19.6607 8.81739 21 10.5002 21C12.183 21 13.553 19.6608 13.6026 17.99C14.8191 19.1363 16.7348 19.1145 17.9247 17.9246C19.1146 16.7347 19.1364 14.8189 17.9899 13.6024C19.6607 13.5529 21 12.1828 21 10.5C21 8.81708 19.6606 7.44699 17.9896 7.39762C19.1361 6.18114 19.1144 4.26534 17.9244 3.07538C16.7346 1.88556 14.8191 1.8637 13.6026 3.00979C13.5529 1.3391 12.183 0 10.5002 0C8.81727 0 7.44716 1.33948 7.39784 3.0105Z"
        fill="#FF5F1F"
      />
      <path
        d="M3.07532 3.07543L3.78243 3.78254L3.78243 3.78254L3.07532 3.07543ZM7.39784 3.0105L6.71189 3.73814L8.33173 5.26517L8.3974 3.04L7.39784 3.0105ZM3.01008 7.39763L3.03971 8.39719L5.26406 8.33124L3.73782 6.71178L3.01008 7.39763ZM3.0104 13.6024L3.73811 14.2883L5.2647 12.6686L3.03993 12.6028L3.0104 13.6024ZM3.07556 17.9247L2.36845 18.6318L2.36845 18.6318L3.07556 17.9247ZM7.39785 17.9898L8.39741 17.9602L8.3315 15.7357L6.71197 17.2621L7.39785 17.9898ZM13.6026 17.99L14.2884 17.2622L12.6691 15.7362L12.6031 17.9603L13.6026 17.99ZM17.9247 17.9246L18.6318 18.6317L18.6318 18.6317L17.9247 17.9246ZM17.9899 13.6024L17.9603 12.6028L15.7359 12.6687L17.2622 14.2883L17.9899 13.6024ZM17.9896 7.39762L17.2619 6.71175L15.7354 8.33145L17.9601 8.39718L17.9896 7.39762ZM17.9244 3.07538L18.6315 2.36828L18.6315 2.36828L17.9244 3.07538ZM13.6026 3.00979L12.6031 3.03952L12.6692 5.26311L14.2883 3.73764L13.6026 3.00979ZM3.78243 3.78254C4.58894 2.97603 5.88777 2.96125 6.71189 3.73814L8.08379 2.28285C6.47499 0.766228 3.94181 0.794734 2.36822 2.36833L3.78243 3.78254ZM3.73782 6.71178C2.96114 5.88765 2.97599 4.58898 3.78243 3.78254L2.36822 2.36833C0.79476 3.94178 0.766121 6.47465 2.28234 8.08348L3.73782 6.71178ZM1 10.5C1 9.35955 1.90778 8.43075 3.03971 8.39719L2.98045 6.39807C0.770729 6.46358 -1 8.27483 -1 10.5H1ZM3.03993 12.6028C1.9079 12.5694 1 11.6405 1 10.5H-1C-1 12.7253 0.770955 14.5367 2.98086 14.602L3.03993 12.6028ZM3.78266 17.2176C2.97621 16.4111 2.96137 15.1124 3.73811 14.2883L2.28268 12.9165C0.766356 14.5253 0.794958 17.0583 2.36845 18.6318L3.78266 17.2176ZM6.71197 17.2621C5.88784 18.0389 4.58912 18.024 3.78266 17.2176L2.36845 18.6318C3.94195 20.2053 6.47491 20.2339 8.08373 18.7175L6.71197 17.2621ZM10.5002 20C9.35976 20 8.43095 19.0922 8.39741 17.9602L6.39829 18.0194C6.46376 20.2292 8.27502 22 10.5002 22V20ZM12.6031 17.9603C12.5695 19.0922 11.6407 20 10.5002 20V22C12.7254 22 14.5366 20.2293 14.6022 18.0196L12.6031 17.9603ZM17.2176 17.2175C16.4112 18.0239 15.1126 18.0388 14.2884 17.2622L12.9168 18.7177C14.5256 20.2338 17.0584 20.2051 18.6318 18.6317L17.2176 17.2175ZM17.2622 14.2883C18.0389 15.1124 18.024 16.4111 17.2176 17.2175L18.6318 18.6317C20.2053 17.0582 20.2339 14.5254 18.7176 12.9165L17.2622 14.2883ZM20 10.5C20 11.6405 19.0922 12.5693 17.9603 12.6028L18.0195 14.602C20.2293 14.5365 22 12.7252 22 10.5H20ZM17.9601 8.39718C19.0921 8.43063 20 9.35947 20 10.5H22C22 8.27468 20.2291 6.46335 18.0192 6.39805L17.9601 8.39718ZM17.2173 3.78249C18.0238 4.58894 18.0386 5.88763 17.2619 6.71175L18.7174 8.08348C20.2336 6.47466 20.205 3.94175 18.6315 2.36828L17.2173 3.78249ZM14.2883 3.73764C15.1125 2.9612 16.411 2.97614 17.2173 3.78249L18.6315 2.36828C17.0582 0.794981 14.5257 0.76619 12.9169 2.28194L14.2883 3.73764ZM10.5002 1C11.6406 1 12.5694 1.90768 12.6031 3.03952L14.6022 2.98007C14.5365 0.770526 12.7253 -1 10.5002 -1V1ZM8.3974 3.04C8.43082 1.90793 9.35967 1 10.5002 1V-1C8.27486 -1 6.4635 0.771025 6.39827 2.981L8.3974 3.04Z"
        fill="black"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

// Node shapes as inline SVG: square, triangle, hexagon, circle, info dot
// and the reference flower for the home node.
export function NodeShape({ type, state, number }: ShapeProps) {
  const current = state === "current";
  const connected = state === "connected";
  const fill = current
    ? TYPE_COLORS[type]
    : connected
      ? "#F5F6F2"
      : "#ffffff";
  const stroke = connected ? "#999999" : "#111111";

  switch (type) {
    case "hackathon":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <rect
            x="1"
            y="1"
            width="18"
            height="18"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
          />
        </svg>
      );
    case "experience":
      return (
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
          <polygon
            points="13,2 25,24 1,24"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "path":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
          <polygon
            points="12,1 21.5,6.5 21.5,17.5 12,23 2.5,17.5 2.5,6.5"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "project":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <circle
            cx="10"
            cy="10"
            r="9"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
          />
        </svg>
      );
    case "education":
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <polygon
            points="11,1 21,11 11,21 1,11"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "info":
      // solid black circle; the 4px center dot is drawn in CSS
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <circle cx="10" cy="10" r="9.5" fill="#111111" stroke="#111111" />
        </svg>
      );
    case "home":
      return <FlowerIcon size={21} />;
  }
}

// Small tab/panel icons, loosely matching the reference icon set.
export function TabIcon({ kind }: { kind: string }) {
  const s = { display: "block" } as const;
  switch (kind) {
    case "home":
      return <FlowerIcon size={12} />;
    case "experience":
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" style={s} aria-hidden>
          <polygon
            points="6,1 11,11 1,11"
            fill="#111"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "hackathon":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" style={s} aria-hidden>
          <rect x="0.5" y="0.5" width="9" height="9" fill="#111" />
        </svg>
      );
    case "project":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" style={s} aria-hidden>
          <circle cx="5" cy="5" r="4" fill="#111" />
        </svg>
      );
    case "path":
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" style={s} aria-hidden>
          <polygon
            points="5.5,0.5 10.5,3.2 10.5,7.8 5.5,10.5 0.5,7.8 0.5,3.2"
            fill="#111"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "info":
      return (
        <svg width="9" height="9" viewBox="0 0 9 9" style={s} aria-hidden>
          <circle cx="4.5" cy="4.5" r="4" fill="#111" />
          <circle cx="4.5" cy="4.5" r="1.4" fill="#fff" />
        </svg>
      );
    case "education":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" style={s} aria-hidden>
          <polygon
            points="5,0.5 9.5,5 5,9.5 0.5,5"
            fill="#111"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "details":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" style={s} aria-hidden>
          <rect x="1" y="1" width="8" height="1.6" fill="#111" />
          <rect x="1" y="4.2" width="8" height="1.6" fill="#111" />
          <rect x="1" y="7.4" width="5" height="1.6" fill="#111" />
        </svg>
      );
    case "stack":
      return (
        <svg width="11" height="10" viewBox="0 0 11 10" style={s} aria-hidden>
          <rect x="0.5" y="0.5" width="10" height="2" fill="#111" />
          <rect x="0.5" y="4" width="10" height="2" fill="#111" />
          <rect x="0.5" y="7.5" width="10" height="2" fill="#111" />
        </svg>
      );
    case "links":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" style={s} aria-hidden>
          <path
            d="M4 6 L8 2 M8 2 H5.5 M8 2 V4.5"
            stroke="#111"
            fill="none"
            strokeWidth="1.2"
          />
          <rect x="1" y="1" width="8" height="8" fill="none" stroke="#111" />
        </svg>
      );
    case "connections":
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" style={s} aria-hidden>
          <circle cx="3" cy="3" r="2" fill="#111" />
          <circle cx="9" cy="3" r="2" fill="#111" />
          <circle cx="6" cy="9" r="2" fill="#111" />
          <path
            d="M4.4 4.4 L5.4 7.4 M7.6 4.4 L6.6 7.4 M5 3 H7"
            stroke="#111"
            strokeWidth="0.8"
          />
        </svg>
      );
    case "media":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" style={s} aria-hidden>
          <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="#111" />
          <circle cx="3.5" cy="3.5" r="1" fill="#111" />
          <path d="M1 8 L4 5.5 L6 7 L8 4.5 L9.5 6" stroke="#111" fill="none" />
        </svg>
      );
    default:
      return null;
  }
}
