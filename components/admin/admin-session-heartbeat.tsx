"use client";

import { useEffect } from "react";

/**
 * Maintient la session admin vivante sur les onglets longtemps ouverts
 * et après une coupure réseau.
 *
 * - Au retour en ligne / focus onglet → ping immédiat
 * - Toutes les 6 h en arrière-plan (bien sous le plafond cookie 400 j)
 *
 * L'endpoint re-signe le JWT si la DB a prolongé la session.
 */
const HEARTBEAT_MS = 6 * 60 * 60 * 1000;

async function pingSession(): Promise<void> {
  try {
    await fetch("/api/admin/auth", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    // Hors ligne : on réessaiera au prochain `online` / focus.
  }
}

export function AdminSessionHeartbeat() {
  useEffect(() => {
    void pingSession();

    const onVisible = () => {
      if (document.visibilityState === "visible") void pingSession();
    };
    const onOnline = () => void pingSession();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => void pingSession(), HEARTBEAT_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
