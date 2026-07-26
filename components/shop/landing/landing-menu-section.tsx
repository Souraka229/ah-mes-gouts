import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/shop/product-card";
import type { MenuShowcaseItem } from "@/lib/server/shop-catalog";

type LandingMenuSectionProps = {
  items: MenuShowcaseItem[];
};

/** Grille menu du jour — réutilise ProductCard (même langage que le catalogue). */
export function LandingMenuSection({ items }: LandingMenuSectionProps) {
  if (items.length === 0) return null;

  return (
    <section
      id="menu-du-jour"
      className="border-t border-border/80 bg-bg py-16 sm:py-20"
      aria-labelledby="landing-menu-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
              Sélection du moment
            </p>
            <h2
              id="landing-menu-title"
              className="mt-2 font-display text-3xl font-semibold text-primary sm:text-4xl"
            >
              Menu du jour
            </h2>
          </div>
          <Link
            href="/catalogue"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start font-body text-sm font-semibold text-primary underline-offset-4 hover:underline sm:self-auto"
          >
            Voir toute la carte
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {items.map((item, index) => (
            <li key={item.slug}>
              <ProductCard
                product={item.product}
                keyword={item.keyword}
                priority={index < 2}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
