"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { safeFetch } from "@/lib/api/safe-fetch";

/**
 * Compte une page vue de la boutique.
 *
 * Sans ce composant, rien n'alimentait `SiteVisitorDay` : la route
 * d'enregistrement avait été supprimée et le compteur de visiteurs du
 * back-office restait bloqué à 0.
 *
 * Volontairement discret : une mesure qui échoue ne doit jamais gêner la
 * navigation ni afficher quoi que ce soit à la cliente.
 */
export function VisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // `keepalive` permet à la requête d'aboutir même si la cliente change de
    // page pendant l'envoi.
    void safeFetch("/api/analytics/visit", {
      method: "POST",
      keepalive: true,
      timeoutMs: 5_000,
    });
  }, [pathname]);

  return null;
}
