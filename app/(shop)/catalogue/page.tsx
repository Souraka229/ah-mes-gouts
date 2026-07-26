import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogueView } from "@/components/shop/catalogue-view";
import { JsonLd } from "@/components/seo/json-ld";
import { isUnlimitedStockCategory } from "@/lib/admin/categories";
import { getProductCategory } from "@/lib/catalog-utils";
import { createPageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbSchema } from "@/lib/seo/schemas";
import {
  getFullCatalog,
  getShopProductsFromActiveMenu,
} from "@/lib/server/shop-catalog";

const breadcrumbs = [
  { name: "Accueil", path: "/" },
  { name: "Catalogue", path: "/catalogue" },
];

/** ISR — filtres ?promotions= lus côté client (ne casse pas le cache). */
export const revalidate = 300;

export const metadata: Metadata = createPageMetadata({
  title: "Catalogue glaces artisanales — Cotonou",
  description:
    "Découvrez notre catalogue de glaces premium à Cotonou. Parfums uniques, livraison ou retrait, commande en ligne en quelques clics.",
  path: "/catalogue",
});

export default async function CataloguePage() {
  const [menuProducts, allProducts] = await Promise.all([
    getShopProductsFromActiveMenu(),
    getFullCatalog(),
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
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-16 font-body text-muted-foreground">
            Chargement du catalogue…
          </div>
        }
      >
        <CatalogueView
          menuProducts={menuProducts}
          allProducts={dailyCatalog}
        />
      </Suspense>
    </>
  );
}
