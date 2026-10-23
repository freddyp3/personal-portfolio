import SiteNav from "@/components/SiteNav";
import { PROJECT_GROUPS } from "@/components/nodes/data";
import { TabIcon } from "@/components/nodes/shapes";
import ProjectImage from "@/components/projects/ProjectImage";
import styles from "@/components/projects/projects.module.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Projects",
};

export default function ProjectsPage() {
  // running index across groups so only the first two rendered images preload
  let imgIndex = 0;
  return (
    <div className={styles.root}>
      <div className={styles.column}>
        <div className={styles.headerRow}>
          <span className={styles.tabIcon}>
            <TabIcon kind="project" />
          </span>
          <span className={styles.tabTitle}>Projects</span>
          <Link href="/about" className={styles.closePage}>
            Go back
          </Link>
        </div>

        <div className={styles.mainTitle}>
          <h2>All projects</h2>
          <h4>Everything I&apos;ve built, including what&apos;s not on the map</h4>
        </div>

        {PROJECT_GROUPS.map((g) => (
          <section key={g.title}>
            <div className={styles.groupLabel}>{g.title}</div>
            <div className={styles.grid}>
              {g.items.map((p) => {
                const priority = p.image ? imgIndex++ < 2 : false;
                return (
                  <div key={p.id} className={styles.card}>
                    {p.image ? (
                      <div className={styles.image}>
                        <ProjectImage
                          src={p.image}
                          alt={p.title}
                          sizes="(max-width: 640px) calc(100vw - 48px), 404px"
                          priority={priority}
                        />
                      </div>
                    ) : null}
                  <h2 className={styles.cardTitle}>{p.title}</h2>
                  {p.subtitle ? (
                    <h4 className={styles.cardSubtitle}>{p.subtitle}</h4>
                  ) : null}
                  <p className={styles.description}>{p.description}</p>
                  {p.tags.length ? (
                    <p className={styles.tags}>{p.tags.join(" · ")}</p>
                  ) : null}
                  <div className={styles.links}>
                    {p.links.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {l.name} ↗
                      </a>
                    ))}
                    {p.readMore &&
                    !p.links.some((l) => l.href === p.readMore) ? (
                      p.readMore.startsWith("http") ? (
                        <a href={p.readMore} target="_blank" rel="noreferrer">
                          Read more ↗
                        </a>
                      ) : (
                        <Link href={p.readMore}>Read more</Link>
                      )
                    ) : null}
                    {p.mapHref ? <Link href={p.mapHref}>Open on map</Link> : null}
                  </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <SiteNav active="nodes" variant="nodes" />
    </div>
  );
}
