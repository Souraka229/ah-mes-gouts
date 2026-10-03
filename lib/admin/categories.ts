/**
 * Catégories produits — source unique admin + boutique.
 *
 * Liste volontairement courte : « Menu du jour » est un planning (écran Menus),
 * pas une catégorie de fiche ; « Cadeaux » se fond dans Fleurs (bouquets).
 */
export const PRODUCT_CATEGORIES = [
  "Entremets",
  /** Grands entremets vendus à la part, 72 h de préparation. */
  "Sur commande",
  "Nounours",
  /** Bouquets et compositions florales — stock non suivi. */
  "Fleurs",
  /** Chocolats d'accompagnement — vendus en duo avec un bouquet. */
  "Chocolats",
  /** Cartes de vœux / messages. */
  "Carte",
  /**
   * Vins, spiritueux **et champagnes** — vendus en bouteille.
   * Libellé exact : « Vin / Spiritueux ».
   */
  "Vin / Spiritueux",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/**
 * Anciennes valeurs encore présentes en base / imports.
 * Toujours normaliser à la lecture et à l'écriture.
 */
const LEGACY_CATEGORY_ALIASES: Record<string, ProductCategory> = {
  "Menu du jour": "Entremets",
  Cadeaux: "Fleurs",
  Boissons: "Vin / Spiritueux",
  "Boissons & Extras": "Vin / Spiritueux",
  "Vin / Champagne": "Vin / Spiritueux",
  "Vins & Spiritueux": "Vin / Spiritueux",
};

/** Ramène toute chaîne catégorie vers le référentiel courant. */
export function normalizeProductCategory(raw: string | null | undefined): ProductCategory {
  const trimmed = raw?.trim() || "Entremets";
  if (PRODUCT_CATEGORIES.includes(trimmed as ProductCategory)) {
    return trimmed as ProductCategory;
  }
  return LEGACY_CATEGORY_ALIASES[trimmed] ?? "Entremets";
}

/**
 * Stock non consommé à la commande.
 *
 * Ces produits ne dépendent pas du menu du jour : ils sont montés ou
 * réapprovisionnés à la demande.
 */
export const UNLIMITED_STOCK_CATEGORIES: ProductCategory[] = [
  "Nounours",
  "Fleurs",
  "Chocolats",
  "Sur commande",
  "Carte",
  "Vin / Spiritueux",
];

export function isUnlimitedStockCategory(category: string): boolean {
  return UNLIMITED_STOCK_CATEGORIES.includes(normalizeProductCategory(category));
}

/**
 * Candidats à l'upsell du checkout : nounours, cartes, chocolats.
 */
export const UPSELL_CATEGORIES: ProductCategory[] = [
  "Nounours",
  "Carte",
  "Chocolats",
];

export function inferCategoryFromSlug(slug: string): ProductCategory {
  const s = slug.toLowerCase();
  if (s.includes("nounours")) return "Nounours";
  if (s.startsWith("vin-") || s.includes("champagne")) return "Vin / Spiritueux";
  if (s.includes("carte") || s.includes("cadeau")) return "Carte";
  if (s.startsWith("bouquet") || s.includes("rose")) return "Fleurs";
  if (s.includes("chocolat")) return "Chocolats";
  return "Entremets";
}
