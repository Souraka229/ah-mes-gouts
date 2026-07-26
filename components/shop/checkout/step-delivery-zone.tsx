"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { useCheckoutStore } from "@/lib/checkout-store";
import {
  getDeliveryLocalityOptions,
  getDeliveryZoneById,
  parseLocalityValue,
} from "@/lib/delivery-zones";
import { formatPrice } from "@/lib/format";
import { useDeliveryConfig } from "@/lib/hooks/use-delivery-config";
import { cn } from "@/lib/utils";

export function StepDeliveryZone({ embedded = false }: { embedded?: boolean }) {
  const zoneId = useCheckoutStore((state) => state.zoneId);
  const setZoneId = useCheckoutStore((state) => state.setZoneId);
  const client = useCheckoutStore((state) => state.client);
  const setClient = useCheckoutStore((state) => state.setClient);

  const { zones, loading, error } = useDeliveryConfig();
  const [localityValue, setLocalityValue] = useState("");

  const activeIds = useMemo(
    () => new Set(zones.filter((z) => z.isActive).map((z) => z.id)),
    [zones],
  );

  /** Localités affichées = grille affiche, filtrées par zones actives en DB. */
  const localityOptions = useMemo(() => {
    const all = getDeliveryLocalityOptions();
    if (activeIds.size === 0) return all;
    return all.filter((opt) => activeIds.has(opt.zoneId));
  }, [activeIds]);

  const selectedZone =
    zones.find((zone) => zone.id === zoneId) ??
    (zoneId
      ? {
          id: zoneId,
          name: getDeliveryZoneById(zoneId)?.name ?? zoneId,
          cost: getDeliveryZoneById(zoneId)?.price ?? 0,
        }
      : null);

  const handleLocalityChange = (value: string) => {
    setLocalityValue(value);
    const parsed = parseLocalityValue(value);
    if (!parsed) {
      setZoneId(null);
      return;
    }
    setZoneId(parsed.zoneId);
    if (!client.landmark?.trim()) {
      setClient({ ...client, landmark: parsed.area });
    }
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
            Où livrer ?
          </h1>
          <p className="mt-2 font-body text-muted-foreground">
            Choisissez votre quartier — les frais suivent la grille officielle
            (500 F à 1 500 F).
          </p>
        </div>
      )}

      {loading && (
        <p className="font-body text-sm text-muted-foreground">
          Chargement des zones...
        </p>
      )}

      {error && (
        <p role="alert" className="font-body text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && localityOptions.length === 0 && (
        <p className="rounded-2xl border border-border bg-muted/30 px-4 py-6 text-center font-body text-sm text-muted-foreground">
          Aucune zone de livraison disponible pour le moment.
        </p>
      )}

      {!loading && localityOptions.length > 0 && (
        <div className="max-w-md space-y-4">
          <div>
            <Label htmlFor="locality" className="font-body text-sm font-medium">
              Quartier / destination
            </Label>
            <div className="relative mt-2">
              <select
                id="locality"
                value={localityValue}
                onChange={(e) => handleLocalityChange(e.target.value)}
                className={cn(
                  "h-11 w-full cursor-pointer appearance-none rounded-xl border border-border bg-card",
                  "px-3 pr-10 font-body text-sm text-text outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
              >
                <option value="" disabled>
                  Choisissez votre quartier…
                </option>
                {(["E", "D", "C", "B", "A"] as const).map((code) => {
                  const group = localityOptions.filter(
                    (o) => o.zoneCode === code,
                  );
                  if (group.length === 0) return null;
                  const price = group[0]!.price;
                  return (
                    <optgroup
                      key={code}
                      label={`Destinations ${code} — ${formatPrice(price)}`}
                    >
                      {group.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.area}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </div>
          </div>

          {selectedZone && localityValue && (
            <p className="font-body text-sm text-muted-foreground">
              Frais de livraison :{" "}
              <span className="font-semibold text-text">
                {formatPrice(selectedZone.cost)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                ({selectedZone.name})
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
