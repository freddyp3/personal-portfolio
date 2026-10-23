import type { Metadata } from "next";
import { Suspense } from "react";
import NodePortfolio from "@/components/nodes/NodePortfolio";

export const metadata: Metadata = {
  title: "About",
};

export default function HomePage() {
  return (
    <Suspense>
      <NodePortfolio />
    </Suspense>
  );
}
