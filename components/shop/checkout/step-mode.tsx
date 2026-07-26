"use client";

import { Bike, ShoppingBag, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CheckoutBusinessNotices } from "@/components/shop/checkout/checkout-business-notices";
import { PICKUP_ADDRESS } from "@/lib/delivery/constants";
import { getNextStep, useCheckoutStore } from "@/lib/checkout-store";
import { cn } from "@/lib/utils";
import type { ReceptionMode } from "@/types/order";

type ModeOption = {
  mode: ReceptionMode;
  icon: LucideIcon;
  title: string;
  description: string;
};

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: "dinein",
    icon: UtensilsCrossed,
    title: "Sur place",
    description: `Dégustez votre commande directement à la boutique (${PICKUP_ADDRESS.split(" — ")[0]}).`,
  },
  {
    mode: "pickup",
    icon: ShoppingBag,
    title: "À emporter",
    description: "Vous passez chercher votre commande en boutique (jusqu'à 19h).",
  },
  {
    mode: "delivery",
    icon: Bike,
    title: "Livraison",
    description: "Faites-vous livrer à l'adresse de votre choix à Cotonou.",
  },
];

export function StepMode() {
  const mode = useCheckoutStore((state) => state.mode);
  const setMode = useCheckoutStore((state) => state.setMode);
  const setStep = useCheckoutStore((state) => state.setStep);

  const handleSelect = (selected: ReceptionMode) => {
    setMode(selected);
  };

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
          Sur place, à emporter ou en livraison — à vous de choisir.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {MODE_OPTIONS.map((option) => {
          const selected = mode === option.mode;
          const Icon = option.icon;

          return (
            <button
              key={option.mode}
              type="button"
              aria-pressed={selected}
              onClick={() => handleSelect(option.mode)}
              className={cn(
                "flex cursor-pointer flex-col rounded-2xl border p-5 text-left transition-all duration-[250ms]",
                selected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-primary",
                )}
              >
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="mt-4 font-display text-xl font-semibold text-primary">
                {option.title}
              </span>
              <span className="mt-2 font-body text-sm text-muted-foreground">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      {(mode === "dinein" || mode === "pickup") && (
        <p className="font-body text-sm text-muted-foreground">
          Boutique : <span className="font-medium text-text">{PICKUP_ADDRESS}</span>
        </p>
      )}

      <CheckoutBusinessNotices />

      <Button
        className="h-11 min-h-11 cursor-pointer bg-accent text-text hover:bg-accent/90"
        disabled={!mode}
        onClick={handleContinue}
      >
        Continuer
      </Button>
    </div>
  );
}
