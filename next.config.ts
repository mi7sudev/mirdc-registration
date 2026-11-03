import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* local-server event app: fully dynamic, no static cache */
  cacheComponents: false,
  partialPrefetching: false,
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
