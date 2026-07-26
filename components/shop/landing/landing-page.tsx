import { LandingClosing } from "@/components/shop/landing/landing-closing";
import { LandingHero } from "@/components/shop/landing/landing-hero";
import { LandingMenuSection } from "@/components/shop/landing/landing-menu-section";
import { LandingShell } from "@/components/shop/landing/landing-shell";
import { LandingTrustBar } from "@/components/shop/landing/landing-trust-bar";
import type { HomePageContent } from "@/lib/server/home-content";

/**
 * Accueil « écrin clair » — hero produit, menu du jour, confiance, CTA.
 * Quatre sections, zéro JS client sur la landing.
 */
export function LandingPage({ content }: { content: HomePageContent }) {
  const featured = content.menuShowcase[0] ?? null;
  const showMenuGrid = content.menuShowcase.length > 1;
  const menuItems = content.menuShowcase.slice(0, 4);

  return (
    <LandingShell>
      <LandingHero
        featured={featured}
        fallbackImage={content.hero.imageUrl}
        ctaHref={content.hero.ctaHref}
        ctaLabel={content.hero.ctaLabel}
      />

      {showMenuGrid && <LandingMenuSection items={menuItems} />}

      <LandingTrustBar />

      <LandingClosing footer={content.footer} />
    </LandingShell>
  );
}
