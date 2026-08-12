/**
 * Catégories produits — source unique admin + boutique.
 */
export const PRODUCT_CATEGORIES = [
  "Entremets",
  "Menu du jour",
  /** Grands entremets vendus à la part, 72 h de préparation. */
  "Sur commande",
  "Nounours",
  /** Bouquets de roses fraîches — stock non suivi, montés à la demande. */
  "Fleurs",
  "Carte",
  "Cadeaux",
  "Boissons",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Stock non consommé à la commande — toujours commandables. */
/**
 * Stock non consommé à la commande.
 *
 * Ces produits ne dépendent pas du menu du jour : ils sont montés ou
 * réapprovisionnés à la demande. Les inclure dans le suivi de stock
 * bloquerait des ventes sans raison.
 */
export const UNLIMITED_STOCK_CATEGORIES: ProductCategory[] = [
  "Nounours",
  "Fleurs",
  "Sur commande",
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
