import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";

import { footerNavLinks } from "@/lib/landing-data";
import { INSTAGRAM_URL } from "@/lib/social-links";
import { ORIGIN_BRAND, SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import type { MenuShowcaseItem } from "@/lib/server/shop-catalog";
import type { FooterSectionContent } from "@/types/site-content";

type LandingClosingProps = {
  footer: FooterSectionContent;
  /** Vraies créations du menu — elles flottent autour du bloc de texte. */
  photos: MenuShowcaseItem[];
};

/**
 * Positions des photos flottantes. Masquées sous 1024 px : à cette largeur
 * elles chevaucheraient le texte au lieu de l'entourer.
 */
const FLOATERS = [
  { className: "left-[3%] top-[14%] w-28 h-36", rotate: "-7deg", delay: "0s" },
  { className: "right-[5%] top-[9%] w-24 h-32", rotate: "6deg", delay: "2s" },
  { className: "left-[8%] bottom-[10%] w-26 h-34", rotate: "5deg", delay: "1s" },
  { className: "right-[7%] bottom-[13%] w-25 h-32", rotate: "-6deg", delay: "3s" },
] as const;

export function LandingClosing({ footer, photos }: LandingClosingProps) {
  return (
    <footer id="contact" className="relative overflow-hidden bg-bg">
      <div className="relative py-20 sm:py-28">
        <div
          className="blob blob-lg -left-32 -top-24 h-[34rem] w-[34rem] bg-muted opacity-70"
          aria-hidden
        />
        <div
          className="blob -right-24 bottom-0 h-80 w-80 bg-bluegray opacity-60"
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
          {FLOATERS.map((floater, index) => {
            const photo = photos[index % Math.max(photos.length, 1)];
            if (!photo) return null;
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
                  src={photo.image}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </div>
            );
          })}
        </div>

        <div className="relative z-1 mx-auto flex max-w-xl flex-col items-center gap-7 px-4 text-center sm:px-6">
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {ORIGIN_BRAND}
          </p>

          <h2 className="font-display text-[clamp(2rem,5.5vw,3.25rem)] font-semibold leading-tight text-balance text-primary">
            Prêt à vous faire plaisir&nbsp;?
          </h2>

          <p className="max-w-lg font-body text-base leading-relaxed text-muted-foreground">
            Choisissez, personnalisez, payez par Mobile Money ou carte, et
            suivez votre commande en direct.
          </p>

          <Link
            href="/catalogue"
            className="inline-flex min-h-13 cursor-pointer items-center gap-2 rounded-full bg-accent px-10 font-body text-base font-semibold text-accent-foreground shadow-sm transition-[transform,box-shadow] duration-300 hover:scale-[1.02] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary motion-reduce:hover:scale-100"
          >
            Commander maintenant
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 text-center sm:px-6 lg:px-8">
          <nav
            className="flex flex-wrap justify-center gap-x-7 gap-y-3"
            aria-label="Liens utiles"
          >
            {footerNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="cursor-pointer font-body text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-secondary hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-2 font-body text-sm text-muted-foreground">
            <a
              href={`tel:${footer.phone.replace(/\s/g, "")}`}
              className="cursor-pointer transition-colors hover:text-secondary"
            >
              {footer.phone}
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center gap-2 transition-colors hover:text-secondary"
            >
              <Share2 className="size-4" aria-hidden />
              {footer.instagramHandle}
            </a>
          </div>

          <p className="font-body text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} {SITE_NAME_WITH_CREDIT}
          </p>
          <a
            href="https://restafy.shop"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer font-body text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            Powered by Restafy
          </a>
        </div>
      </div>
    </footer>
  );
}
