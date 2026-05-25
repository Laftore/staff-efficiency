import type { NextConfig } from "next";

const withSerwist = require("@serwist/next").default;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
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
