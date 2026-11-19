/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/webp"],
    // optimized images default to a 60s cache; media here rarely changes,
    // so let browsers and the CDN keep them for a day (rename a file to
    // replace it sooner)
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        // files in public/ are served with max-age=0 by default, which makes
        // every visit revalidate each video and sprite
        source: "/:dir(img|greyhound)/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/nodes", destination: "/about", permanent: false },
      { source: "/greyhound", destination: "/", permanent: false },
      { source: "/contact", destination: "/contact-me", permanent: false },
      {
        source: "/projects/cashflow-tracker",
        destination: "/write-ups/cashflow-tracker",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
