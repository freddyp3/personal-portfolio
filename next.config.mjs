/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/webp"],
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
