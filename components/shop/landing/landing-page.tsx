import { GiftUpsellBandSection } from "@/components/shop/landing/gift-upsell-band";
import { LandingShell } from "@/components/shop/landing/landing-shell";
import { RadicalFooterWordmarkSection } from "@/components/shop/landing/radical-footer-wordmark";
import { RadicalHeroSection } from "@/components/shop/landing/radical-hero-section";
import { RadicalProductGridSection } from "@/components/shop/landing/radical-product-grid";
import { RadicalSignatureMomentSection } from "@/components/shop/landing/radical-signature-moment";
import { RadicalStorySection } from "@/components/shop/landing/radical-story-section";
import { RadicalTypoBandSection } from "@/components/shop/landing/radical-typo-band";
import type { HomePageContent } from "@/lib/server/home-content";

export function LandingPage({ content }: { content: HomePageContent }) {
  const v = content.visibleSectionKeys;

  return (
    <LandingShell>
      {v.has("hero") && <RadicalHeroSection content={content.hero} />}
      {v.has("gift_teaser") && (
        <GiftUpsellBandSection
          content={content.giftTeaser}
          products={content.giftProducts}
        />
      )}
      {v.has("product_grid") && (
        <RadicalProductGridSection
          content={content.productGrid}
          showcase={content.menuShowcase}
        />
      )}
      {v.has("storytelling") && (
        <RadicalStorySection content={content.storytelling} />
      )}
      {v.has("typo_band") && (
        <RadicalTypoBandSection content={content.typoBand} />
      )}
      {v.has("signature_moment") && (
        <RadicalSignatureMomentSection content={content.signatureMoment} />
      )}
      {v.has("footer") && (
        <RadicalFooterWordmarkSection content={content.footer} />
      )}
    </LandingShell>
  );
}
