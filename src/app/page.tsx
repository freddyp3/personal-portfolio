import type { Metadata } from "next";
import GreyhoundSprite from "@/components/greyhound/GreyhoundSprite";
import { GREYHOUND } from "@/components/greyhound/sprites";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Fredrik Pettit",
};

export default function GreyhoundPage() {
  return (
    // arrow cursor everywhere (no text I-beam over the ASCII dog or the name)
    // and no text selection; nav links still switch to the hand cursor
    <div
      className="fixed inset-0 z-[100] flex cursor-default select-none items-center justify-center bg-[rgb(245,246,242)] text-black"
      // Safari only honours the prefixed property
      style={{ WebkitUserSelect: "none" }}
    >
      <GreyhoundSprite
        {...GREYHOUND}
        shading="light"
        sdfClamp={6}
        cursorLight
      />
      <SiteNav active="home" />
    </div>
  );
}
