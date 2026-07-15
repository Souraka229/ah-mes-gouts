import type { Metadata } from "next";

import { LandingPage } from "@/components/shop/landing/landing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { getHomePageContent } from "@/lib/server/home-content";
import { getProductImageUrl } from "@/lib/product-images";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import { createPageMetadata } from "@/lib/seo/metadata";
import { buildIceCreamShopSchema } from "@/lib/seo/schemas";

/** Cache ISR — page d'accueil régénérée toutes les 2 min max. */
export const revalidate = 120;

export const metadata: Metadata = createPageMetadata({
  title: "Glaces artisanales Cotonou — Sur place, à emporter ou livraison",
  description:
    `Commandez vos glaces artisanales en ligne à Cotonou. Sur place, à emporter ou livraison. Paiement MoMo et carte. ${SITE_NAME_WITH_CREDIT}.`,
  path: "/",
  ogImage: getProductImageUrl("mango-passion"),
});

export default async function HomePage() {
  const content = await getHomePageContent();

  return (
    <>
      <JsonLd data={buildIceCreamShopSchema()} />
      <LandingPage content={content} />
    </>
  );
}
