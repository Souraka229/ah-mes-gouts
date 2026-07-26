/**
 * Catégories produits — source unique admin + boutique.
 */
export const PRODUCT_CATEGORIES = [
  "Entremets",
  "Menu du jour",
  "Nounours",
  "Carte",
  "Cadeaux",
  "Boissons",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Stock non consommé à la commande — toujours commandables. */
export const UNLIMITED_STOCK_CATEGORIES: ProductCategory[] = [
  "Nounours",
  "Carte",
  "Cadeaux",
];

export function isUnlimitedStockCategory(category: string): boolean {
  return UNLIMITED_STOCK_CATEGORIES.includes(category as ProductCategory);
}

/** Upsell : nounours + cartes. */
export const UPSELL_CATEGORIES: ProductCategory[] = ["Nounours", "Carte"];

export function inferCategoryFromSlug(slug: string): ProductCategory {
  const s = slug.toLowerCase();
  if (s.includes("nounours")) return "Nounours";
  if (s.includes("carte") || s.includes("cadeau")) return "Carte";
  if (s.startsWith("bouquet")) return "Cadeaux";
  return "Entremets";
}
