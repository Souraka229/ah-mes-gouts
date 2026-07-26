"use client";

import { cn } from "@/lib/utils";
import type { CheckoutStep } from "@/types/order";

const STEPS: { id: CheckoutStep; label: string }[] = [
  { id: "commande", label: "1. Votre commande" },
  { id: "payment", label: "2. Paiement" },
];

type CheckoutStepIndicatorProps = {
  currentStep: CheckoutStep;
};

export function CheckoutStepIndicator({
  currentStep,
}: CheckoutStepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <ol className="flex max-w-full gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isDone = index < currentIndex;

        return (
          <li
            key={step.id}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 font-body text-xs font-medium transition-colors duration-200 sm:text-sm",
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
