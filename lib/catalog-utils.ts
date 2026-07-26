import { GIFT_CARD_SLUG } from "@/lib/constants/products";
import type { Product } from "@/types/product";

/** Prix effectif (promo incluse) — source unique côté shop. */
export function getProductPrice(product: Product): number {
  if (product.isPromotion && product.promotionPrice !== undefined) {
    return product.promotionPrice;
  }
  return product.price;
}

export function isProductAvailable(product: Product): boolean {
  return product.stockRemaining > 0;
}

export function isGiftCardProduct(product: Product): boolean {
  return product.isGiftCard === true || product.slug === GIFT_CARD_SLUG;
}

export function isGiftBandProduct(product: Product): boolean {
  return (
    isGiftCardProduct(product) ||
    product.slug === "nounours-beige" ||
    product.slug === "bouquet-roses"
  );
}

export function getPriceBounds(items: Product[]): [number, number] {
  if (items.length === 0) return [0, 0];
  const prices = items.map(getProductPrice);
  return [Math.min(...prices), Math.max(...prices)];
}

export function filterProducts(
  items: Product[],
  filters: {
    search: string;
    priceRange: [number, number];
    inStockOnly: boolean;
    newOnly: boolean;
    promotionsOnly: boolean;
    giftsOnly?: boolean;
  },
): Product[] {
  const query = filters.search.trim().toLowerCase();

  return items.filter((product) => {
    const price = getProductPrice(product);
    const matchesSearch =
      query.length === 0 ||
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);
    const matchesPrice =
      price >= filters.priceRange[0] && price <= filters.priceRange[1];
    const matchesStock =
      !filters.inStockOnly || isProductAvailable(product);
    const matchesNew = !filters.newOnly || product.isNew;
    const matchesPromo =
      !filters.promotionsOnly || product.isPromotion;
    const matchesGifts =
      !filters.giftsOnly || isGiftBandProduct(product);

    return (
      matchesSearch &&
      matchesPrice &&
      matchesStock &&
      matchesNew &&
      matchesPromo &&
      matchesGifts
    );
  });
}
