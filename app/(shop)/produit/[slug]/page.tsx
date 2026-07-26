import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductPurchasePanel } from "@/components/shop/product-purchase-panel";
import { ProductViewTracker } from "@/components/shop/product-view-tracker";
import { SimilarProducts } from "@/components/shop/similar-products";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { getProductPrice, isProductAvailable } from "@/lib/catalog-utils";
import { getOgImageUrl } from "@/lib/seo/images";
import { createPageMetadata } from "@/lib/seo/metadata";
import { SITE_NAME } from "@/lib/seo/site";
import {
  buildBreadcrumbSchema,
  buildProductSchema,
} from "@/lib/seo/schemas";
import {
  getFullCatalog,
  getProductGalleryUrls,
  getShopProductBySlug,
  getSimilarShopProducts,
} from "@/lib/server/shop-catalog";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const catalog = await getFullCatalog();
    return catalog.map((product) => ({ slug: product.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getShopProductBySlug(slug);

  if (!product) {
    return { title: "Produit introuvable" };
  }

  const price = getProductPrice(product);

  return createPageMetadata({
    title: `${product.name} — Glace artisanale Cotonou`,
    description: `Commandez ${product.name} en ligne à Cotonou dès ${formatPrice(price)}. ${product.description} Livraison rapide ${SITE_NAME}.`,
    path: `/produit/${product.slug}`,
    ogImage: getOgImageUrl(product.imageUrl),
    ogType: "product",
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getShopProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [gallery, similar] = await Promise.all([
    Promise.resolve(getProductGalleryUrls(product)),
    getSimilarShopProducts(slug),
  ]);
  const available = isProductAvailable(product);
  const price = getProductPrice(product);

  const breadcrumbs = [
    { name: "Accueil", path: "/" },
    { name: "Catalogue", path: "/catalogue" },
    { name: product.name, path: `/produit/${product.slug}` },
  ];

  return (
    <>
      <ProductViewTracker
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
      />
      <JsonLd
        data={[
          buildBreadcrumbSchema(breadcrumbs),
          buildProductSchema(product),
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery
            images={gallery}
            productName={product.name}
            priority
          />

          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {product.isNew && available && (
                <Badge className="bg-primary text-primary-foreground">
                  Nouveau
                </Badge>
              )}
              {product.isPromotion && available && (
                <Badge className="bg-accent text-text">Promo</Badge>
              )}
              {!available && <Badge variant="destructive">Épuisé</Badge>}
            </div>

            <h1 className="font-display text-4xl font-semibold text-primary sm:text-5xl">
              {product.name}
            </h1>

            <p className="mt-3 font-body text-lg text-muted-foreground lg:hidden">
              {formatPrice(price)}
            </p>

            <div className="mt-8">
              <ProductPurchasePanel product={product} />
            </div>
          </div>
        </div>

        <SimilarProducts products={similar} />
      </div>
    </>
  );
}
