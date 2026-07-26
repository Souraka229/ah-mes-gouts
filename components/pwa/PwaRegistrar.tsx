"use client";

import { useEffect } from "react";

type PwaRegistrarProps = {
  serviceWorker: string;
  scope: string;
};

/** Enregistre un service worker limité au périmètre de l'application. */
export function PwaRegistrar({
  serviceWorker,
  scope,
}: PwaRegistrarProps) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker
        .register(serviceWorker, { scope })
        .catch(() => {
          // L'application reste utilisable dans un navigateur non compatible.
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, [scope, serviceWorker]);

  return null;
}
