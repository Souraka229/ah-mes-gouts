import { getProductGalleryImages } from "@/lib/product-images";
import {
  getProductCategory,
  getProductPrice,
  isProductAvailable,
} from "@/lib/catalog-utils";
import { UPSELL_CATEGORIES } from "@/lib/admin/categories";
import { getAdminCatalog } from "@/lib/server/admin-catalog-repository";
import { getShopProductsFromActiveMenu } from "@/lib/server/menu-repository";
import {
  getActiveVariantsByProductIds,
  type VariantRecord,
} from "@/lib/server/variant-repository";
import type { Product, ProductVariantView } from "@/types/product";

export { getShopProductsFromActiveMenu };

export type MenuShowcaseItem = {
  id: string;
  name: string;
  keyword: string;
  price: number;
  image: string;
  slug: string;
  product: Product;
};

/**
 * Un produit n'est visible côté public que s'il est **publié**.
 *
 * Défaut `published` : les produits antérieurs au champ restent visibles. Seuls
 * un brouillon et un produit masqué disparaissent de la boutique — la même
 * règle est appliquée par la policy RLS `product_public_read`, pour que l'API
 * REST publique ne laisse pas fuiter un brouillon.
 */
export function isPubliclyVisible(product: Product): boolean {
  return (product.visibility ?? "published") === "published";
}

function toVariantView(variant: VariantRecord): ProductVariantView {
  return {
    id: variant.id,
    code: variant.code,
    label: variant.label,
    price: variant.price,
    sortOrder: variant.sortOrder,
    isActive: variant.isActive,
    stockRemaining: variant.stockRemaining,
  };
}

/**
 * Attache les variantes actives aux produits, en **une** requête.
 *
 * Nécessaire à l'affichage (prix par taille, « à partir de »). Le prix
 * réellement facturé reste recalculé côté serveur au moment de la commande :
 * ces valeurs ne sont jamais une source de vérité.
 */
export async function attachVariants(products: Product[]): Promise<Product[]> {
  if (products.length === 0) return products;

  const byProduct = await getActiveVariantsByProductIds(
    products.map((product) => product.id),
  );
  if (byProduct.size === 0) return products;

  return products.map((product) => {
    const variants = byProduct.get(product.id);
    return variants && variants.length > 0
      ? { ...product, variants: variants.map(toVariantView) }
      : product;
  });
}

/** Catalogue public : produits publiés, variantes actives attachées. */
export async function getShopCatalogue(): Promise<Product[]> {
  const catalog = await getFullCatalog();
  return attachVariants(catalog.filter(isPubliclyVisible));
}

/** Catalogue complet — **usage interne** (admin, facturation). Brouillons inclus. */
export async function getFullCatalog(): Promise<Product[]> {
  return getAdminCatalog();
}

export async function getShopProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const catalog = await getFullCatalog();
  const product = catalog.find((p) => p.slug === slug);
  if (!product || !isPubliclyVisible(product)) return undefined;

  const [hydrated] = await attachVariants([product]);
  return hydrated ?? product;
}

export async function getIndexableShopProducts(): Promise<Product[]> {
  const catalog = await getFullCatalog();
  return attachVariants(catalog.filter(isPubliclyVisible).filter(isProductAvailable));
}

export async function getMenuDuJourShowcaseForLanding(): Promise<
  MenuShowcaseItem[]
> {
  const menuProducts = await getShopProductsFromActiveMenu();
  const picks = menuProducts.filter(isProductAvailable).slice(0, 4);
  const hydrated = await attachVariants(picks);

  return hydrated.map((product) => ({
    id: product.slug,
    name: product.name,
    keyword:
      product.keyword?.trim() ||
      (product.isNew ? "Nouveau" : product.isPopular ? "Populaire" : "Du jour"),
    price: getProductPrice(product),
    image: product.imageUrl,
    slug: product.slug,
    product,
  }));
}

export async function getGiftProductsBySlugs(
  slugs: string[],
): Promise<Product[]> {
  const catalog = await getFullCatalog();
  return slugs
    .map((slug) => catalog.find((p) => p.slug === slug))
    .filter((p): p is Product => Boolean(p));
}

export async function getSimilarShopProducts(
  slug: string,
  limit = 4,
): Promise<Product[]> {
  const current = await getShopProductBySlug(slug);
  const catalog = await getFullCatalog();
  if (!current) return [];

  const similar = catalog
    .filter(
      (p) =>
        p.slug !== slug && isPubliclyVisible(p) && isProductAvailable(p),
    )
    .sort((a, b) => {
      const score = (p: Product) =>
        (p.isPopular ? 2 : 0) +
        (p.isMenuDuJour ? 1 : 0) +
        (current.isPromotion && p.isPromotion ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);

  return attachVariants(similar);
}

export async function getUpsellCandidates(): Promise<Product[]> {
  const catalog = await getFullCatalog();

  const candidates = catalog
    .filter((product) => {
      const category = getProductCategory(product);
      return UPSELL_CATEGORIES.includes(
        category as (typeof UPSELL_CATEGORIES)[number],
      );
    })
    .filter(isPubliclyVisible)
    .filter(isProductAvailable)
    .sort((a, b) => getProductPrice(a) - getProductPrice(b))
    .slice(0, 6);

  return attachVariants(candidates);
}

export function getProductGalleryUrls(product: Product): string[] {
  const gallery = getProductGalleryImages(product);
  if (gallery.length > 0) return gallery;
  return product.imageUrl ? [product.imageUrl] : [];
}
