import {
  getProductPrice,
  isGiftCardProduct,
  isProductAvailable,
  products as fallbackProducts,
} from "@/lib/mock-data";
import { getProductGalleryImages } from "@/lib/product-images";
import { getAdminCatalog } from "@/lib/server/admin-catalog-repository";
import { getShopProductsFromActiveMenu } from "@/lib/server/menu-repository";
import type { Product } from "@/types/product";

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

export async function getFullCatalog(): Promise<Product[]> {
  const catalog = await getAdminCatalog();
  return catalog.length > 0 ? catalog : fallbackProducts;
}

export async function getShopProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const catalog = await getFullCatalog();
  return catalog.find((p) => p.slug === slug);
}

export async function getIndexableShopProducts(): Promise<Product[]> {
  const catalog = await getFullCatalog();
  return catalog.filter(isProductAvailable);
}

export async function getMenuDuJourShowcaseForLanding(): Promise<
  MenuShowcaseItem[]
> {
  const menuProducts = await getShopProductsFromActiveMenu();
  const picks = menuProducts.filter(isProductAvailable).slice(0, 4);

  return picks.map((product) => ({
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

  return catalog
    .filter((p) => p.slug !== slug && isProductAvailable(p))
    .sort((a, b) => {
      const score = (p: Product) =>
        (p.isPopular ? 2 : 0) +
        (p.isMenuDuJour ? 1 : 0) +
        (current.isPromotion && p.isPromotion ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}

/**
 * Sélection curée de produits complémentaires pour l'étape upsell.
 * Puise dans le vrai catalogue : suppléments chocolat (duo rose + chocolat),
 * carte cadeau, le bouquet et le nounours les moins chers.
 */
export async function getUpsellCandidates(): Promise<Product[]> {
  const catalog = await getFullCatalog();
  const available = catalog.filter(isProductAvailable);

  const cheapest = (list: Product[]): Product | undefined =>
    [...list].sort((a, b) => getProductPrice(a) - getProductPrice(b))[0];

  const chocolates = available.filter((p) =>
    p.slug.startsWith("supplement-chocolat"),
  );
  const giftCard = available.find((p) => isGiftCardProduct(p));
  const bouquet = cheapest(
    available.filter((p) => p.slug.startsWith("bouquet-")),
  );
  const nounours = cheapest(
    available.filter((p) => p.slug.startsWith("nounours-")),
  );

  const picks = [...chocolates, giftCard, bouquet, nounours].filter(
    (p): p is Product => Boolean(p),
  );

  const seen = new Set<string>();
  return picks.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function getProductGalleryUrls(product: Product): string[] {
  const gallery = getProductGalleryImages(product);
  if (gallery.length > 0) return gallery;
  return product.imageUrl ? [product.imageUrl] : [];
}
