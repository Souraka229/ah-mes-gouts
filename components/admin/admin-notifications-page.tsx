"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import type { SiteSettings } from "@/types/site-content";

type TelegramSettings = {
  connectUrl: string | null;
  botUsername: string | null;
  configured: boolean;
  highValueThresholdFcfa: number;
  subscribers: Array<{
    id: string;
    chatId: string;
    label: string;
    isActive: boolean;
  }>;
};

export function AdminNotificationsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [telegram, setTelegram] = useState<TelegramSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [manualChatId, setManualChatId] = useState("");

  const load = useCallback(async () => {
    const [settingsRes, telegramRes] = await Promise.all([
      fetch("/api/admin/site-settings", { cache: "no-store" }),
      fetch("/api/admin/telegram", { cache: "no-store" }),
    ]);
    const data = (await settingsRes.json()) as { settings: SiteSettings };
    setSettings(data.settings);
    if (telegramRes.ok) {
      setTelegram((await telegramRes.json()) as TelegramSettings);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationTemplates: settings.notificationTemplates,
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Templates enregistrés");
    } catch {
      toast.error("Enregistrement échoué");
    } finally {
      setSaving(false);
    }
  };

  const linkManual = async () => {
    try {
      const res = await fetch("/api/admin/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: manualChatId.trim(), label: "Manuelle" }),
      });
      if (!res.ok) throw new Error("fail");
      toast.success("Chat Telegram lié");
      setManualChatId("");
      void load();
    } catch {
      toast.error("Liaison impossible");
    }
  };

  if (!settings) {
    return <Loader2 className="size-8 animate-spin text-primary" />;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-start gap-3">
          <Send className="mt-0.5 size-5 text-primary" aria-hidden />
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-primary">
                Alertes Telegram (cheffe)
              </h2>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                Push : nouvelle commande, stock bas, anomalie sécurité, résumé
                19h. Jamais bloquant si Telegram est down.
              </p>
            </div>
            {!telegram?.configured ? (
              <p className="font-body text-sm text-muted-foreground">
                Bot non configuré — renseigner{" "}
                <code className="text-xs">TELEGRAM_BOT_TOKEN</code> côté serveur.
              </p>
            ) : (
              <>
                {telegram.connectUrl && (
                  <a
                    href={telegram.connectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent px-4 py-2 font-body text-sm font-semibold text-text"
                  >
                    Connecter mon Telegram
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                )}
                <p className="font-body text-xs text-muted-foreground">
                  Seuil commande importante :{" "}
                  {telegram.highValueThresholdFcfa.toLocaleString("fr-FR")} FCFA
                </p>
                {telegram.subscribers.length > 0 && (
                  <ul className="font-body text-sm text-muted-foreground">
                    {telegram.subscribers.map((s) => (
                      <li key={s.id}>
                        {s.label || "Abonné"} · {s.isActive ? "actif" : "off"}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    value={manualChatId}
                    onChange={(e) => setManualChatId(e.target.value)}
                    placeholder="Chat ID (secours)"
                    className="min-h-11 rounded-xl border border-border px-3 font-body text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void linkManual()}
                    className="min-h-11 cursor-pointer rounded-xl border border-border px-4 font-body text-sm font-medium"
                  >
                    Lier manuellement
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <div>
        <h1 className="font-display text-2xl font-bold text-primary">
          Notifications clients
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Variables : {"{{prenom}}"}, {"{{numero_commande}}"}, {"{{mode_livraison}}"}
        </p>
      </div>
      <div className="space-y-4">
        {settings.notificationTemplates.map((tpl, i) => (
          <div
            key={tpl.id}
            className="rounded-2xl border border-border bg-white p-4"
          >
            <label className="font-body text-sm font-medium">{tpl.label}</label>
            <textarea
              value={tpl.body}
              onChange={(e) => {
                const next = [...settings.notificationTemplates];
                next[i] = { ...tpl, body: e.target.value };
                setSettings({ ...settings, notificationTemplates: next });
              }}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="cursor-pointer rounded-xl bg-primary px-4 py-2 font-body text-sm font-semibold text-white"
      >
        Enregistrer
      </button>
    </div>
  );
}
