"use client";

import { cn } from "@/lib/utils";
import type { AssistantStep } from "@/lib/admin-assistant/types";

const steps: { id: AssistantStep; label: string }[] = [
  { id: "describe", label: "Décrire" },
  { id: "copy", label: "Copier" },
  { id: "validate", label: "Valider" },
];

type AdminAssistantStepperProps = {
  currentStep: AssistantStep;
};

export function AdminAssistantStepper({
  currentStep,
}: AdminAssistantStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isDone = index < currentIndex;

        return (
          <li
            key={step.id}
            className={cn(
              "rounded-full px-3 py-1 font-body text-xs font-medium",
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
