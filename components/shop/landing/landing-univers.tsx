import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LANDING_IMAGES } from "@/lib/landing-data";
import { SITE_NAME } from "@/lib/seo/site";

const CATEGORIES = [
  {
    id: "glaces",
    label: "Glaces artisanales",
    href: "/catalogue",
    image: LANDING_IMAGES.manguePassion,
  },
  {
    id: "entremets",
    label: "Entremets signature",
    href: "/catalogue",
    image: LANDING_IMAGES.foretBlanche,
  },
  {
    id: "cadeaux",
    label: "Cadeaux & bouquets",
    href: "/catalogue?cadeaux=1",
    image: LANDING_IMAGES.corbeille,
  },
] as const;

/** Trois univers produit — point d'entrée visuel vers le catalogue. */
export function LandingUnivers() {
  return (
    <section className="bg-bg py-16 sm:py-20" aria-labelledby="landing-univers-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.26em] text-accent">
          Découvrez
        </p>
        <h2
          id="landing-univers-title"
          className="mt-2 font-display text-3xl font-semibold text-primary sm:text-4xl"
        >
          Notre univers
        </h2>

        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
          {CATEGORIES.map((cat) => (
            <li key={cat.id}>
              <Link
                href={cat.href}
                className="group block overflow-hidden rounded-2xl border border-border/80 bg-card"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-photo-bg">
                  <Image
                    src={cat.image}
                    alt={`${cat.label} — ${SITE_NAME}`}
                    fill
                    sizes="(min-width: 640px) 32vw, 92vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-4">
                  <p className="font-body text-sm font-semibold uppercase tracking-[0.06em] text-text">
                    {cat.label}
                  </p>
                  <ArrowRight
                    className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
