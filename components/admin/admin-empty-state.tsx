import type { ReactNode, SVGProps } from "react";

import { cn } from "@/lib/utils";

export type AdminEmptyVariant =
  | "calm"
  | "orders"
  | "products"
  | "drivers"
  | "menus";

type AdminEmptyStateProps = {
  variant: AdminEmptyVariant;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

const strokeProps: SVGProps<SVGSVGElement> = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

/** État vide « régie de maison » — illustration discrète, pas décor SaaS. */
export function AdminEmptyState({
  variant,
  title,
  description,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-dashed border-border/90 bg-bg/60 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mx-auto flex size-16 items-center justify-center text-primary/70">
        <EmptyIllustration variant={variant} />
      </div>
      <p className="mt-4 font-display text-xl font-semibold text-primary">
        {title}
      </p>
      <p className="mx-auto mt-1.5 max-w-sm font-body text-sm text-muted-foreground">
        {description}
      </p>
      {action ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

function EmptyIllustration({ variant }: { variant: AdminEmptyVariant }) {
  switch (variant) {
    case "calm":
      return (
        <svg viewBox="0 0 64 64" className="size-14 text-accent" {...strokeProps}>
          <circle cx="32" cy="32" r="18" className="opacity-40" />
          <path d="M32 20v12l8 5" />
          <circle cx="32" cy="32" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "orders":
      return (
        <svg viewBox="0 0 64 64" className="size-14" {...strokeProps}>
          <rect
            x="14"
            y="12"
            width="36"
            height="44"
            rx="4"
            className="opacity-35"
          />
          <path d="M22 24h20M22 32h16M22 40h12" />
        </svg>
      );
    case "products":
      return (
        <svg viewBox="0 0 64 64" className="size-14" {...strokeProps}>
          <ellipse cx="32" cy="44" rx="16" ry="6" className="opacity-35" />
          <path d="M18 40c2-10 8-18 14-22 6 4 12 12 14 22" />
          <path d="M28 22c2-4 6-6 8-6" className="opacity-60" />
        </svg>
      );
    case "drivers":
      return (
        <svg viewBox="0 0 64 64" className="size-14" {...strokeProps}>
          <path d="M12 40h28l8-12H28l-4 6H16z" className="opacity-40" />
          <circle cx="22" cy="44" r="4" />
          <circle cx="40" cy="44" r="4" />
          <path d="M48 28h6v8" />
        </svg>
      );
    case "menus":
      return (
        <svg viewBox="0 0 64 64" className="size-14" {...strokeProps}>
          <rect
            x="16"
            y="12"
            width="32"
            height="40"
            rx="3"
            className="opacity-35"
          />
          <path d="M24 22h16M24 30h12M24 38h14" />
          <circle cx="44" cy="46" r="6" className="text-accent" />
          <path d="M44 43v6M41 46h6" className="text-accent" />
        </svg>
      );
  }
}
