import SiteNav from "@/components/SiteNav";
import { TabIcon } from "@/components/nodes/shapes";
import styles from "@/components/writeup/writeup.module.css";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className={styles.root}>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.headerRow}>
            <span className={styles.tabIcon}>
              <TabIcon kind="info" />
            </span>
            <span className={styles.tabTitle}>404</span>
            <Link href="/" className={styles.closePage}>
              Go back
            </Link>
          </div>

          <div className={styles.mainTitle}>
            <h2>Page not found</h2>
          </div>

          <div className={styles.body}>
            <p>This page doesn&apos;t exist or may have moved.</p>
          </div>
        </div>
      </div>
      <SiteNav active="nodes" variant="nodes" />
    </div>
  );
}
