"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("✓ Service Worker registrado:", registration);

          // Escuchar actualizaciones disponibles
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // Nueva versión disponible, mostrar notificación
                  console.log("Nueva versión de la aplicación disponible. Actualiza la página.");
                  
                  // Opcional: enviar mensaje para actualizar
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn("Error registrando Service Worker:", error);
        });
    }
  }, []);

  return null;
}
