import type { NextConfig } from "next";

const withSerwist = require("@serwist/next").default;

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Recommended for Docker / standalone deployments
  output: 'standalone',

  // Workaround for Next.js 16 + @serwist/next (webpack plugin) conflict.
  // Empty object tells Next to stay in Turbopack mode cleanly.
  // See: https://github.com/serwist/serwist/issues/54
  turbopack: {},

  // Security headers (production-ready dashboard)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default withSerwist({
  disable: process.env.NODE_ENV !== "production",
  cacheOnFrontEndNav: true,
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  globPatterns: ["app/**/*{js,css,svg}"],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  extendDefaultRuntimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: {
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: {
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/[^:]+\.supabaseapi\.com\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-api",
        expiration: {
          maxAgeSeconds: 60 * 5, // 5 minutes
        },
      },
    },
  ],
})(nextConfig);
