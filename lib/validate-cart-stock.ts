import { isUnlimitedStockCategory } from "@/lib/admin/categories";
import { getProductCategory } from "@/lib/catalog-utils";
import type { CartLineItem } from "@/types/cart";
import type { Product } from "@/types/product";

export type StockValidationIssue = {
  name: string;
  message: string;
};

type StockCheckItem = Pick<CartLineItem, "slug" | "name" | "quantity"> & {
  variantCode?: string;
};

function remainingFor(
  product: Product,
  variantCode?: string,
): number | null {
  if (isUnlimitedStockCategory(getProductCategory(product))) return null;
  if (variantCode) {
    const variant = (product.variants ?? []).find(
      (entry) => entry.isActive && entry.code === variantCode,
    );
    if (variant && variant.stockRemaining !== null) {
      return variant.stockRemaining;
    }
  }
  const active = (product.variants ?? []).filter((entry) => entry.isActive);
  if (active.length > 0 && active.every((entry) => entry.stockRemaining !== null)) {
    return active.reduce((sum, entry) => sum + (entry.stockRemaining ?? 0), 0);
  }
  return product.stockRemaining;
}

/**
 * Vérifie le panier contre le catalogue.
 * Les lignes d'un même slug / variante sont **additionnées** : deux cartes
 * au même parfum ne doivent pas chacune passer un stock de 5.
 */
export function validateCartStockWithCatalog(
  items: StockCheckItem[],
  catalog: Product[],
): StockValidationIssue[] {
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const grouped = new Map<
    string,
    { name: string; slug: string; variantCode?: string; quantity: number }
  >();

  for (const item of items) {
    const key = `${item.slug}::${item.variantCode ?? ""}`;
    const current = grouped.get(key);
    if (current) {
      current.quantity += item.quantity;
    } else {
      grouped.set(key, {
        name: item.name,
        slug: item.slug,
        variantCode: item.variantCode,
        quantity: item.quantity,
      });
    }
  }

  const issues: StockValidationIssue[] = [];

  for (const group of grouped.values()) {
    const product = bySlug.get(group.slug);

    if (!product) {
      issues.push({
        name: group.name,
        message: "Ce produit n'est plus disponible.",
      });
      continue;
    }

    const remaining = remainingFor(product, group.variantCode);
    if (remaining === null) continue;

    if (remaining <= 0) {
      issues.push({
        name: product.name,
        message: "Ce produit vient d'être épuisé.",
      });
      continue;
    }

    if (group.quantity > remaining) {
      issues.push({
        name: product.name,
        message: `Stock insuffisant (${remaining} restant${remaining > 1 ? "s" : ""}).`,
      });
    }
  }

  return issues;
}
