import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BOUTIQUE_HOURS, BOUTIQUE_LOCATION, SLOGAN } from "@/lib/business-info";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import type { MenuShowcaseItem } from "@/lib/server/shop-catalog";

type LandingHeroProps = {
  featured: MenuShowcaseItem | null;
  fallbackImage: string;
  ctaHref: string;
  ctaLabel: string;
  /** Nombre de créations au menu — affiché sur la pastille flottante. */
  menuCount: number;
};

/**
 * Hero asymétrique — le texte tient 5 colonnes, la photo déborde sur 7.
 * Formes organiques floutées en fond, aucune image décorative à charger.
 * Server Component : la landing reste sans JS client.
 */
export function LandingHero({
  featured,
  fallbackImage,
  ctaHref,
  ctaLabel,
  menuCount,
}: LandingHeroProps) {
  const image = featured?.image ?? fallbackImage;
  const name = featured?.name;

  return (
    <section
      className="relative overflow-hidden"
      aria-label={`Accueil — ${SITE_NAME_WITH_CREDIT}`}
    >
      <div
        className="blob blob-lg h-[38rem] w-[38rem] -top-56 -left-40 bg-muted opacity-80"
        aria-hidden
      />
      <div
        className="blob blob-lg h-[32rem] w-[32rem] top-10 -right-44 bg-bluegray opacity-60"
        aria-hidden
      />
      <div
        className="blob hidden h-80 w-80 bottom-[-6rem] left-[34%] bg-photo-bg opacity-60 md:block"
        aria-hidden
      />

      <div className="relative z-1 mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 sm:pt-14 lg:px-8 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {BOUTIQUE_LOCATION.short} · {BOUTIQUE_HOURS.label}
            </p>

            <h1 className="font-display text-[clamp(2.5rem,7.5vw,4.25rem)] font-semibold leading-[0.98] tracking-tight text-balance text-primary">
              L’exigence du détail.
              <br />
              Le goût de l’excellence.
            </h1>

            <p className="max-w-md font-body text-base leading-relaxed text-muted-foreground sm:text-lg">
              {SLOGAN}. Des entremets façonnés à la main chaque matin, en très
              petite série — sur place, à emporter ou livrés à Cotonou.
            </p>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href={ctaHref}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-8 font-body text-base font-semibold text-accent-foreground shadow-sm transition-[transform,box-shadow] duration-300 hover:scale-[1.02] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary motion-reduce:hover:scale-100"
              >
                {ctaLabel}
                <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
              </Link>
              <Link
                href="/zones-de-livraison"
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-border bg-white px-7 font-body text-sm font-semibold text-primary transition-[transform,box-shadow] duration-300 hover:scale-[1.02] hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary motion-reduce:hover:scale-100"
              >
                Zones &amp; tarifs livraison
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative mx-auto w-full max-w-[26rem] lg:max-w-none">
              <div className="shadow-lift relative aspect-4/5 overflow-hidden rounded-[2rem] bg-photo-bg sm:aspect-4/3.4">
                <Image
                  src={image}
                  alt={
                    name
                      ? `${name} — entremets Gift & ENTREMETS`
                      : "Création signature Gift & ENTREMETS"
                  }
                  fill
                  priority
                  sizes="(min-width: 1024px) 56vw, 92vw"
                  className="object-cover object-center"
                />
              </div>

              {menuCount > 0 && (
                <div className="glass shadow-soft absolute bottom-5 left-3 flex items-center gap-3 rounded-2xl px-4 py-3 sm:-left-6 sm:bottom-8">
                  <span
                    className="size-2.5 shrink-0 rounded-full bg-success ring-4 ring-success/20"
                    aria-hidden
                  />
                  <span>
                    <span className="block font-body text-sm font-semibold text-primary">
                      {menuCount} création{menuCount > 1 ? "s" : ""} aujourd’hui
                    </span>
                    <span className="block font-body text-xs text-muted-foreground">
                      Retrait dès {BOUTIQUE_HOURS.open.replace(":", "h")} ·
                      Livraison Cotonou
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
