import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";

import { LANDING_IMAGES, footerNavLinks } from "@/lib/landing-data";
import { INSTAGRAM_URL } from "@/lib/social-links";
import {
  ORIGIN_BRAND,
  SITE_NAME_WITH_CREDIT,
} from "@/lib/seo/site";
import type { FooterSectionContent } from "@/types/site-content";

type LandingClosingProps = {
  footer: FooterSectionContent;
};

/** Photos produit réelles dispersées aux coins — pas d'icônes, pas de stock. */
const CORNER_PHOTOS = [
  { src: LANDING_IMAGES.oreos, className: "-top-4 left-2 sm:left-6 -rotate-6", size: 108 },
  { src: LANDING_IMAGES.manguePassion, className: "-top-6 right-2 sm:right-8 rotate-4", size: 96 },
  { src: LANDING_IMAGES.foretBlanche, className: "-bottom-6 left-4 sm:left-12 rotate-5", size: 96 },
  { src: LANDING_IMAGES.tiramisuRose, className: "-bottom-4 right-2 sm:right-6 -rotate-4", size: 112 },
] as const;

/** Pied de page landing — fond bleu clair, vraies photos aux coins, une invitation à commander. */
export function LandingClosing({ footer }: LandingClosingProps) {
  return (
    <footer
      id="contact"
      className="relative overflow-hidden bg-bluegray px-4 py-16 text-text sm:px-6 sm:py-20"
    >
      {CORNER_PHOTOS.map((photo, i) => (
        <div
          key={i}
          className={`pointer-events-none absolute hidden overflow-hidden rounded-2xl shadow-lg ring-4 ring-white sm:block ${photo.className}`}
          style={{ width: photo.size, height: photo.size }}
          aria-hidden
        >
          <Image
            src={photo.src}
            alt=""
            fill
            sizes="120px"
            className="object-cover"
          />
        </div>
      ))}

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-8 text-center">
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/60">
          {ORIGIN_BRAND}
        </p>
        <h2 className="font-display text-[clamp(2rem,6vw,3.25rem)] font-semibold leading-tight text-primary">
          Prêt à vous faire plaisir ?
        </h2>
        <p className="max-w-lg font-body text-base text-text/80">
          Parcours simple : choisissez, personnalisez, payez par Mobile Money ou
          carte, suivez votre commande en direct.
        </p>

        <Link
          href="/catalogue"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent px-8 py-3 font-body text-sm font-semibold text-accent-foreground transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
        >
          Commander maintenant
          <ArrowRight className="size-4" aria-hidden />
        </Link>

        <nav
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4"
          aria-label="Liens utiles"
        >
          {footerNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="cursor-pointer font-body text-sm text-text/75 underline-offset-4 hover:text-primary hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-2 pt-6 font-body text-sm text-text/70">
          <a
            href={`tel:${footer.phone.replace(/\s/g, "")}`}
            className="cursor-pointer hover:text-primary"
          >
            {footer.phone}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-2 hover:text-primary"
          >
            <Share2 className="size-4" aria-hidden />
            {footer.instagramHandle}
          </a>
        </div>

        <p className="pt-8 font-body text-xs text-text/45">
          © {new Date().getFullYear()} {SITE_NAME_WITH_CREDIT}
        </p>
        <a
          href="https://restafy.shop"
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer font-body text-[11px] text-text/35 hover:text-text/60"
        >
          Powered by Restafy
        </a>
      </div>
    </footer>
  );
}
