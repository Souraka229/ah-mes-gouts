import { cn } from "@/lib/utils";

/**
 * Skeleton régie — visible dès la navigation (loading.tsx / Suspense).
 * Remplace les écrans blancs pendant le chargement des pages admin.
 */
export function AdminPageSkeleton({
  className,
  rows = 5,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div
      className={cn("mx-auto max-w-6xl animate-pulse space-y-6", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Chargement…</span>
      <div className="space-y-3">
        <div className="h-8 w-48 rounded-xl bg-primary/10" />
        <div className="h-4 w-72 max-w-full rounded-lg bg-muted" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-24 rounded-full bg-muted" />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/70 px-4 py-4 last:border-0"
          >
            <div className="size-12 shrink-0 rounded-xl bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/5 max-w-[12rem] rounded bg-muted" />
              <div className="h-3 w-1/3 max-w-[8rem] rounded bg-muted/80" />
            </div>
            <div className="hidden h-8 w-20 rounded-lg bg-muted sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
