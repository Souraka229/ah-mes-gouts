import type { Product } from "@/types/product";

/** Stock faible : restant ≤ minimum mais encore disponible. */
export function isLowStock(product: Product): boolean {
  return (
    product.stockRemaining > 0 &&
    product.stockRemaining <= product.stockMinimum
  );
}

export function getLowStockLabel(product: Product): string {
  const n = product.stockRemaining;
  return n === 1
    ? "Plus qu'1 disponible"
    : `Plus que ${n} disponibles`;
}
