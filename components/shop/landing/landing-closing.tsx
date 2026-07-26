import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";

import { footerNavLinks } from "@/lib/landing-data";
import { INSTAGRAM_URL } from "@/lib/social-links";
import {
  ORIGIN_BRAND,
  SITE_NAME_WITH_CREDIT,
} from "@/lib/seo/site";
import type { FooterSectionContent } from "@/types/site-content";

type LandingClosingProps = {
  footer: FooterSectionContent;
};

/** Pied de page landing — sobre, une invitation à commander. */
export function LandingClosing({ footer }: LandingClosingProps) {
  return (
    <footer
      id="contact"
      className="bg-primary px-4 py-16 text-primary-foreground sm:px-6 sm:py-20"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 text-center">
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary/90">
          {ORIGIN_BRAND}
        </p>
        <h2 className="font-display text-[clamp(2rem,6vw,3.25rem)] font-semibold leading-tight">
          Prêt à vous faire plaisir ?
        </h2>
        <p className="max-w-lg font-body text-base text-primary-foreground/85">
          Parcours simple : choisissez, personnalisez, payez par Mobile Money ou
          carte, suivez votre commande en direct.
        </p>

        <Link
          href="/catalogue"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent px-8 py-3 font-body text-sm font-semibold text-text transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
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
              className="cursor-pointer font-body text-sm text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-2 pt-6 font-body text-sm text-primary-foreground/75">
          <a
            href={`tel:${footer.phone.replace(/\s/g, "")}`}
            className="cursor-pointer hover:text-primary-foreground"
          >
            {footer.phone}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-2 hover:text-primary-foreground"
          >
            <Share2 className="size-4" aria-hidden />
            {footer.instagramHandle}
          </a>
        </div>

        <p className="pt-8 font-body text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} {SITE_NAME_WITH_CREDIT}
        </p>
      </div>
    </footer>
  );
}
