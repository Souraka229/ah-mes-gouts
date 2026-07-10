"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import type { SiteSettings } from "@/types/site-content";

export function AdminSettingsGeneralPage() {
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
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success("Paramètres enregistrés");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const colors = settings.brandColors;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Général</h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Nom du site, identité visuelle et couleurs de marque.
        </p>
      </div>

      <div
        className="rounded-2xl border border-border p-6"
        style={{
          background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.secondary}33 100%)`,
        }}
      >
        <p className="font-display text-2xl font-bold" style={{ color: colors.primary }}>
          {settings.siteName || SITE_NAME_WITH_CREDIT}
        </p>
        <p className="mt-2 font-body text-sm" style={{ color: colors.accent }}>
          Aperçu live des couleurs
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
        <div>
          <label className="font-body text-sm font-medium">Nom du site</label>
          <input
            value={settings.siteName}
            onChange={(e) =>
              setSettings({ ...settings, siteName: e.target.value })
            }
            placeholder={`Ex: ${SITE_NAME_WITH_CREDIT}`}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["bg", "Fond crème"],
              ["primary", "Violet profond"],
              ["secondary", "Rose poudré"],
              ["accent", "Doré"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="font-body text-sm font-medium">{label}</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      brandColors: { ...colors, [key]: e.target.value },
                    })
                  }
                  className="size-10 cursor-pointer rounded border border-border"
                />
                <input
                  value={colors[key]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      brandColors: { ...colors, [key]: e.target.value },
                    })
                  }
                  className="flex-1 rounded-lg border border-border px-3 py-2 font-mono text-sm uppercase"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
