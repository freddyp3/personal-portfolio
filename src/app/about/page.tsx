import type { Metadata } from "next";
import { Suspense } from "react";
import NodePortfolio from "@/components/nodes/NodePortfolio";

export const metadata: Metadata = {
  title: "About",
  description:
    "An interactive map of Fredrik Pettit's experience, projects, hackathons, education and skills.",
};

export default function HomePage() {
  return (
    <Suspense>
      <NodePortfolio />
    </Suspense>
  );
}
