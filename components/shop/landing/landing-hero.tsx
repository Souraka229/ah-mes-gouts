import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BOUTIQUE_HOURS, BOUTIQUE_LOCATION, SLOGAN } from "@/lib/business-info";
import { formatPrice } from "@/lib/format";
import { getProductPrice } from "@/lib/catalog-utils";
import { SITE_NAME, SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import type { MenuShowcaseItem } from "@/lib/server/shop-catalog";

type LandingHeroProps = {
  featured: MenuShowcaseItem | null;
  fallbackImage: string;
  ctaHref: string;
  ctaLabel: string;
};

/** Hero épuré — la photo produit domine, une seule action dorée. */
export function LandingHero({
  featured,
  fallbackImage,
  ctaHref,
  ctaLabel,
}: LandingHeroProps) {
  const image = featured?.image ?? fallbackImage;
  const name = featured?.name;
  const price = featured ? getProductPrice(featured.product) : null;

  return (
    <section
      className="relative overflow-hidden bg-bg"
      aria-label={`Accueil — ${SITE_NAME_WITH_CREDIT}`}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:py-16">
        <div className="flex flex-col gap-5 lg:pr-4">
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            {BOUTIQUE_LOCATION.short} · {BOUTIQUE_HOURS.label}
          </p>

          <h1 className="font-display text-[clamp(2.75rem,9vw,4.25rem)] font-semibold leading-[0.92] tracking-tight text-primary">
            {SITE_NAME}
          </h1>

          <p className="max-w-md font-body text-base leading-relaxed text-muted-foreground sm:text-lg">
            {SLOGAN}. Commandez vos entremets en ligne — sur place, à emporter
            ou livrés à Cotonou.
          </p>

          {name && (
            <div className="border-l-2 border-accent pl-4">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Pièce du jour
              </p>
              <p className="mt-1 font-display text-2xl text-text sm:text-3xl">
                {name}
              </p>
              {price != null && (
                <p className="mt-1 font-body text-sm font-semibold text-primary">
                  {formatPrice(price)}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            <Link
              href={ctaHref}
              className="inline-flex min-h-[3rem] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 font-body text-base font-semibold text-text shadow-sm transition-[transform,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100 sm:w-auto sm:min-h-11 sm:text-sm"
            >
              {ctaLabel}
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </Link>
            <Link
              href="/zones-de-livraison"
              className="cursor-pointer font-body text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Zones & tarifs livraison
            </Link>
          </div>
        </div>

        <div className="lg:sticky lg:top-20">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[360px] sm:max-w-[420px] lg:max-w-none">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[2rem] opacity-70"
              style={{
                background:
                  "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-secondary) 50%, transparent), transparent 72%)",
              }}
              aria-hidden
            />
            <div className="relative h-full w-full overflow-hidden rounded-2xl bg-photo-bg ring-1 ring-border/80">
              <Image
                src={image}
                alt={
                  name
                    ? `${name} — entremets ${SITE_NAME}`
                    : `Création signature — ${SITE_NAME}`
                }
                fill
                priority
                sizes="(min-width: 1024px) 48vw, 92vw"
                className="object-contain object-center p-3 sm:p-5"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
