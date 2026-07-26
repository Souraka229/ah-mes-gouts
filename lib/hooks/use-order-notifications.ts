"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Notifications nouvelles commandes (KDS) : bip sonore + notification desktop.
 * Activable/désactivable — la préférence est mémorisée dans localStorage.
 *
 * Le son est généré via Web Audio (aucun fichier à charger) et la notification
 * desktop via l'API Notification standard. Les deux dégradent proprement si
 * indisponibles (navigateur ancien, permission refusée, onglet non focus).
 */

const STORAGE_KEY = "amg-kds-notifications";

type NotificationPermissionState = "default" | "granted" | "denied";

export type OrderNotificationsState = {
  /** Préférence utilisateur (bouton on/off). */
  enabled: boolean;
  /** État de la permission navigateur pour les notifications desktop. */
  permission: NotificationPermissionState;
  /** Bascule on/off — demande la permission desktop à la première activation. */
  toggle: () => void;
  /** Déclenche le bip + la notification desktop pour une nouvelle commande. */
  notify: (title: string, body: string) => void;
};

function readStoredPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "on";
}

function getPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission as NotificationPermissionState;
}

export function useOrderNotifications(): OrderNotificationsState {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermissionState>("default");
  const audioContextRef = useRef<AudioContext | null>(null);

  // Restaure la préférence au montage (évite un mismatch d'hydratation SSR).
  useEffect(() => {
    setEnabled(readStoredPreference());
    setPermission(getPermission());
  }, []);

  const playChime = useCallback(() => {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      // Certains navigateurs suspendent le contexte tant qu'il n'y a pas
      // d'interaction — on le réveille (no-op s'il est déjà actif).
      void ctx.resume();

      const now = ctx.currentTime;
      // Deux notes montantes (ding-dong) — court, non agressif.
      const notes = [
        { freq: 880, start: 0 },
        { freq: 1174.66, start: 0.18 },
      ];
      for (const note of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = note.freq;
        const t = now + note.start;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      }
    } catch {
      // Audio indisponible — on ignore silencieusement.
    }
  }, []);

  const notify = useCallback(
    (title: string, body: string) => {
      if (!enabled) return;
      playChime();

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.visibilityState !== "visible"
      ) {
        try {
          new Notification(title, {
            body,
            icon: "/brand/logo-amg.png",
            tag: "amg-new-order",
          });
        } catch {
          // Notification desktop indisponible — le bip a déjà joué.
        }
      }
    },
    [enabled, playChime],
  );

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      }

      // À l'activation : réveille l'audio (geste utilisateur) et demande la
      // permission desktop si elle n'a pas encore été accordée/refusée.
      if (next) {
        playChime();
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "default"
        ) {
          void Notification.requestPermission().then((result) => {
            setPermission(result as NotificationPermissionState);
          });
        }
      }
      return next;
    });
  }, [playChime]);

  return { enabled, permission, toggle, notify };
}
