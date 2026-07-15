"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Envoie un ping analytics à chaque navigation boutique.
 * Cookie httpOnly amg_vid géré côté API — pas de PII.
 */
export function VisitBeacon() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    void fetch("/api/analytics/visit", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {
      /* ignore — analytics non bloquant */
    });
  }, [pathname]);

  return null;
}
