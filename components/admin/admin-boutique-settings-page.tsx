"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type { AppError } from "@/lib/api/errors";
import { safeFetch } from "@/lib/api/safe-fetch";
import { Button } from "@/components/ui/button";
import type { BoutiqueSettings } from "@/types/boutique";

type BoutiqueTextFieldKey =
  | "siteName"
  | "parentCompany"
  | "phone"
  | "address"
  | "hours"
  | "instagramHandle";

const FIELDS: {
  key: BoutiqueTextFieldKey;
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
  /** Panne de chargement — distincte d'un formulaire jamais rempli. */
  const [loadError, setLoadError] = useState<AppError | null>(null);
  /** Au moins un chargement réussi : sinon un échec initial n'est pas « vide ». */
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    const result = await safeFetch<{ settings: BoutiqueSettings }>(
      "/api/admin/site-settings",
      { requireJson: true },
    );

    if (result.ok) {
      setSettings(result.data?.settings ?? null);
      setLoadError(null);
      setHasLoaded(true);
    } else {
      // On garde les coordonnées déjà affichées : une panne réseau ne les
      // efface pas, et un formulaire vidé serait enregistré tel quel.
      setLoadError(result.error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const result = await safeFetch<{ settings?: BoutiqueSettings }>(
        "/api/admin/site-settings",
        { method: "PATCH", json: settings },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      if (result.data?.settings) setSettings(result.data.settings);
      toast.success("Infos boutique enregistrées");
    } finally {
      setSaving(false);
    }
  };

  // Premier chargement en échec : afficher un formulaire vide ferait
  // enregistrer des coordonnées effacées. On propose de reprendre.
  if (loadError && !hasLoaded) {
    return (
      <div
        role="alert"
        className="mx-auto flex max-w-2xl flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" aria-hidden />
          <h2 className="font-display text-base font-semibold text-destructive">
            Impossible de charger les infos boutique
          </h2>
        </div>
        <p className="font-body text-sm text-muted-foreground">
          {loadError.message} Vos informations ne sont pas perdues : seul
          l&apos;affichage a échoué.
        </p>
        <Button
          type="button"
          size="sm"
          className="cursor-pointer gap-2"
          onClick={() => void load()}
        >
          <RefreshCw className="size-4" aria-hidden />
          Réessayer
        </Button>
      </div>
    );
  }

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

      {/* Panne survenue alors que les infos étaient déjà affichées : on garde
          les valeurs connues et on prévient, plutôt que de les vider. */}
      {loadError && hasLoaded && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3"
        >
          <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
          <p className="font-body text-sm text-destructive">
            {loadError.message} L&apos;affichage peut être périmé.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => void load()}
          >
            Réessayer
          </Button>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="font-body text-sm font-medium">
              {field.label}
            </label>
            <input
              value={String(settings[field.key] ?? "")}
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
