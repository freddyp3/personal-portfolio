import DemoVideo from "@/components/DemoVideo";
import SiteNav from "@/components/SiteNav";
import { TabIcon } from "@/components/nodes/shapes";
import styles from "@/components/writeup/writeup.module.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Email Synced Cashflow Tracker",
  description:
    "Full-stack sales and inventory tracker for a cross-platform clothing reselling business.",
};

const ARCHITECTURE_DIAGRAM = `┌──────────────┐     /api      ┌───────────────────┐   JPA    ┌────────────┐
│  React SPA   │ ────────────► │  Spring Boot API  │ ───────► │ PostgreSQL │
│ (Vite + TS)  │               │     (Java 21)     │          └────────────┘
└──────────────┘               │                   │ ───────► ┌────────────┐
                               └───────────────────┘  cache   │   Redis    │
                                         ▲                    └────────────┘
                                         │ PUT /api/orders/external/{platform}/{ref}
                               ┌─────────┴─────────┐   pull   ┌────────────┐   push  ┌───────────┐
                               │  Go worker        │ ◄─────── │  Pub/Sub   │ ◄────── │ Gmail API │
                               │ (goroutine pool)  │          └────────────┘ watch() └───────────┘
                               └───────────────────┘`;

const DOCKER_COMMANDS = `cp .env.example .env
docker compose up --build`;

const SETUP_COMMANDS = `# database
createdb cashflow_tracker_db
psql cashflow_tracker_db -f app/database/create_tables.sql
psql cashflow_tracker_db -f app/database/create_views.sql
psql cashflow_tracker_db -f app/database/migrations/002_external_ref.sql
psql cashflow_tracker_db -f app/database/migrations/003_coordinates_platforms.sql

# backend — http://localhost:8080
./gradlew :app:bootRun

# frontend — http://localhost:5173
cd frontend && npm install && npm run dev`;

export default function CashflowTrackerWriteUp() {
  return (
    <div className={styles.root}>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.headerRow}>
            <span className={styles.tabIcon}>
              <TabIcon kind="project" />
            </span>
            <span className={styles.tabTitle}>Project</span>
            <Link
              href="/about?node=email-synced-cashflow-tracker"
              className={styles.closePage}
            >
              Go back
            </Link>
          </div>

          <div className={styles.mainTitle}>
            <h2>Email Synced Cashflow Tracker</h2>
            <h4>
              Full-stack sales and inventory tracker for a cross-platform
              clothing reselling business
            </h4>
          </div>

          <div className={styles.source}>
            <a
              href="https://github.com/freddyp3/cashflow-tracker"
              target="_blank"
              rel="noreferrer"
            >
              Source ↗
            </a>
          </div>

          <div className={styles.body}>
            <p>
              Summer 2025 I started reselling clothes. Initially on Facebook
              Marketplace, then on Grailed, Depop, and eBay. Then I started to
              market my business on TikTok.
            </p>
            <p>
              My videos did well and sales started to ramp up. I needed a better
              way to track profits than on paper.
            </p>

            <Image
              src="/img/cashflow-tiktok-stats.png"
              alt="My TikTok stats"
              width={1140}
              height={1660}
              className={styles.mediaNarrow}
            />

            <p>So I created this.</p>

            <DemoVideo className={styles.video} src="/img/cashflow-demo.mp4" />
            <p className={styles.caption}>Demo video</p>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>what I use it for</span>
            <Image
              src="/img/cashflow-home.png"
              alt="Home dashboard"
              width={1600}
              height={900}
              className={styles.media}
            />
            <div className={styles.body}>
              <p>
                The home page is what I check most. Revenue, profit, margin and
                units for the month, how that compares to last month, and
                revenue against profit by month.
              </p>
              <p>
                When a sale comes in on Grailed, Depop or eBay the worker picks
                up the confirmation email and the order shows up on its own. If
                I sell something in person, I add it by hand on the Orders page.
                Products hold what I paid for each item, so profit is worked out
                per unit sold instead of me doing it after the fact.
              </p>
              <p>
                Then I have insights for if I want to see anything closer. I
                also have a cool globe visualization where every order shipped
                to is shown on a globe. More screenshots are in{" "}
                <a
                  href="https://github.com/freddyp3/cashflow-tracker/tree/main/docs/ui"
                  target="_blank"
                  rel="noreferrer"
                >
                  docs/ui/
                </a>
                .
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>how it&apos;s built</span>
            <pre className={styles.pre}>{ARCHITECTURE_DIAGRAM}</pre>

            <ul className={styles.list}>
              <li>
                <strong>Frontend</strong> — React 19 + TypeScript, built with
                Vite and styled with Tailwind CSS. TanStack Query for data
                fetching, Recharts for the stats dashboards, react-globe.gl for
                the shipping globe. Component tests with Vitest + Testing
                Library.
              </li>
              <li>
                <strong>Backend</strong> — Spring Boot 3 (Java 21) REST API with
                controller/service/repository layering, JPA entities, and DTOs
                at the API boundary. Data lives in PostgreSQL, with SQL views
                powering the stats. Stats responses are cached in Redis and
                evicted on every order/product write — measured at{" "}
                <strong>20.6x</strong> overall across the ten stats endpoints
                (per-endpoint 10.3x–44.7x) on a 20,000-order synthetic dataset.
              </li>
              <li>
                <strong>Worker</strong> — Go service: Gmail{" "}
                <code className={styles.code}>watch()</code> pushes new-mail
                notifications to Google Pub/Sub; a streaming-pull worker with a
                configurable goroutine pool fetches each email, parses
                Grailed/Depop/eBay sale confirmations, and upserts exactly one
                order per marketplace order ID through the Spring API.
                Unparseable emails are nacked and dead-lettered.
              </li>
            </ul>

            <div className={styles.body}>
              <p>
                <strong>How I test it.</strong>{" "}
                <code className={styles.code}>./scripts/verify.sh</code> runs
                everything and fails if any part does. On the frontend
                that&apos;s ESLint, tsc and Vitest with Testing Library,
                including axe accessibility checks on each page. The backend
                runs its JUnit tests against a real PostgreSQL through
                Testcontainers, so the SQL views are tested for real and not
                mocked. The worker runs go vet and go test in Docker, with
                sample Grailed, Depop and eBay emails as parser fixtures.
              </p>
            </div>
          </div>

          <details className={styles.details}>
            <summary>
              If you have a use case for this, here&apos;s how to set it up
              locally
            </summary>
            <div className={styles.detailsBody}>
              <h3 className={styles.subTitle}>Quick start (Docker)</h3>
              <pre className={styles.pre}>{DOCKER_COMMANDS}</pre>
              <div className={styles.body}>
                <p>
                  UI on localhost:3000, API on localhost:8080, worker on
                  localhost:8090. The default stack runs the worker against the
                  Pub/Sub emulator with no Gmail token.
                </p>
              </div>

              <h3 className={styles.subTitle}>Native development</h3>
              <div className={styles.body}>
                <p>Requires Java 21, Node.js 20+, and PostgreSQL.</p>
              </div>
              <pre className={styles.pre}>{SETUP_COMMANDS}</pre>
              <div className={styles.body}>
                <p>
                  Datasource credentials are in{" "}
                  <code className={styles.code}>
                    app/src/main/resources/application.properties
                  </code>
                  . The Gmail worker is optional — see{" "}
                  <a
                    href="https://github.com/freddyp3/cashflow-tracker/blob/main/worker/README.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    worker/README.md
                  </a>
                  .
                </p>
              </div>
            </div>
          </details>
        </div>
      </div>
      <SiteNav active="nodes" variant="nodes" />
    </div>
  );
}
