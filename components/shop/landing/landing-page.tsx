import { LandingBrandValues } from "@/components/shop/landing/landing-brand-values";
import { LandingClosing } from "@/components/shop/landing/landing-closing";
import { LandingGiftBanner } from "@/components/shop/landing/landing-gift-banner";
import { LandingHero } from "@/components/shop/landing/landing-hero";
import { LandingMenuSection } from "@/components/shop/landing/landing-menu-section";
import { LandingShell } from "@/components/shop/landing/landing-shell";
import { LandingSignatures } from "@/components/shop/landing/landing-signatures";
import { LandingTrustBar } from "@/components/shop/landing/landing-trust-bar";
import type { HomePageContent } from "@/lib/server/home-content";

/**
 * Accueil — hero produit, menu du jour, signatures, repères, cadeau, clôture.
 *
 * La navigation (en-tête collant et barre mobile) vient du layout boutique :
 * elle est partagée avec le reste du site et n'est pas redéfinie ici.
 * Zéro JS client sur toute la page — chaque carte est un lien.
 */
export function LandingPage({ content }: { content: HomePageContent }) {
  // Le menu du jour est la seule section pilotée par les données : elle
  // n'apparaît qu'une fois le menu planifié puis publié (activation à 20 h la
  // veille). Le reste de la page est une vitrine éditoriale stable.
  const menuItems = content.menuShowcase.slice(0, 4);
  const hasPublishedMenu = menuItems.length > 0;

  return (
    <LandingShell>
      <LandingHero
        featured={content.menuShowcase[0] ?? null}
        fallbackImage={content.hero.imageUrl}
        ctaHref={content.hero.ctaHref}
        ctaLabel={content.hero.ctaLabel}
        menuCount={content.menuShowcase.length}
      />

      {hasPublishedMenu && <LandingMenuSection items={menuItems} />}

      <LandingSignatures />

      <LandingBrandValues />

      <LandingTrustBar />

      <LandingGiftBanner />

      <LandingClosing footer={content.footer} photos={menuItems} />
    </LandingShell>
  );
}
