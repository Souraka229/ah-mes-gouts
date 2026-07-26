"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Notifications nouvelles commandes (KDS) : bip sonore + notification desktop.
 * Activable/désactivable — préférence mémorisée dans localStorage.
 *
 * Important : le déverrouillage audio doit rester dans un vrai geste utilisateur
 * (clic sur « Alertes »), jamais dans un updater setState.
 */

const STORAGE_KEY = "amg-kds-notifications";

type NotificationPermissionState = "default" | "granted" | "denied";

export type OrderNotificationsState = {
  enabled: boolean;
  permission: NotificationPermissionState;
  /** Audio bien déverrouillé après activation. */
  audioReady: boolean;
  toggle: () => void;
  /** Test manuel du bip (depuis un clic). */
  testSound: () => void;
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

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
}

export function useOrderNotifications(): OrderNotificationsState {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermissionState>("default");
  const [audioReady, setAudioReady] = useState(false);

  const enabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const stored = readStoredPreference();
    setEnabled(stored);
    enabledRef.current = stored;
    setPermission(getPermission());
  }, []);

  const ensureContext = useCallback(async (): Promise<AudioContext | null> => {
    const AudioCtx = getAudioContextConstructor();
    if (!AudioCtx) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return null;
      }
    }
    setAudioReady(ctx.state === "running");
    return ctx.state === "running" ? ctx : null;
  }, []);

  const playChime = useCallback(async () => {
    const ctx = await ensureContext();
    if (!ctx) return false;

    try {
      const now = ctx.currentTime;
      // Ding-dong plus audible (gain plus haut, durée un peu plus longue).
      const notes = [
        { freq: 880, start: 0, peak: 0.45 },
        { freq: 1174.66, start: 0.16, peak: 0.4 },
        { freq: 1318.51, start: 0.34, peak: 0.28 },
      ];

      for (const note of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = note.freq;
        const t = now + note.start;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(note.peak, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.45);
      }
      return true;
    } catch {
      return false;
    }
  }, [ensureContext]);

  const notify = useCallback(
    (title: string, body: string) => {
      if (!enabledRef.current) return;
      void playChime();

      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      // Desktop même si l'onglet est visible : utile en cuisine multi-écrans.
      try {
        new Notification(title, {
          body,
          icon: "/brand/logo-amg.png",
          tag: "amg-new-order",
          requireInteraction: false,
        });
      } catch {
        // Ignore — le bip a déjà été tenté.
      }
    },
    [playChime],
  );

  const testSound = useCallback(() => {
    void playChime();
  }, [playChime]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    }

    if (!next) return;

    // Geste utilisateur : déverrouille l'audio + test immédiat.
    void playChime();

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission().then((result) => {
        setPermission(result as NotificationPermissionState);
      });
    } else {
      setPermission(getPermission());
    }
  }, [playChime]);

  // Si l'utilisateur revient sur l'onglet avec alertes ON, tente de réveiller l'audio.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && enabledRef.current) {
        void ensureContext();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [ensureContext]);

  useEffect(() => {
    return () => {
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  return {
    enabled,
    permission,
    audioReady,
    toggle,
    testSound,
    notify,
  };
}
