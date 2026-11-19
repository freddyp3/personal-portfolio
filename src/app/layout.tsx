import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const geist = GeistSans;

export const metadata: Metadata = {
  title: { default: "Fredrik Pettit", template: "%s | Fredrik Pettit" },
  description:
    "Fredrik Pettit studies computer science at the University of British Columbia and builds AI agents, machine learning systems and backend services.",
  openGraph: {
    type: "website",
    siteName: "Fredrik Pettit",
  },
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
  },
  manifest: "/manifest.json",
};

// the site has one (light) look: tell the browser so its chrome, form
// controls and overscroll area match the page instead of the OS dark mode
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f6f2",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-[rgb(245,246,242)] font-sans antialiased",
          geist.variable,
        )}
      >
        <main>{children}</main>
      </body>
    </html>
  );
}
