"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { SiteSettings } from "@/types/site-content";

export function AdminNotificationsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/site-settings", { cache: "no-store" });
    const data = (await res.json()) as { settings: SiteSettings };
    setSettings(data.settings);
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

  if (!settings) {
    return <Loader2 className="size-8 animate-spin text-primary" />;
  }

  return (
    <div className="space-y-6">
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
        className="rounded-xl bg-primary px-4 py-2 font-body text-sm font-semibold text-white"
      >
        Enregistrer
      </button>
    </div>
  );
}
