"use client";

import { Button } from "@/components/ui/button";
import { getNextStep, useCheckoutStore } from "@/lib/checkout-store";
import { formatPrice } from "@/lib/format";
import { useDeliveryConfig } from "@/lib/hooks/use-delivery-config";
import { cn } from "@/lib/utils";

export function StepDeliveryZone() {
  const zoneId = useCheckoutStore((state) => state.zoneId);
  const setZoneId = useCheckoutStore((state) => state.setZoneId);
  const setStep = useCheckoutStore((state) => state.setStep);
  const mode = useCheckoutStore((state) => state.mode);

  const { zones, loading, error } = useDeliveryConfig();

  const handleContinue = () => {
    if (!zoneId || !mode) return;
    const next = getNextStep("zone", mode);
    if (next) setStep(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
          Sélectionnez votre zone de livraison
        </h1>
        <p className="mt-2 font-body text-muted-foreground">
          Les frais de livraison s&apos;ajoutent automatiquement à votre total.
        </p>
      </div>

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

      {!loading && zones.length === 0 && (
        <p className="rounded-2xl border border-border bg-muted/30 px-4 py-6 text-center font-body text-sm text-muted-foreground">
          Aucune zone de livraison disponible pour le moment.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {zones.map((zone) => {
          const selected = zoneId === zone.id;

          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => setZoneId(zone.id)}
              className={cn(
                "cursor-pointer rounded-2xl border p-5 text-left transition-all duration-[250ms]",
                selected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-xl font-semibold text-primary">
                  {zone.name}
                </p>
                <span className="shrink-0 rounded-full bg-accent px-3 py-1 font-body text-sm font-semibold text-text">
                  {formatPrice(zone.cost)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <Button
        className="h-11 cursor-pointer bg-accent text-text hover:bg-accent/90"
        disabled={!zoneId || zones.length === 0}
        onClick={handleContinue}
      >
        Continuer
      </Button>
    </div>
  );
}
