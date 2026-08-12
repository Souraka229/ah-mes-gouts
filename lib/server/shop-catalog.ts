import { getProductGalleryImages } from "@/lib/product-images";
import {
  getProductCategory,
  getProductPrice,
  isProductAvailable,
} from "@/lib/catalog-utils";
import { UPSELL_CATEGORIES } from "@/lib/admin/categories";
import { getAdminCatalog } from "@/lib/server/admin-catalog-repository";
import { getShopProductsFromActiveMenu } from "@/lib/server/menu-repository";
import type { Product } from "@/types/product";
import { unstable_cache } from "next/cache";

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

const getCachedCatalog = unstable_cache(
  async () => getAdminCatalog(),
  ["shop-full-catalog"],
  { revalidate: 120, tags: ["catalog"] },
);

export async function getFullCatalog(): Promise<Product[]> {
  return getCachedCatalog();
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

export async function getUpsellCandidates(): Promise<Product[]> {
  const catalog = await getFullCatalog();

  return catalog
    .filter((product) => {
      const category = getProductCategory(product);
      return UPSELL_CATEGORIES.includes(
        category as (typeof UPSELL_CATEGORIES)[number],
      );
    })
    .filter(isProductAvailable)
    .sort((a, b) => getProductPrice(a) - getProductPrice(b))
    .slice(0, 6);
}

export function getProductGalleryUrls(product: Product): string[] {
  const gallery = getProductGalleryImages(product);
  if (gallery.length > 0) return gallery;
  return product.imageUrl ? [product.imageUrl] : [];
}
