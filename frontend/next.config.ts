import type { NextConfig } from "next";

// Cache Components is off: every page reads per-user state from the browser store, which cannot be cached
// ahead of time. Revisit when the backend serves cacheable data.
const nextConfig: NextConfig = {
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
