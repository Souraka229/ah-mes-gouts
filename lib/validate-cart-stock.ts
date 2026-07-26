import type { CartLineItem } from "@/types/cart";
import type { Product } from "@/types/product";

export type StockValidationIssue = {
  name: string;
  message: string;
};

export function validateCartStockWithCatalog(
  items: Pick<CartLineItem, "slug" | "name" | "quantity">[],
  catalog: Product[],
): StockValidationIssue[] {
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const issues: StockValidationIssue[] = [];

  for (const item of items) {
    const product = bySlug.get(item.slug);

    if (!product) {
      issues.push({
        name: item.name,
        message: "Ce produit n'est plus disponible.",
      });
      continue;
    }

    if (product.stockRemaining <= 0) {
      issues.push({
        name: product.name,
        message: "Ce produit vient d'être épuisé.",
      });
      continue;
    }

    if (item.quantity > product.stockRemaining) {
      issues.push({
        name: product.name,
        message: `Stock insuffisant (${product.stockRemaining} restant${product.stockRemaining > 1 ? "s" : ""}).`,
      });
    }
  }

  return issues;
}
