"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { BoutiqueSettings } from "@/types/boutique";

const FIELDS: {
  key: keyof Omit<BoutiqueSettings, "updatedAt">;
  label: string;
  placeholder: string;
}[] = [
  { key: "siteName", label: "Nom du site", placeholder: "Ex: Ah Mes Goûts" },
  {
    key: "phone",
    label: "Téléphone",
    placeholder: "Ex: +229 01 97 31 07 42",
  },
  {
    key: "address",
    label: "Adresse",
    placeholder: "Ex: Fidjrosse, Cotonou, Bénin",
  },
  {
    key: "hours",
    label: "Horaires",
    placeholder: "Ex: Mar – Dim · 10h00 – 20h00",
  },
  {
    key: "instagramHandle",
    label: "Instagram",
    placeholder: "Ex: @ahmesgouts",
  },
];

export function AdminBoutiqueSettingsPage() {
  const [settings, setSettings] = useState<BoutiqueSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/site-settings", { cache: "no-store" });
    const data = (await res.json()) as { settings: BoutiqueSettings };
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
      const data = (await res.json()) as {
        settings?: BoutiqueSettings;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error);
      if (data.settings) setSettings(data.settings);
      toast.success("Infos boutique enregistrées");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">
          Infos boutique
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Nom, contact et horaires affichés à vos clients.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="font-body text-sm font-medium">
              {field.label}
            </label>
            <input
              value={settings[field.key]}
              onChange={(e) =>
                setSettings({ ...settings, [field.key]: e.target.value })
              }
              placeholder={field.placeholder}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="cursor-pointer rounded-xl bg-primary px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
