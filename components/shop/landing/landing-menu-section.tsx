import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { isNextDayOrderingOpen } from "@/lib/business-date";
import type { MenuShowcaseItem } from "@/lib/server/shop-catalog";

type LandingMenuSectionProps = {
  items: MenuShowcaseItem[];
};

/**
 * Menu du jour — grille décalée verticalement pour éviter l'alignement au
 * cordeau. Chaque carte mène à la fiche produit : la landing reste sans JS.
 */
export function LandingMenuSection({ items }: LandingMenuSectionProps) {
  if (items.length === 0) return null;

  const nextDayOpen = isNextDayOrderingOpen();

  return (
    <section
      id="menu-du-jour"
      className="relative overflow-hidden bg-linear-to-b from-bluegray/45 via-muted/50 to-bg py-20 sm:py-28"
    >
      <div
        className="blob h-[26rem] w-[26rem] top-[8%] -right-32 bg-muted opacity-70"
        aria-hidden
      />
      <div
        className="blob h-72 w-72 bottom-[6%] -left-24 bg-bluegray opacity-60"
        aria-hidden
      />

      <div className="relative z-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Disponibles uniquement aujourd’hui
        </p>
        <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-tight text-balance text-primary">
          Le menu du jour
        </h2>
        <p className="mt-4 max-w-lg font-body text-base text-muted-foreground">
          {items.length} création{items.length > 1 ? "s" : ""} en quantité
          limitée.{" "}
          {nextDayOpen
            ? "Les créneaux de demain sont ouverts."
            : "Le menu de demain s’ouvre ce soir à 20 h."}
        </p>

        <ul className="mt-12 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-8">
          {items.map((item, index) => (
            <li
              key={item.id}
              // Décalage vertical sur desktop uniquement : la grille respire.
              className={
                index === 1
                  ? "lg:translate-y-9"
                  : index === 3
                    ? "lg:translate-y-6"
                    : undefined
              }
            >
              <Link
                href={`/produit/${item.slug}`}
                className="shadow-soft group flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl bg-white transition-[transform,box-shadow] duration-500 hover:-translate-y-2 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary motion-reduce:hover:translate-y-0"
              >
                <div className="relative aspect-4/5 overflow-hidden bg-photo-bg">
                  <Image
                    src={item.image}
                    alt={`${item.name} — entremets artisanal`}
                    fill
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 92vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:group-hover:scale-100"
                    priority={index < 2}
                  />
                  <span className="glass absolute top-4 left-4 rounded-full px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">
                    {item.keyword}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-6">
                  <h3 className="font-display text-xl font-semibold leading-snug text-primary">
                    {item.name}
                  </h3>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <p className="font-display text-2xl font-semibold text-accent tabular-nums">
                      {formatPrice(item.price)}
                    </p>
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-bg text-primary transition-colors duration-300 group-hover:border-secondary group-hover:bg-secondary group-hover:text-white"
                      aria-hidden
                    >
                      <ArrowUpRight className="size-5" strokeWidth={2} />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
