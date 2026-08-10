"use client";

import { Copy, Loader2, Plus, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SLOT_DURATION_OPTIONS } from "@/lib/delivery/constants";
import type {
  DeliveryConfig,
  DeliveryScheduleConfig,
  DeliveryZoneConfig,
  FulfillmentType,
} from "@/lib/delivery/types";
import { cn } from "@/lib/utils";

const ADMIN_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DAY_LABELS: Record<number, string> = {
  0: "Dimanche",
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
};

function ScheduleBlock({
  title,
  type,
  schedules,
  onChange,
  onDuplicate,
}: {
  title: string;
  type: FulfillmentType;
  schedules: DeliveryScheduleConfig[];
  onChange: (updated: DeliveryScheduleConfig) => void;
  onDuplicate: (sourceDay: number) => void;
}) {
  const typeSchedules = schedules.filter((s) => s.type === type);

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl font-semibold text-primary">
          {title}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer gap-2"
          onClick={() => onDuplicate(1)}
        >
          <Copy className="size-4" aria-hidden />
          Dupliquer sur tous les jours
        </Button>
      </div>

      <div className="space-y-4">
        {ADMIN_DAY_ORDER.map((dayOfWeek) => {
          const schedule = typeSchedules.find((s) => s.dayOfWeek === dayOfWeek);
          if (!schedule) return null;

          return (
            <div
              key={schedule.id}
              className="grid gap-3 rounded-xl border border-border/80 bg-bg/50 p-4 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <p className="font-body font-medium text-text">
                  {DAY_LABELS[dayOfWeek]}
                </p>
                <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={schedule.isActive}
                    onChange={(e) =>
                      onChange({ ...schedule, isActive: e.target.checked })
                    }
                    className="size-4 cursor-pointer accent-primary"
                  />
                  {schedule.isActive ? "Ouvert" : "Fermé"}
                </label>
              </div>

              <label className="font-body text-sm">
                <span className="mb-1 block text-muted-foreground">Début</span>
                <input
                  type="time"
                  value={schedule.startTime}
                  disabled={!schedule.isActive}
                  onChange={(e) =>
                    onChange({ ...schedule, startTime: e.target.value })
                  }
                  className="h-11 w-full cursor-pointer rounded-xl border border-border bg-card px-3"
                />
              </label>

              <label className="font-body text-sm">
                <span className="mb-1 block text-muted-foreground">Fin</span>
                <input
                  type="time"
                  value={schedule.endTime}
                  disabled={!schedule.isActive}
                  onChange={(e) =>
                    onChange({ ...schedule, endTime: e.target.value })
                  }
                  className="h-11 w-full cursor-pointer rounded-xl border border-border bg-card px-3"
                />
              </label>

              <label className="font-body text-sm">
                <span className="mb-1 block text-muted-foreground">Créneau</span>
                <select
                  value={schedule.slotDuration}
                  disabled={!schedule.isActive}
                  onChange={(e) =>
                    onChange({
                      ...schedule,
                      slotDuration: Number(e.target.value),
                    })
                  }
                  className="h-11 w-full cursor-pointer rounded-xl border border-border bg-card px-3"
                >
                  {SLOT_DURATION_OPTIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} min
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DeliverySettingsPage() {
  const [config, setConfig] = useState<DeliveryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [draftCost, setDraftCost] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/delivery", { cache: "no-store" });
      if (!response.ok) throw new Error("Accès refusé ou erreur serveur");
      const data = (await response.json()) as DeliveryConfig;
      setConfig(data);
    } catch {
      setMessage("Impossible de charger la configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfig = async (next: DeliveryConfig) => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/delivery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("Échec de sauvegarde");
      const saved = (await response.json()) as DeliveryConfig;
      setConfig(saved);
      setMessage("Modifications enregistrées — visibles immédiatement côté client.");
    } catch {
      setMessage("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const updateZone = (zoneId: string, patch: Partial<DeliveryZoneConfig>) => {
    if (!config) return;
    const zones = config.zones.map((z) =>
      z.id === zoneId ? { ...z, ...patch } : z,
    );
    const next = { ...config, zones };
    setConfig(next);
    void saveConfig(next);
  };

  const addZone = async () => {
    if (!config) return;
    const response = await fetch("/api/admin/delivery", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addZone: { name: "Nouvelle zone", cost: 500 },
      }),
    });
    if (response.ok) {
      const saved = (await response.json()) as DeliveryConfig;
      setConfig(saved);
      setMessage("Zone ajoutée.");
    }
  };

  const updateSchedule = (updated: DeliveryScheduleConfig) => {
    if (!config) return;
    const schedules = config.schedules.map((s) =>
      s.id === updated.id ? updated : s,
    );
    const next = { ...config, schedules };
    setConfig(next);
    void saveConfig(next);
  };

  const duplicateFromMonday = (type: FulfillmentType, sourceDay: number) => {
    if (!config) return;
    const source = config.schedules.find(
      (s) => s.type === type && s.dayOfWeek === sourceDay,
    );
    if (!source) return;

    const schedules = config.schedules.map((s) =>
      s.type === type
        ? {
            ...s,
            startTime: source.startTime,
            endTime: source.endTime,
            slotDuration: source.slotDuration,
            isActive: source.isActive,
          }
        : s,
    );
    const next = { ...config, schedules };
    setConfig(next);
    void saveConfig(next);
  };

  const sortedZones = useMemo(
    () => [...(config?.zones ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [config?.zones],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-body text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
        Chargement...
      </div>
    );
  }

  if (!config) {
    return (
      <p className="font-body text-destructive">
        Configuration indisponible. Vérifiez l&apos;accès admin.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <h1 className="font-display text-3xl font-semibold text-primary">
          Livraison & créneaux
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Modifications visibles immédiatement sur le site client.
        </p>
      </header>

      {message && (
        <p className="rounded-xl border border-secondary bg-secondary/20 px-4 py-3 font-body text-sm text-text">
          {message}
        </p>
      )}

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-2xl font-semibold text-primary">
            Zones de livraison
          </h2>
          <Button
            type="button"
            className="cursor-pointer gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => void addZone()}
          >
            <Plus className="size-4" aria-hidden />
            Ajouter une zone
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] font-body text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Zone</th>
                <th className="pb-3 pr-4 font-medium">Coût (FCFA)</th>
                <th className="pb-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {sortedZones.map((zone) => (
                <tr key={zone.id} className="border-b border-border/60">
                  <td className="py-3 pr-4">
                    <Input
                      value={zone.name}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          zones: config.zones.map((z) =>
                            z.id === zone.id
                              ? { ...z, name: e.target.value }
                              : z,
                          ),
                        })
                      }
                      onBlur={() => updateZone(zone.id, { name: zone.name })}
                      className="h-10"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    {editingCostId === zone.id ? (
                      <Input
                        type="number"
                        min={0}
                        value={draftCost}
                        autoFocus
                        onChange={(e) => setDraftCost(e.target.value)}
                        onBlur={() => {
                          const cost = Number(draftCost);
                          if (!Number.isNaN(cost) && cost >= 0) {
                            updateZone(zone.id, { cost });
                          }
                          setEditingCostId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        className="h-10 w-28"
                      />
                    ) : (
                      <button
                        type="button"
                        className="cursor-pointer rounded-lg px-2 py-1 font-semibold text-primary hover:bg-muted"
                        onClick={() => {
                          setEditingCostId(zone.id);
                          setDraftCost(String(zone.cost));
                        }}
                      >
                        {zone.cost.toLocaleString("fr-FR")} F
                      </button>
                    )}
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateZone(zone.id, { isActive: !zone.isActive })
                      }
                      className={cn(
                        "cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                        zone.isActive
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {zone.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {saving && (
          <p className="mt-4 flex items-center gap-2 font-body text-xs text-muted-foreground">
            <Save className="size-3.5 animate-pulse" aria-hidden />
            Enregistrement...
          </p>
        )}
      </section>

      <ScheduleBlock
        title="Horaires de livraison"
        type="delivery"
        schedules={config.schedules}
        onChange={updateSchedule}
        onDuplicate={(day) => duplicateFromMonday("delivery", day)}
      />

      <ScheduleBlock
        title="Horaires de retrait en boutique"
        type="pickup"
        schedules={config.schedules}
        onChange={updateSchedule}
        onDuplicate={(day) => duplicateFromMonday("pickup", day)}
      />
    </div>
  );
}
