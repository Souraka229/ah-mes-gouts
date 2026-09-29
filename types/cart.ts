export type SupplementOption = {
  id: string;
  name: string;
  price: number;
};

/**
 * Un complément choisi dans le panier.
 *
 * Les champs au-delà de `id` / `name` / `price` sont **optionnels à dessein** :
 * les paniers déjà écrits dans le LocalStorage d'une cliente n'en ont aucun, et
 * doivent continuer de se lire. Ils sont enrichis par le sélecteur d'options.
 *
 * `id` est l'identifiant de l'option en base ; pour les paniers d'avant le
 * système d'options, c'est l'ancien identifiant (« chantilly »), que le serveur
 * résout par slug.
 */
export type CartSupplement = SupplementOption & {
  /** Nombre d'unités — utile seulement pour une option facturée `per_unit`. */
  quantity?: number;
  /** Texte écrit par la cliente (carte message). */
  message?: string;
  /** Slug de la carte / occasion choisie (« anniversaire »). */
  occasionCategorySlug?: string;
  /** Occasion libre, quand « Autre » a été choisi. */
  customOccasion?: string;
  /** Groupe d'appartenance (« Vin / Spiritueux ») — pour l'affichage. */
  groupName?: string;
  /** Titre de sous-famille à l'affichage (« Champagne sans alcool »). */
  subgroupLabel?: string;
  /** Renseigné pour les options facturées à l'unité. */
  pricingType?: "fixed" | "per_unit";
  unitLabel?: string;
};

export type CartLineItem = {
  lineId: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  baseUnitPrice: number;
  supplements: CartSupplement[];
  quantity: number;
  /**
   * Code de la variante choisie (taille, format…). Transmis au serveur, qui
   * résout le prix dans sa propre table — sans lui, le prix affiché n'est pas
   * celui facturé. Fait partie de la fingerprint : deux tailles différentes ne
   * doivent jamais fusionner en une seule ligne.
   */
  variantCode?: string;
  /**
   * @deprecated Ancien champ taille nounours, remplacé par `variantCode`.
   * Conservé pour les paniers déjà en LocalStorage.
   */
  sizeCm?: number;
};

export type CartTotals = {
  itemCount: number;
  subtotal: number;
  delivery: number;
  tax: number;
  total: number;
};

export type AddToCartPayload = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  baseUnitPrice: number;
  supplements: CartSupplement[];
  quantity: number;
  variantCode?: string;
  /** @deprecated Remplacé par `variantCode`. */
  sizeCm?: number;
};
