import DemoVideo from "@/components/DemoVideo";
import SiteNav from "@/components/SiteNav";
import { TabIcon } from "@/components/nodes/shapes";
import styles from "@/components/writeup/writeup.module.css";
import ZoomImage from "@/components/writeup/ZoomImage";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "YouTube Short Copilot",
  description:
    "Ask a chatbot whether people will watch your Short to the end, before you post it (for Brawl Stars specific content).",
};

const SETUP_COMMANDS = `pip install -r requirements.txt
python -m src.server.auth create --label me            # prints an access token once
SO_PUBLIC_BASE_URL=https://your-address python -m src.server.app
python -m pytest tests/`;

export default function YoutubeShortsWriteUp() {
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
              href="/about?node=youtube-shorts-ai-optimizer"
              className={styles.closePage}
            >
              Go back
            </Link>
          </div>

          <div className={styles.mainTitle}>
            <h2>YouTube Short Copilot</h2>
          </div>

          <div className={styles.source}>
            <a
              href="https://github.com/freddyp3/short-optimizer"
              target="_blank"
              rel="noreferrer"
            >
              Source ↗
            </a>
          </div>

          <div className={styles.body}>
            <p>
              Ask a chatbot whether people will watch your Short to the end,
              before you post it (for Brawl Stars specific content). You give
              Claude a draft YouTube Short. Claude calls this project&apos;s
              tools and writes a publish plan: how the opening, middle and
              ending are expected to hold viewers, where they are most likely to
              leave, what to change, and how the audience is likely to react.
            </p>

            <ZoomImage
              src="/img/youtube-shorts-architecture.png"
              alt="Architecture: the creator asks Claude, Claude calls the MCP server, features are extracted by Gemini and code, then retention prediction and audience reaction return to Claude, which writes the publish plan"
              width={3150}
              height={1144}
              className={styles.media}
            />

            <p>
              I built and use this for my own Brawl Stars channel (
              <a
                href="https://www.youtube.com/@alfie369k/shorts"
                target="_blank"
                rel="noreferrer"
              >
                @alfie369k
              </a>
              ).
            </p>
            <p>Channel stats:</p>
            <ul className={styles.list}>
              <li>46.7M views</li>
              <li>393.6K watch time hours</li>
              <li>38.7K subscribers</li>
              <li>1.8M likes</li>
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>how it works</span>
            <ol className={styles.list}>
              <li>
                <strong>Connect.</strong> The project runs as an MCP server; in
                Claude it is added once as a custom connector.
              </li>
              <li>
                <strong>Upload.</strong> Claude hands out a one-time upload link,
                because chatbots do not pass video files to tools.
              </li>
              <li>
                <strong>Extract features.</strong> Gemini watches the draft and
                writes a second-by-second description plus a fixed checklist of
                structure features. Code measures cuts, first and last frame, and
                length.
              </li>
              <li>
                <strong>Predict retention.</strong> Each part of the curve goes
                to the method that was built off of or inspired by research:
                <ul>
                  <li>
                    an LLM judge (Gemini, reading the description) for where
                    viewers leave and the middle of the video;
                  </li>
                  <li>a random forest for the opening and the ending;</li>
                  <li>
                    a ridge regression over the video, moment by moment, for the
                    shape of the curve.
                  </li>
                </ul>
              </li>
              <li>
                <strong>Audience reaction.</strong> How viewers are likely to
                respond is built from two sources of evidence:
                <ul>
                  <li>
                    the real comments on the most similar past Shorts, grouped
                    by theme;
                  </li>
                  <li>
                    a web search by Claude on the draft&apos;s topics, for what the
                    Brawl Stars community is saying right now.
                  </li>
                </ul>
              </li>
              <li>
                <strong>Answer.</strong> Claude writes the publish plan. Every
                fix and idea in it has to come from a tool result.
              </li>
            </ol>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>the models used and why</span>
            <ul className={styles.list}>
              <li>
                <strong>Gemini, for feature extraction.</strong> It takes video
                and audio directly, so it can write the second-by-second
                description and fill in a fixed checklist of structure features
                that everything else works from.
              </li>
              <li>
                <strong>LLM-as-a-judge (Gemini), for the middle and the drop-off points.</strong>{" "}
                Gemini reads the text description, not the video, and estimates
                where viewers leave. This is inspired by{" "}
                <a
                  href="https://aclanthology.org/2025.findings-acl.597/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <em>Large Language Models Are Natural Video Popularity Predictors</em>
                </a>{" "}
                (Kayal et al., ACL Findings 2025), which found that a language
                model can predict how a video performs once the video has been
                turned into text.
              </li>
              <li>
                <strong>Random forest, for the opening and the ending.</strong>{" "}
                These depend on structure: how late the main payoff comes and how
                much video is left after it. The effects have thresholds (a long
                tail after the payoff hurts, a short one does not), which trees
                capture. With about 150 training videos the model has to stay
                small, so it uses nine features (sample-size guidance from Riley
                et al.,{" "}
                <a
                  href="https://onlinelibrary.wiley.com/doi/10.1002/sim.7993"
                  target="_blank"
                  rel="noreferrer"
                >
                  <em>Statistics in Medicine</em>
                </a>
                , 2019).
              </li>
              <li>
                <strong>Ridge regression, for the shape of the curve.</strong>{" "}
                It goes through the video moment by moment and predicts how many
                of the remaining viewers leave at each one. Put together, those
                predictions form the retention curve. Every moment of every past
                Short is a training example, so a few hundred videos become tens
                of thousands of examples. The idea comes from{" "}
                <a
                  href="https://doi.org/10.15407/jai2026.01.127"
                  target="_blank"
                  rel="noreferrer"
                >
                  <em>Multimodal Metric Learning for Fine-Grained Video Retention Prediction in Ego-Centric Networks</em>
                </a>{" "}
                (2026), which models retention on a single creator&apos;s channel in
                the same way.
              </li>
              <li>
                <strong>Sentence embeddings (`all-mpnet-base-v2`), for similar Shorts.</strong>{" "}
                Descriptions are compared by cosine similarity to retrieve the
                closest past Shorts with their real retention and comments, as
                evidence.
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>why not just predict views?</span>
            <div className={styles.body}>
              <p>
                Views depend mostly on distribution, not on the video: on this
                channel the median Short has about 13,000 and the largest 10.6
                million. Retention is decided by the video itself and can be
                checked against real curves, so that is what the tool predicts,
                and only relative to the channel&apos;s own past Shorts.
              </p>
              <p>
                This follows{" "}
                <a
                  href="https://doi.org/10.1007/978-3-031-72949-2_17"
                  target="_blank"
                  rel="noreferrer"
                >
                  <em>Delving Deep into Engagement Prediction of Short Videos</em>
                </a>{" "}
                (Li et al., ECCV 2024; 90,000 Snapchat videos), which argues
                against view count and raw watch time as targets and uses watch
                percentage adjusted for video length. The targets here apply the
                same idea to the opening, middle and ending separately.
              </p>
              <p>
                What I tried before this: asking Gemini to judge
                the video directly (it scored at chance), one model for overall
                retention (the score mixes too many things, so nothing beat the
                average), gradient boosting (no better than the forest on this
                little data) and TabPFN (too small a gain to be worth it, and its
                licence rules out production use). More in{" "}
                <a
                  href="https://github.com/freddyp3/short-optimizer/blob/main/RESULTS.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  RESULTS.md
                </a>
                .
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>evaluation</span>
            <div className={styles.body}>
              <p>
                Every prediction was tested on videos the system had never seen,
                with the pass rule written down before the test set was opened.
                Method, numbers and what failed:{" "}
                <a
                  href="https://github.com/freddyp3/short-optimizer/blob/main/RESULTS.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  RESULTS.md
                </a>
                .
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>tools (MCP)</span>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Returns</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code className={styles.code}>start_draft</code>
                  </td>
                  <td>a draft id and a one-time upload link</td>
                </tr>
                <tr>
                  <td>
                    <code className={styles.code}>get_draft_status</code>
                  </td>
                  <td>where the analysis is</td>
                </tr>
                <tr>
                  <td>
                    <code className={styles.code}>get_retention</code>
                  </td>
                  <td>
                    verdicts for opening, middle and ending with reasons, drop
                    moments, advice
                  </td>
                </tr>
                <tr>
                  <td>
                    <code className={styles.code}>get_similar_shorts</code>
                  </td>
                  <td>the closest past Shorts with real retention and top comments</td>
                </tr>
                <tr>
                  <td>
                    <code className={styles.code}>get_audience_brief</code>
                  </td>
                  <td>
                    the draft&apos;s description, real comments by theme, and
                    research instructions
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <details className={styles.details}>
            <summary>Running it</summary>
            <div className={styles.detailsBody}>
              <pre className={styles.pre}>{SETUP_COMMANDS}</pre>
              <div className={styles.body}>
                <p>
                  Needs ffmpeg and a Gemini API key (
                  <code className={styles.code}>GEMINI_API_KEY_PAID</code>).
                  The server needs the channel&apos;s exported data and fitted
                  library under <code className={styles.code}>data/</code>, which
                  is not in the repository. Uploads are limited to 8-60 seconds,
                  checked before any paid call, and deleted after analysis;
                  access is by per-user token with daily limits and spend caps.
                </p>
              </div>
            </div>
          </details>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>layout</span>
            <ul className={styles.list}>
              <li>
                <code className={styles.code}>src/channel_export/</code>:
                OAuth export of the channel&apos;s own data
              </li>
              <li>
                <code className={styles.code}>src/tools/analyze_video/</code>:
                Gemini extraction prompt, schema, code-measured features
              </li>
              <li>
                <code className={styles.code}>src/models/</code>: training,
                cross-validation, the held-out protocol
              </li>
              <li>
                <code className={styles.code}>src/tools/predict_retention/</code>,{" "}
                <code className={styles.code}>src/tools/audience/</code>: the
                tools&apos; logic
              </li>
              <li>
                <code className={styles.code}>src/server/</code>: MCP server,
                upload page, auth, quotas
              </li>
              <li>
                <code className={styles.code}>docs/architecture.html</code>: the
                interactive diagram
              </li>
            </ul>
            <div className={styles.body}>
              <p>
                It is trained on my channel only. If you want to run it on your
                own channel&apos;s data, I can see it working without changing much:
                export your channel, re-run the feature extraction and refit the
                models. I have not tested that.
              </p>
            </div>
          </div>
        </div>
      </div>
      <SiteNav active="nodes" variant="nodes" />
    </div>
  );
}
