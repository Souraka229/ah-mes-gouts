import type { Metadata } from "next";

import { LandingPage } from "@/components/shop/landing/landing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { getHomePageContent } from "@/lib/server/home-content";
import { getProductImageUrl } from "@/lib/product-images";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import { createPageMetadata } from "@/lib/seo/metadata";
import {
  buildIceCreamShopSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "@/lib/seo/schemas";

/** Cache ISR — page d'accueil régénérée toutes les 2 min max. */
export const revalidate = 120;

export const metadata: Metadata = createPageMetadata({
  // 30 caractères : avec le suffixe de marque, le titre complet tient sous les
  // 60 caractères affichés par Google. Le précédent était coupé par un « … »
  // en pleine phrase dans les résultats de recherche.
  title: "Entremets artisanaux à Cotonou",
  description:
    `Commandez vos glaces artisanales en ligne à Cotonou. Sur place, à emporter ou livraison. Paiement MoMo et carte. ${SITE_NAME_WITH_CREDIT}.`,
  path: "/",
  ogImage: getProductImageUrl("mango-passion"),
});

export default async function HomePage() {
  const content = await getHomePageContent();

  return (
    <>
      <JsonLd
        data={[
          buildOrganizationSchema(),
          buildWebSiteSchema(),
          buildIceCreamShopSchema(),
        ]}
      />
      <LandingPage content={content} />
    </>
  );
}
