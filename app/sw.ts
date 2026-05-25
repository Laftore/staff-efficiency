/// <reference lib="webworker" />
import { Serwist } from "serwist";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: (self as any).__SW_MANIFEST || [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname === "/" || url.pathname === "/dashboard",
      handler: new StaleWhileRevalidate({
        cacheName: "dashboard-cache",
        plugins: [
          {
            handlerDidError: async () => new Response("Página no disponible offline"),
          },
        ],
      }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/shifts") || url.pathname.startsWith("/inventory"),
      handler: new StaleWhileRevalidate({
        cacheName: "pages-cache",
      }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/api"),
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 3,
      }),
    },
  ],
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

export {};
