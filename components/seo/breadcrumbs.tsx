import Link from "next/link";

import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/lib/seo/schemas";

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Fil d'Ariane" className={cn("mb-6", className)}>
      <ol className="flex flex-wrap items-center gap-2 font-body text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.path} className="flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden className="text-border">
                  /
                </span>
              )}
              {isLast ? (
                <span className="font-medium text-text" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className="cursor-pointer transition-colors hover:text-primary"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
