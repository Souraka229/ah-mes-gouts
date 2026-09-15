import Link from "next/link";
import { Check } from "lucide-react";

import { getRoseLabel } from "@/lib/constants/rose-compositions";
import { formatPrice } from "@/lib/format";
import type { RoseCompositionOption } from "@/lib/product-options/compositions";
import { cn } from "@/lib/utils";

type RoseCompositionPickerProps = {
  options: RoseCompositionOption[];
  currentSlug: string;
};

/**
 * « Choisissez votre composition » — fiche produit des roses.
 *
 * Chaque composition est un vrai produit, avec sa fiche et son prix : le
 * sélecteur navigue donc vers la fiche correspondante au lieu de recalculer
 * un prix côté client. Le serveur refacture toujours la ligne réelle.
 */
export function RoseCompositionPicker({
  options,
  currentSlug,
}: RoseCompositionPickerProps) {
  if (options.length < 2) return null;

  return (
    <div>
      <p className="font-display text-xl font-semibold text-primary">
        Choisissez votre composition
      </p>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Chaque bouquet contient exactement ce qui est indiqué — le prix suit.
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = option.slug === currentSlug;
          const label = getRoseLabel(option.slug, option.name);

          return (
            <li key={option.slug}>
              <Link
                href={`/produit/${option.slug}`}
                scroll
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col rounded-2xl border px-4 py-3.5 transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 font-body text-sm font-semibold text-primary">
                    {selected && (
                      <Check className="size-4 text-accent" aria-hidden />
                    )}
                    {label}
                  </span>
                  <span className="shrink-0 font-body text-sm font-semibold tabular-nums text-text">
                    {formatPrice(option.price)}
                  </span>
                </span>

                {option.includes.length > 0 && (
                  <span className="mt-1.5 font-body text-xs leading-snug text-muted-foreground">
                    {option.includes.join(" · ")}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
