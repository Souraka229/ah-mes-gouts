import type {
  AddToCartPayload,
  CartLineItem,
  CartSupplement,
  CartTotals,
} from "@/types/cart";

export function getLineUnitPrice(item: Pick<CartLineItem, "baseUnitPrice" | "supplements">): number {
  const supplementsTotal = item.supplements.reduce(
    (sum, supplement) => sum + supplement.price,
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
  const supplementIds = supplements
    .map((supplement) => supplement.id)
    .sort()
    .join(",");
  return `${productId}:${variantKey ?? ""}:${supplementIds}`;
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
