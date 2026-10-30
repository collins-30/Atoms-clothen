import type { NextConfig } from "next";

// Images uploaded to Cloudflare R2 are served from R2_PUBLIC_URL. next/image only
// loads pictures from hosts listed here, so that address is allowed automatically.
// (Restart `npm run dev` after changing it in .env.)
const r2 = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL) : null;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: r2
      ? [
          {
            protocol: r2.protocol.replace(":", "") as "http" | "https",
            hostname: r2.hostname,
            port: r2.port,
            pathname: `${r2.pathname.replace(/\/+$/, "")}/**`,
          },
        ]
      : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
