"use client";

import { cn } from "@/lib/utils";
import type { CheckoutStep } from "@/types/order";

/** Parcours boutique (sur place / à emporter) — pas d'étape zone. */
const STEPS_BOUTIQUE: { id: CheckoutStep; label: string }[] = [
  { id: "mode", label: "1. Mode" },
  { id: "schedule", label: "2. Créneau" },
  { id: "client", label: "3. Infos" },
  { id: "payment", label: "4. Paiement" },
];

/** Parcours livraison — avec l'étape zone. */
const STEPS_LIVRAISON: { id: CheckoutStep; label: string }[] = [
  { id: "mode", label: "1. Mode" },
  { id: "zone", label: "2. Localité" },
  { id: "schedule", label: "3. Créneau" },
  { id: "client", label: "4. Infos" },
  { id: "payment", label: "5. Paiement" },
];

function resolveIndicatorStep(step: CheckoutStep): CheckoutStep {
  if (step === "upsell") return "payment";
  return step;
}

type CheckoutStepIndicatorProps = {
  currentStep: CheckoutStep;
  showZone: boolean;
};

export function CheckoutStepIndicator({
  currentStep,
  showZone,
}: CheckoutStepIndicatorProps) {
  const steps = showZone ? STEPS_LIVRAISON : STEPS_BOUTIQUE;
  const indicatorStep = resolveIndicatorStep(currentStep);
  const currentIndex = steps.findIndex((s) => s.id === indicatorStep);

  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const isActive = step.id === indicatorStep;
        const isDone = index < currentIndex;

        return (
          <li
            key={step.id}
            className={cn(
              "rounded-full px-3 py-1.5 font-body text-xs font-medium transition-colors duration-200",
              isActive && "bg-primary text-primary-foreground",
              isDone && "bg-success/20 text-success",
              !isActive && !isDone && "bg-muted text-muted-foreground",
            )}
          >
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
