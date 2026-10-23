import SiteNav from "@/components/SiteNav";
import { TabIcon } from "@/components/nodes/shapes";
import styles from "@/components/writeup/writeup.module.css";
import { promises as fs } from "fs";
import Link from "next/link";
import path from "path";
import ReactMarkdown from "react-markdown";

async function getPrivacyContent() {
  const filePath = path.join(process.cwd(), "src/data/privacy.md");
  const content = await fs.readFile(filePath, "utf-8");
  return content;
}

export default async function PrivacyPage() {
  const privacyContent = await getPrivacyContent();

  return (
    <div className={styles.root}>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.headerRow}>
            <span className={styles.tabIcon}>
              <TabIcon kind="info" />
            </span>
            <span className={styles.tabTitle}>Privacy</span>
            <Link href="/" className={styles.closePage}>
              Go back
            </Link>
          </div>

          <div className={styles.mainTitle}>
            <h2>Privacy policy</h2>
          </div>

          <div className={styles.body}>
            <ReactMarkdown>{privacyContent}</ReactMarkdown>
          </div>
        </div>
      </div>
      <SiteNav active="nodes" variant="nodes" />
    </div>
  );
}
