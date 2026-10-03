import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Choisir" },
  { id: 2, label: "Valider" },
  { id: 3, label: "Revue" },
] as const;

type MenuPlanStepsProps = {
  current: 1 | 2 | 3;
  onSelect?: (step: 1 | 2 | 3) => void;
};

/** Indicateur des 3 temps : choisir → valider → revue avant planification. */
export function MenuPlanSteps({ current, onSelect }: MenuPlanStepsProps) {
  return (
    <ol className="mt-4 flex items-center gap-2" aria-label="Étapes du menu">
      {STEPS.map((step, index) => {
        const done = current > step.id;
        const active = current === step.id;
        const canJump = Boolean(onSelect) && step.id < current;
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!canJump}
              onClick={() => onSelect?.(step.id)}
              className={cn(
                "flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-left",
                canJump && "cursor-pointer hover:bg-muted/60",
                !canJump && "cursor-default",
              )}
            >
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
            </button>
            {index < STEPS.length - 1 && (
              <span className="hidden h-px w-4 shrink-0 bg-border sm:block" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
