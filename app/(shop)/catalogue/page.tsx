import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogueView } from "@/components/shop/catalogue-view";
import { ShopPageSkeleton } from "@/components/shop/shop-page-skeleton";
import { JsonLd } from "@/components/seo/json-ld";
import { isUnlimitedStockCategory } from "@/lib/admin/categories";
import { getProductCategory } from "@/lib/catalog-utils";
import { createPageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbSchema } from "@/lib/seo/schemas";
import {
  attachVariants,
  getShopCatalogue,
  getShopProductsFromActiveMenu,
} from "@/lib/server/shop-catalog";

const breadcrumbs = [
  { name: "Accueil", path: "/" },
  { name: "Catalogue", path: "/catalogue" },
];

/**
 * ISR court : le menu / stock bougent souvent, mais force-dynamic
 * forçait un aller-retour DB à chaque hit (lent sur mobile).
 */
export const revalidate = 60;

export const metadata: Metadata = createPageMetadata({
  title: "Catalogue glaces artisanales — Cotonou",
  description:
    "Découvrez notre catalogue de glaces premium à Cotonou. Parfums uniques, livraison ou retrait, commande en ligne en quelques clics.",
  path: "/catalogue",
});

export default async function CataloguePage() {
  const [menuProducts, allProducts] = await Promise.all([
    getShopProductsFromActiveMenu().then(attachVariants),
    // Catalogue public : publiés uniquement, variantes actives attachées.
    getShopCatalogue(),
  ]);
  const menuSlugs = new Set(menuProducts.map((product) => product.slug));
  const dailyCatalog = allProducts.filter(
    (product) =>
      menuSlugs.has(product.slug) ||
      isUnlimitedStockCategory(getProductCategory(product)),
  );

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <Suspense fallback={<ShopPageSkeleton />}>
        <CatalogueView
          menuProducts={menuProducts}
          allProducts={dailyCatalog}
        />
      </Suspense>
    </>
  );
}
