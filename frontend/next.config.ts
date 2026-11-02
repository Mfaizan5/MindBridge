import type { NextConfig } from "next";

// Cache Components is off: every page reads per-user data from the API, so nothing can be cached ahead of time.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Forward /api/v1 to the FastAPI backend. The browser then talks to one origin, so the session cookie
  // works without cross-site cookie rules.
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${API_ORIGIN}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
