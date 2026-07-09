import Icon from "@/components/Icon";
import ImageWithSkeleton from "@/components/ImageWithSkeleton";
import LinkWithIcon from "@/components/LinkWithIcon";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "cashflow-tracker",
  description:
    "Full-stack sales and inventory tracker for a cross-platform clothing reselling business.",
};

const ARCHITECTURE_DIAGRAM = `┌──────────────┐     /api      ┌───────────────────┐          ┌────────────┐
│  React SPA   │ ────────────► │  Spring Boot API  │ ───────► │ PostgreSQL │
│ (Vite + TS)  │               │     (Java 21)     │   JPA    │            │
└──────────────┘               └───────────────────┘          └────────────┘
                                        ▲
                                        │ REST
                               ┌────────┴────────┐
                               │ Python FastAPI  │──► Gmail API
                               │ automation svc  │──► Grailed (Playwright)
                               └─────────────────┘`;

const SETUP_COMMANDS = `# database
createdb cashflow_tracker_db
psql cashflow_tracker_db -f app/database/create_tables.sql
psql cashflow_tracker_db -f app/database/create_views.sql

# backend — http://localhost:8080
./gradlew :app:bootRun

# frontend — http://localhost:5173
cd frontend && npm install && npm run dev`;

export default function CashflowTrackerPage() {
  return (
    <article className="mt-8 flex flex-col gap-8 pb-16">
      <LinkWithIcon
        href="/projects"
        position="left"
        icon={<ArrowLeftIcon className="size-5" />}
        text="back to projects"
      />

      <div className="flex flex-col items-start gap-4">
        <h1 className="title text-4xl sm:text-5xl">cashflow-tracker</h1>
        <Link
          href="https://github.com/freddyp3/cashflow-tracker"
          target="_blank"
        >
          <Badge className="flex gap-2 px-2 py-1 text-[10px]">
            <Icon name="github" className="size-3" />
            Source
          </Badge>
        </Link>
      </div>

      <section className="flex flex-col gap-4 text-sm sm:text-base">
        <p>
          Summer 2025 I started reselling clothes. Initially on Facebook
          Marketplace, then on Grailed, Depop, and eBay. Then I started to
          market my business on TikTok.
        </p>
        <p>
          My videos did well and sales started to ramp up. I needed a better
          way to track profits than on paper.
        </p>

        <ImageWithSkeleton
          src="/img/cashflow-tiktok-stats.png"
          alt="My TikTok stats"
          width={1140}
          height={1660}
          sizes="(max-width: 640px) calc(100vw - 4rem), 384px"
          quality={75}
          containerClassName="w-full max-w-sm rounded-lg"
          className="w-full rounded-lg"
        />

        <p>So I created this.</p>

        <video
          controls
          preload="metadata"
          className="w-full rounded-lg border"
          src="/img/cashflow-demo.mp4"
        >
          Your browser does not support the video tag.
        </video>
        <p className="text-xs text-muted-foreground">Demo video</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="title text-2xl sm:text-3xl">how it&apos;s built</h2>

        <pre className="overflow-x-auto rounded-lg bg-accent px-5 py-4 font-mono text-xs leading-[1.5]">
          {ARCHITECTURE_DIAGRAM}
        </pre>

        <ul className="flex list-disc flex-col gap-3 pl-5 text-sm sm:text-base">
          <li>
            <strong>Frontend</strong> — React 19 + TypeScript, built with Vite
            and styled with Tailwind CSS. TanStack Query for data fetching,
            Recharts for the stats dashboards, react-globe.gl for the shipping
            globe. Component tests with Vitest + Testing Library.
          </li>
          <li>
            <strong>Backend</strong> — Spring Boot 3 (Java 21) REST API with
            controller/service/repository layering, JPA entities, and DTOs at
            the API boundary. Data lives in PostgreSQL, with SQL views powering
            the stats.
          </li>
          <li>
            <strong>Automation</strong> — Python + FastAPI service running
            scheduled jobs: Gmail ingestion with per-platform email parsers,
            and a Playwright bot managing the Grailed relist cycle with its own
            SQLite action log.
          </li>
        </ul>
      </section>

      <details className="group rounded-lg border px-5 py-4">
        <summary className="cursor-pointer text-sm font-medium sm:text-base">
          If you have a use case for this, here&apos;s how to set it up
          locally:
        </summary>

        <div className="mt-4 flex flex-col gap-4 text-sm sm:text-base">
          <p>Requires Java 21, Node.js 20+, and PostgreSQL.</p>

          <pre className="overflow-x-auto rounded-lg bg-accent px-5 py-4 font-mono text-xs leading-[1.75]">
            {SETUP_COMMANDS}
          </pre>

          <p>
            Datasource credentials are in{" "}
            <code className="rounded-lg bg-accent px-1 py-0.5 text-xs">
              app/src/main/resources/application.properties
            </code>
            . The automation service is optional — see{" "}
            <Link
              href="https://github.com/freddyp3/cashflow-tracker/blob/main/automation/README.md"
              target="_blank"
              className="underline underline-offset-4 hover:text-muted-foreground"
            >
              automation/README.md
            </Link>
            .
          </p>
        </div>
      </details>
    </article>
  );
}
