"use client";

import { Bike, ShoppingBag, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CheckoutBusinessNotices } from "@/components/shop/checkout/checkout-business-notices";
import { PICKUP_ADDRESS } from "@/lib/delivery/constants";
import { useCheckoutStore } from "@/lib/checkout-store";
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

export function StepMode({ embedded = false }: { embedded?: boolean }) {
  const mode = useCheckoutStore((state) => state.mode);
  const setMode = useCheckoutStore((state) => state.setMode);

  const handleSelect = (selected: ReceptionMode) => {
    setMode(selected);
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
            Comment souhaitez-vous recevoir votre commande ?
          </h1>
          <p className="mt-2 font-body text-muted-foreground">
            Sur place, à emporter ou en livraison — à vous de choisir.
          </p>
        </div>
      )}

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
                "flex min-h-[5.5rem] cursor-pointer flex-col rounded-2xl border p-5 text-left transition-all duration-[250ms] active:scale-[0.99]",
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

      {!embedded && <CheckoutBusinessNotices />}
    </div>
  );
}
