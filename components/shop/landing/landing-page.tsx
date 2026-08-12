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
  // Le hero et les visuels d'ambiance retombent sur les signatures quand le
  // menu du jour n'est pas encore publié — la page n'est jamais vide.
  const featured = content.menuShowcase[0] ?? content.signatures[0] ?? null;
  const menuItems = content.menuShowcase.slice(0, 4);
  const showMenuGrid = content.menuShowcase.length > 0;
  const ambiance =
    content.menuShowcase.length > 0 ? content.menuShowcase : content.signatures;

  return (
    <LandingShell>
      <LandingHero
        featured={featured}
        fallbackImage={content.hero.imageUrl}
        ctaHref={content.hero.ctaHref}
        ctaLabel={content.hero.ctaLabel}
        menuCount={content.menuShowcase.length}
      />

      {showMenuGrid && <LandingMenuSection items={menuItems} />}

      <LandingSignatures items={content.signatures} />

      <LandingBrandValues />

      <LandingTrustBar />

      <LandingGiftBanner thumbs={ambiance} />

      <LandingClosing footer={content.footer} photos={ambiance} />
    </LandingShell>
  );
}
