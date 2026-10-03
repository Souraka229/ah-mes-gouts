import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Choisir" },
  { id: 2, label: "Valider" },
  { id: 3, label: "Revue" },
] as const;

type MenuPlanStepsProps = {
  current: 1 | 2 | 3;
};

/** Indicateur des 3 temps : choisir → valider → revue avant planification. */
export function MenuPlanSteps({ current }: MenuPlanStepsProps) {
  return (
    <ol className="mt-4 flex items-center gap-2" aria-label="Étapes du menu">
      {STEPS.map((step, index) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full font-body text-xs font-bold",
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-success/20 text-success"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {step.id}
            </span>
            <span
              className={cn(
                "truncate font-body text-xs font-semibold",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <span className="hidden h-px flex-1 bg-border sm:block" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
