import type { Metadata } from "next";

import { CatalogueView } from "@/components/shop/catalogue-view";
import { JsonLd } from "@/components/seo/json-ld";
import {
  createPageMetadata,
  hasCatalogueFilterParams,
} from "@/lib/seo/metadata";
import { buildBreadcrumbSchema } from "@/lib/seo/schemas";
import { getFullCatalog, getShopProductsFromActiveMenu } from "@/lib/server/shop-catalog";

type CataloguePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const breadcrumbs = [
  { name: "Accueil", path: "/" },
  { name: "Catalogue", path: "/catalogue" },
];

export async function generateMetadata({
  searchParams,
}: CataloguePageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasFilters = hasCatalogueFilterParams(params);

  return createPageMetadata({
    title: "Catalogue glaces artisanales — Cotonou",
    description:
      "Découvrez notre catalogue de glaces premium à Cotonou. Parfums uniques, livraison ou retrait, commande en ligne en quelques clics.",
    path: "/catalogue",
    noIndex: hasFilters,
  });
}

export default async function CataloguePage({
  searchParams,
}: CataloguePageProps) {
  const params = await searchParams;
  const initialPromotionsOnly = params.promotions === "1";
  const initialGiftsOnly = params.cadeaux === "1";
  const [menuProducts, allProducts] = await Promise.all([
    getShopProductsFromActiveMenu(),
    getFullCatalog(),
  ]);

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <CatalogueView
        initialPromotionsOnly={initialPromotionsOnly}
        initialGiftsOnly={initialGiftsOnly}
        menuProducts={menuProducts}
        allProducts={allProducts}
      />
    </>
  );
}
