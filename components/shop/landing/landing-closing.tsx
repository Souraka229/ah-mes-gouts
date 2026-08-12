import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LANDING_AMBIANCE } from "@/lib/landing-data";
import { ORIGIN_BRAND } from "@/lib/seo/site";
import type { MenuShowcaseItem } from "@/lib/server/shop-catalog";

type LandingClosingProps = {
  /** Créations du menu, si publiées. Sinon on retombe sur les photos maison. */
  photos: MenuShowcaseItem[];
};

/**
 * Dernière relance avant le pied de page.
 *
 * Ne contient plus de pied de page : celui du site (SiteFooter) est désormais
 * rendu sur toutes les pages, accueil comprise. Deux pieds de page différents
 * selon la page, c'était deux endroits à tenir à jour pour rien.
 *
 * Photos flottantes — visibles dès 768 px.
 *
 * Le seuil précédent, 1024 px, les rendait invisibles sur un portable réglé à
 * 125 ou 150 % d'échelle Windows : un écran 1366 px n'expose alors que 911 px
 * CSS. Elles restent masquées sur mobile, où elles chevaucheraient le texte.
 */
const FLOATERS = [
  {
    className: "left-[2%] top-[10%] w-24 h-32 lg:w-32 lg:h-40",
    rotate: "-7deg",
    delay: "0s",
  },
  {
    className: "right-[3%] top-[7%] w-20 h-28 lg:w-28 lg:h-36",
    rotate: "6deg",
    delay: "2s",
  },
  {
    className: "left-[5%] bottom-[8%] w-20 h-28 lg:w-28 lg:h-36",
    rotate: "5deg",
    delay: "1s",
  },
  {
    className: "right-[4%] bottom-[11%] w-24 h-32 lg:w-32 lg:h-40",
    rotate: "-6deg",
    delay: "3s",
  },
] as const;

export function LandingClosing({ photos }: LandingClosingProps) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 md:min-h-[34rem] md:flex md:items-center">
      <div
        className="blob blob-lg -left-32 -top-24 h-[34rem] w-[34rem] bg-muted opacity-70"
        aria-hidden
      />
      <div
        className="blob -right-24 bottom-0 h-80 w-80 bg-bluegray opacity-60"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
        {FLOATERS.map((floater, index) => {
          const src =
            photos[index]?.image ??
            LANDING_AMBIANCE[index % LANDING_AMBIANCE.length]!;
          return (
            <div
              key={index}
              className={`landing-drift shadow-soft absolute overflow-hidden rounded-3xl ring-4 ring-white ${floater.className}`}
              style={
                {
                  "--drift-rotate": `rotate(${floater.rotate})`,
                  transform: `rotate(${floater.rotate})`,
                  animationDelay: floater.delay,
                } as React.CSSProperties
              }
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="120px"
                quality={85}
                className="object-cover"
              />
            </div>
          );
        })}
      </div>

      <div className="relative z-1 mx-auto flex w-full max-w-xl flex-col items-center gap-7 px-4 text-center sm:px-6">
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {ORIGIN_BRAND}
        </p>

        <h2 className="font-display text-[clamp(2rem,5.5vw,3.25rem)] font-semibold leading-tight text-balance text-primary">
          Prêt à vous faire plaisir&nbsp;?
        </h2>

        <p className="max-w-lg font-body text-base leading-relaxed text-muted-foreground">
          Choisissez, personnalisez, payez par Mobile Money ou carte, et suivez
          votre commande en direct.
        </p>

        <Link
          href="/catalogue"
          className="inline-flex min-h-13 cursor-pointer items-center gap-2 rounded-full bg-accent px-10 font-body text-base font-semibold text-accent-foreground shadow-sm transition-[transform,box-shadow] duration-300 hover:scale-[1.02] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary motion-reduce:hover:scale-100"
        >
          Commander maintenant
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
