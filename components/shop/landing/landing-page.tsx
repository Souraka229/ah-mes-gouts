import { RadicalBoutiqueSection } from "@/components/shop/landing/radical-boutique-section";
import { GiftUpsellBandSection } from "@/components/shop/landing/gift-upsell-band";
import { LandingShell } from "@/components/shop/landing/landing-shell";
import { RadicalFormatsSection } from "@/components/shop/landing/radical-formats-section";
import { RadicalFooterWordmarkSection } from "@/components/shop/landing/radical-footer-wordmark";
import { RadicalHeroSection } from "@/components/shop/landing/radical-hero-section";
import { RadicalProductGridSection } from "@/components/shop/landing/radical-product-grid";
import { RadicalSignatureMomentSection } from "@/components/shop/landing/radical-signature-moment";
import { RadicalSocialProofSection } from "@/components/shop/landing/radical-social-proof-section";
import { RadicalValuesBand } from "@/components/shop/landing/radical-values-band";
import type { HomePageContent } from "@/lib/server/home-content";

/**
 * Landing « écrin de nuit » — ordre éditorial :
 * Hero → Menu du jour → Signature/savoir-faire → Catalogue teaser →
 * En boutique/Sur place → Cadeaux → Réassurance → Footer.
 * Alternance des aplats : violet ↔ crème ↔ bleu nuit ↔ crème…
 */
export function LandingPage({ content }: { content: HomePageContent }) {
  const v = content.visibleSectionKeys;

  return (
    <LandingShell>
      {v.has("hero") && <RadicalHeroSection content={content.hero} />}

      {v.has("product_grid") && (
        <RadicalProductGridSection
          content={content.productGrid}
          showcase={content.menuShowcase}
        />
      )}

      {v.has("signature_moment") && (
        <RadicalSignatureMomentSection content={content.signatureMoment} />
      )}

      <RadicalFormatsSection />

      <RadicalBoutiqueSection />

      {v.has("gift_teaser") && (
        <GiftUpsellBandSection
          content={content.giftTeaser}
          products={content.giftProducts}
        />
      )}

      {/* Réassurance — valeurs + avis, traitées avec la même exigence */}
      <RadicalValuesBand />
      <RadicalSocialProofSection />

      {v.has("footer") && (
        <RadicalFooterWordmarkSection content={content.footer} />
      )}
    </LandingShell>
  );
}
