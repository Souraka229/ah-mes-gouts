import type {
  AddToCartPayload,
  CartLineItem,
  CartSupplement,
  CartTotals,
} from "@/types/cart";

/**
 * Prix unitaire affiché d'une ligne.
 *
 * C'est une **estimation** : le prix qui fait foi est recalculé par le serveur
 * dans `priceOrderItems`. Elle doit donc compter comme lui — un topper facturé
 * à l'unité vaut `prix × quantité`, pas `prix`.
 */
export function getLineUnitPrice(item: Pick<CartLineItem, "baseUnitPrice" | "supplements">): number {
  const supplementsTotal = item.supplements.reduce(
    (sum, supplement) => sum + supplement.price * (supplement.quantity ?? 1),
    0,
  );
  return item.baseUnitPrice + supplementsTotal;
}

export function getLineTotal(item: CartLineItem): number {
  return getLineUnitPrice(item) * item.quantity;
}

export function getCartTotals(items: CartLineItem[]): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + getLineTotal(item), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const delivery = 0;
  const tax = 0;

  return {
    itemCount,
    subtotal,
    delivery,
    tax,
    total: subtotal + delivery + tax,
  };
}

/**
 * Empreinte d'une ligne de panier.
 *
 * La variante en fait partie : un nounours 20 cm et un nounours 150 cm sont
 * deux lignes distinctes, jamais fusionnées. `variantKey` accepte l'ancien
 * `sizeCm` numérique pour les paniers déjà en LocalStorage.
 */
export function buildLineFingerprint(
  productId: string,
  supplements: CartSupplement[],
  variantKey?: string | number,
): string {
  /**
   * La quantité et le **message** entrent dans l'empreinte : deux cartes au
   * même prix mais avec des textes différents sont deux lignes distinctes.
   * Les fusionner ferait disparaître le mot de l'une des deux clientes.
   */
  const supplementKey = supplements
    .map((supplement) => ({
      id: supplement.id,
      quantity: supplement.quantity ?? 1,
      message: (supplement.message ?? "").trim(),
      occasion: supplement.occasionCategorySlug ?? "",
      customOccasion: (supplement.customOccasion ?? "").trim(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (entry) =>
        `${entry.id}×${entry.quantity}:${entry.message}:${entry.occasion}:${entry.customOccasion}`,
    )
    .join("|");

  return `${productId}:${variantKey ?? ""}:${supplementKey}`;
}

export function createLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function mergeCartLine(
  items: CartLineItem[],
  payload: AddToCartPayload,
): CartLineItem[] {
  const payloadVariant = payload.variantCode ?? payload.sizeCm;
  const fingerprint = buildLineFingerprint(
    payload.productId,
    payload.supplements,
    payloadVariant,
  );

  const existingIndex = items.findIndex(
    (item) =>
      buildLineFingerprint(
        item.productId,
        item.supplements,
        item.variantCode ?? item.sizeCm,
      ) === fingerprint,
  );

  if (existingIndex === -1) {
    return [
      ...items,
      {
        lineId: createLineId(),
        productId: payload.productId,
        slug: payload.slug,
        name: payload.name,
        imageUrl: payload.imageUrl,
        baseUnitPrice: payload.baseUnitPrice,
        supplements: payload.supplements,
        quantity: payload.quantity,
        variantCode: payload.variantCode,
        sizeCm: payload.sizeCm,
      },
    ];
  }

  return items.map((item, index) =>
    index === existingIndex
      ? { ...item, quantity: item.quantity + payload.quantity }
      : item,
  );
}
