import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  className?: string;
  action?: ReactNode;
};

export function SectionHeading({
  title,
  subtitle,
  className,
  action,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        <h2 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 max-w-xl font-body text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
