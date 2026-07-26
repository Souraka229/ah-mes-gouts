import dynamic from "next/dynamic";

import { LandingShell } from "@/components/shop/landing/landing-shell";
import { RadicalHeroSection } from "@/components/shop/landing/radical-hero-section";
import { RadicalProductGridSection } from "@/components/shop/landing/radical-product-grid";
import type { HomePageContent } from "@/lib/server/home-content";

const RadicalSignatureMomentSection = dynamic(
  () =>
    import("@/components/shop/landing/radical-signature-moment").then(
      (m) => m.RadicalSignatureMomentSection,
    ),
);
const RadicalFormatsSection = dynamic(
  () =>
    import("@/components/shop/landing/radical-formats-section").then(
      (m) => m.RadicalFormatsSection,
    ),
);
const RadicalBoutiqueSection = dynamic(
  () =>
    import("@/components/shop/landing/radical-boutique-section").then(
      (m) => m.RadicalBoutiqueSection,
    ),
);
const GiftUpsellBandSection = dynamic(
  () =>
    import("@/components/shop/landing/gift-upsell-band").then(
      (m) => m.GiftUpsellBandSection,
    ),
);
const RadicalValuesBand = dynamic(
  () =>
    import("@/components/shop/landing/radical-values-band").then(
      (m) => m.RadicalValuesBand,
    ),
);
const RadicalSocialProofSection = dynamic(
  () =>
    import("@/components/shop/landing/radical-social-proof-section").then(
      (m) => m.RadicalSocialProofSection,
    ),
);
const RadicalFooterWordmarkSection = dynamic(
  () =>
    import("@/components/shop/landing/radical-footer-wordmark").then(
      (m) => m.RadicalFooterWordmarkSection,
    ),
);

/**
 * Landing « écrin de nuit » — hero + menu du jour au-dessus du fold ;
 * le reste est code-splitté pour accélérer TTI.
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

      <RadicalValuesBand />
      <RadicalSocialProofSection />

      {v.has("footer") && (
        <RadicalFooterWordmarkSection content={content.footer} />
      )}
    </LandingShell>
  );
}
