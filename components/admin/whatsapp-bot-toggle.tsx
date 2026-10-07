"use client";

import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";

type Props = {
  initialEnabled: boolean;
  initialPausedMessage: string;
};

export function WhatsAppBotToggle({
  initialEnabled,
  initialPausedMessage,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pausedMessage, setPausedMessage] = useState(initialPausedMessage);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (nextEnabled: boolean, message?: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/whatsapp/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            whatsappBotEnabled: nextEnabled,
            whatsappBotPausedMessage:
              message !== undefined ? message : pausedMessage,
          }),
        });
        if (!res.ok) {
          setError("Enregistrement impossible.");
          return;
        }
        const data = (await res.json()) as {
          whatsappBotEnabled: boolean;
          whatsappBotPausedMessage: string;
        };
        setEnabled(data.whatsappBotEnabled);
        setPausedMessage(data.whatsappBotPausedMessage);
      } catch {
        setError("Réseau indisponible.");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-background px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-body text-sm font-medium text-foreground">
            Assistant automatique
          </p>
          <p className="mt-0.5 font-body text-xs text-muted-foreground">
            {enabled
              ? "Réponses bot actives."
              : "Pause — vous répondez depuis l’inbox Kapso."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending}
          onClick={() => save(!enabled)}
          className={cn(
            "relative h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            enabled ? "bg-primary" : "bg-muted-foreground/30",
            pending && "opacity-60",
          )}
        >
          <span
            className={cn(
              "absolute top-1 size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
              enabled ? "left-7" : "left-1",
            )}
          />
        </button>
      </div>

      {!enabled ? (
        <label className="mt-4 block">
          <span className="font-body text-xs text-muted-foreground">
            Message auto (optionnel)
          </span>
          <textarea
            value={pausedMessage}
            onChange={(e) => setPausedMessage(e.target.value)}
            onBlur={() => save(false, pausedMessage)}
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl border border-border bg-muted/20 px-3 py-2 font-body text-sm text-foreground transition focus-visible:border-primary focus-visible:outline-none"
            placeholder="Bonjour, l’assistant est en pause…"
          />
        </label>
      ) : null}

      {error ? (
        <p className="mt-2 font-body text-xs text-destructive">{error}</p>
      ) : null}
    </section>
  );
}
