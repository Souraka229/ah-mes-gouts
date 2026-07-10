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

export function buildLineFingerprint(
  productId: string,
  supplements: CartSupplement[],
): string {
  const supplementIds = supplements
    .map((supplement) => supplement.id)
    .sort()
    .join(",");
  return `${productId}:${supplementIds}`;
}

export function createLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function mergeCartLine(
  items: CartLineItem[],
  payload: AddToCartPayload,
): CartLineItem[] {
  const fingerprint = buildLineFingerprint(
    payload.productId,
    payload.supplements,
  );

  const existingIndex = items.findIndex(
    (item) =>
      buildLineFingerprint(item.productId, item.supplements) === fingerprint,
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
      },
    ];
  }

  return items.map((item, index) =>
    index === existingIndex
      ? { ...item, quantity: item.quantity + payload.quantity }
      : item,
  );
}
