export type SupplementOption = {
  id: string;
  name: string;
  price: number;
};

export type CartSupplement = SupplementOption;

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
