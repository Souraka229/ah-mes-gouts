"use client";

import { MapPin, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PICKUP_ADDRESS } from "@/lib/delivery/constants";
import { getNextStep, useCheckoutStore } from "@/lib/checkout-store";
import { cn } from "@/lib/utils";
import type { ReceptionMode } from "@/types/order";

const modes: {
  id: ReceptionMode;
  title: string;
  description: string;
  icon: typeof Store;
}[] = [
  {
    id: "delivery",
    title: "Livraison",
    description: "Recevez votre commande à l'adresse de votre choix à Cotonou.",
    icon: MapPin,
  },
  {
    id: "pickup",
    title: "À emporter",
    description: `Retirez votre commande directement chez ${PICKUP_ADDRESS.split(" — ")[0]}.`,
    icon: Store,
  },
];

export function StepMode() {
  const mode = useCheckoutStore((state) => state.mode);
  const setMode = useCheckoutStore((state) => state.setMode);
  const setStep = useCheckoutStore((state) => state.setStep);

  const handleContinue = () => {
    if (!mode) return;
    const next = getNextStep("mode", mode);
    if (next) setStep(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
          Comment souhaitez-vous recevoir votre commande ?
        </h1>
        <p className="mt-2 font-body text-muted-foreground">
          Choisissez le mode qui vous convient le mieux.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modes.map((option) => {
          const Icon = option.icon;
          const selected = mode === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-4 rounded-2xl border p-6 text-left transition-all duration-[250ms]",
                selected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
              )}
            >
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-full",
                  selected ? "bg-primary text-primary-foreground" : "bg-muted text-primary",
                )}
              >
                <Icon className="size-6" aria-hidden />
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-primary">
                  {option.title}
                </p>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <Button
        className="h-11 cursor-pointer bg-accent text-text hover:bg-accent/90"
        disabled={!mode}
        onClick={handleContinue}
      >
        Continuer
      </Button>
    </div>
  );
}
