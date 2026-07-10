"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";

import { footerNavLinks } from "@/lib/landing-data";
import {
  ORIGIN_BRAND,
  SITE_NAME_WITH_CREDIT,
} from "@/lib/seo/site";
import { INSTAGRAM_URL } from "@/lib/social-links";
import type { FooterSectionContent } from "@/types/site-content";
import { cn } from "@/lib/utils";

export function RadicalFooterWordmarkSection({
  content,
}: {
  content: FooterSectionContent;
}) {
  return (
    <footer
      id="contact"
      className="relative overflow-x-hidden bg-primary pb-10 pt-[10vh] text-white"
    >
      {/* Mobile < 768px */}
      <div
        className="footer-wordmark footer-wordmark--mobile select-none font-body font-bold uppercase md:hidden"
        aria-hidden
      >
        <span className="footer-wordmark__line block leading-[0.88] tracking-[-0.03em] text-bg">
          GIFT &
        </span>
        <span className="footer-wordmark__line block leading-[0.88] tracking-[-0.03em] text-accent">
          ENTREMETS
        </span>
      </div>

      {/* Tablette 768px – 1023px */}
      <div
        className="footer-wordmark footer-wordmark--tablet hidden select-none font-body font-bold uppercase md:block lg:hidden"
        aria-hidden
      >
        <span className="footer-wordmark__line block leading-[0.88] tracking-[-0.03em] text-bg">
          GIFT &
        </span>
        <span className="footer-wordmark__line block leading-[0.88] tracking-[-0.03em] text-accent">
          ENTREMETS
        </span>
      </div>

      {/* Desktop ≥ 1024px */}
      <div
        className="footer-wordmark footer-wordmark--desktop hidden select-none font-body font-bold uppercase lg:block"
        aria-hidden
      >
        <span className="footer-wordmark__line block leading-[0.88] tracking-[-0.03em] text-bg">
          GIFT &
        </span>
        <span className="footer-wordmark__line block leading-[0.88] tracking-[-0.03em] text-accent">
          ENTREMETS
        </span>
      </div>

      <p className="sr-only">{SITE_NAME_WITH_CREDIT}</p>
      <p className="mt-3 px-[4vw] font-body text-[10px] font-medium tracking-[0.18em] text-white/45 uppercase md:mt-4">
        By {ORIGIN_BRAND}
      </p>

      <nav
        className="mt-12 flex flex-wrap gap-x-8 gap-y-3 px-[4vw] md:px-[4vw]"
        aria-label="Navigation secondaire"
      >
        {footerNavLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="cursor-pointer font-body text-[11px] font-semibold tracking-[0.22em] text-white/70 uppercase transition-colors hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 flex flex-col gap-4 px-[4vw] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body text-sm text-white/60">
          Cotonou, Bénin · {content.phone}
        </p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 font-body text-sm text-white/60",
            "transition-colors hover:text-white",
          )}
        >
          <Share2 className="size-4" aria-hidden />
          {content.instagramHandle}
        </a>
      </div>

      <p className="mt-10 px-[4vw] font-body text-xs text-white/40">
        © {new Date().getFullYear()} {SITE_NAME_WITH_CREDIT}. Tous droits
        réservés.
      </p>
    </footer>
  );
}
