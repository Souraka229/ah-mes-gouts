import type { Product } from "@/types/product";

/** Reconstruit la liste affichée du menu du jour dans l'ordre `displayOrder`. */
export function resolveMenuProducts(
  productIds: string[],
  displayOrder: number[],
  catalog: Product[],
): Product[] {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const pairs = productIds.map((id, index) => ({
    id,
    order: displayOrder[index] ?? index,
  }));
  pairs.sort((a, b) => a.order - b.order);
  return pairs
    .map(({ id }) => byId.get(id))
    .filter((p): p is Product => Boolean(p))
    .map((p) => ({ ...p, isMenuDuJour: true }));
}
