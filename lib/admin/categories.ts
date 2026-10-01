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
  /** Chocolats d'accompagnement — vendus en duo avec un bouquet. */
  "Chocolats",
  "Carte",
  "Cadeaux",
  /**
   * Vins, spiritueux **et champagnes** — vendus en bouteille, à emporter ou en
   * complément.
   *
   * Libellé exact voulu par la maison : « Vin / Spiritueux ». Ni
   * « Vin / Champagne », ni « Vins & Spiritueux ».
   *
   * Les champagnes y sont rattachés : « Boissons » et « Boissons & Extras »
   * découpaient la même famille en trois, et « Boissons & Extras » n'existait
   * que dans les données, jamais dans le code.
   */
  "Vin / Spiritueux",
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
  "Chocolats",
  "Sur commande",
  "Carte",
  "Cadeaux",
  /**
   * Les bouteilles s'achètent et se réapprovisionnent, elles ne se préparent
   * pas le jour même : les faire dépendre du menu du jour les rendrait
   * invendables dès qu'aucun menu n'est actif.
   */
  "Vin / Spiritueux",
];

export function isUnlimitedStockCategory(category: string): boolean {
  return UNLIMITED_STOCK_CATEGORIES.includes(category as ProductCategory);
}

/**
 * Candidats à l'upsell du checkout : nounours, cartes, chocolats.
 *
 * Les chocolats manquaient ici, alors que `step-upsell.tsx` contient déjà
 * toute la logique « duo rose + chocolat » (`isChocolateSupplement`) : faute
 * de candidats, cette branche ne se déclenchait jamais. Les compositions de
 * roses n'y sont pas : proposer un bouquet à qui en a déjà un n'a pas de sens,
 * leur cross-sell vit sur la fiche produit.
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
  if (s.startsWith("bouquet")) return "Cadeaux";
  return "Entremets";
}
