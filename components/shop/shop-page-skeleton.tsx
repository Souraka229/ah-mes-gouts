import { cn } from "@/lib/utils";

/** Skeleton boutique — transitions de page visibles (≥300 ms). */
export function ShopPageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 sm:py-14 lg:px-8",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Chargement…</span>
      <div className="mb-8 space-y-3">
        <div className="h-10 w-56 max-w-full rounded-xl bg-primary/10" />
        <div className="h-4 w-full max-w-md rounded-lg bg-muted" />
      </div>
      <div className="mb-8 h-12 w-full rounded-full bg-muted" />
      <div className="mb-8 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-28 shrink-0 rounded-full bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl border border-border bg-white"
          >
            <div className="aspect-4/5 bg-muted" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 rounded bg-muted" />
              <div className="h-6 w-1/3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
