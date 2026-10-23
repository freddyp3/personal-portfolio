import { Montserrat } from "next/font/google";
import Link from "next/link";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400"] });

const textBase = `${montserrat.className} text-[12px] uppercase leading-[1.35] tracking-[0.03em] sm:text-[13px]`;
const transition = {
  transition: "color 0.22s cubic-bezier(0.25, 0.7, 0.25, 1)",
};

function linkCls(active: boolean, extra = "") {
  return `${textBase} cursor-pointer ${
    active ? "text-black" : "text-[#b5b5b5] hover:text-black"
  } focus-visible:text-black focus-visible:underline focus-visible:outline-none ${extra}`;
}

export default function SiteNav({
  active,
  variant = "fixed",
}: {
  active: "home" | "nodes" | "contact";
  variant?: "fixed" | "nodes";
}) {
  return (
    <nav
      aria-label="Site"
      className={`fixed bottom-1 left-6 z-[200] flex flex-col sm:bottom-5 sm:left-[6vw] ${
        variant === "nodes"
          ? // on stacked layouts the nav flows at the end of the scroll
            // column instead of overlaying bottom-left content
            "max-[1200px]:static max-[1200px]:mb-6 max-[1200px]:ml-6 max-[1200px]:mt-8"
          : ""
      }`}
    >
      <Link href="/about" className={linkCls(false)} style={transition}>
        Fredrik Pettit
      </Link>
      {/* About opens the node view with the About me page open; coming from
          another page it also shows a "click me" hint on the orange node */}
      <Link
        href={
          active === "nodes" ? "/about?node=about" : "/about?node=about&hint=1"
        }
        aria-current={active === "nodes" ? "page" : undefined}
        className={linkCls(active === "nodes", "mt-[1.35em]")}
        style={transition}
      >
        About
      </Link>
      <Link
        href="/contact-me"
        aria-current={active === "contact" ? "page" : undefined}
        className={linkCls(active === "contact")}
        style={transition}
      >
        Contact
      </Link>
      <Link
        href="/"
        aria-current={active === "home" ? "page" : undefined}
        className={linkCls(active === "home", "mt-[1.35em]")}
        style={transition}
      >
        Home
      </Link>
    </nav>
  );
}
