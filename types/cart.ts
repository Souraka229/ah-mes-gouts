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
   * Taille en cm pour les produits à paliers (nounours). Transmise au serveur,
   * qui reprice depuis `NOUNOURS_SIZES` — sans elle, le prix affiché n'est pas
   * celui facturé. Fait aussi partie de la fingerprint : deux tailles
   * différentes ne doivent jamais fusionner en une seule ligne.
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
  sizeCm?: number;
};
