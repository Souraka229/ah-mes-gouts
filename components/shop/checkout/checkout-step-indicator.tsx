"use client";

import { cn } from "@/lib/utils";
import type { CheckoutStep } from "@/types/order";

const steps: { id: CheckoutStep; label: string }[] = [
  { id: "mode", label: "Mode" },
  { id: "zone", label: "Zone" },
  { id: "schedule", label: "Créneau" },
  { id: "client", label: "Infos" },
  { id: "upsell", label: "Extras" },
  { id: "payment", label: "Paiement" },
];

type CheckoutStepIndicatorProps = {
  currentStep: CheckoutStep;
  showZone: boolean;
};

export function CheckoutStepIndicator({
  currentStep,
  showZone,
}: CheckoutStepIndicatorProps) {
  const visibleSteps = showZone
    ? steps
    : steps.filter((step) => step.id !== "zone");

  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  return (
    <ol className="flex flex-wrap gap-2">
      {visibleSteps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isDone = index < currentIndex;

        return (
          <li
            key={step.id}
            className={cn(
              "rounded-full px-3 py-1 font-body text-xs font-medium transition-colors duration-200",
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
