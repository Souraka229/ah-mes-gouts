import { getProductPrice, getProductCategory } from "@/lib/catalog-utils";
import { isUnlimitedStockCategory } from "@/lib/admin/categories";
import {
  getFullCatalog,
  getShopProductsFromActiveMenu,
} from "@/lib/server/shop-catalog";
import { getPrisma } from "@/lib/prisma";
import { supplementOptions } from "@/lib/supplements";
import type { SavedOrder } from "@/types/order";

export type PricingIssue = { name: string; message: string };

export type StockClaim = {
  slug: string;
  name: string;
  quantity: number;
  category?: string;
  unlimitedStock?: boolean;
};

export type PricedOrder = {
  /** Articles avec prix unitaires recalculés côté serveur. */
  items: SavedOrder["items"];
  subtotal: number;
  /** Décréments de stock à appliquer atomiquement à la création. */
  stockClaims: StockClaim[];
};

export type RawOrderItem = {
  slug?: string;
  name: string;
  quantity: number;
  supplements: string[];
};

/** Prix des suppléments, source de vérité serveur (jamais le client). */
const supplementPriceByName = new Map(
  supplementOptions.map((option) => [option.name, option.price]),
);

/**
 * Recalcule prix unitaires, sous-total et stock à partir du catalogue serveur.
 * Ignore totalement les montants envoyés par le client (anti-fraude).
 * Retourne les problèmes (stock, produit/supplément inconnu) le cas échéant.
 */
export async function priceOrderItems(
  rawItems: RawOrderItem[],
): Promise<
  | { ok: true; data: PricedOrder }
  | { ok: false; issues: PricingIssue[] }
> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      ok: false,
      issues: [{ name: "Panier", message: "Votre panier est vide." }],
    };
  }

  const [catalog, activeMenuProducts] = await Promise.all([
    getFullCatalog(),
    getShopProductsFromActiveMenu(),
  ]);
  const bySlug = new Map(catalog.map((product) => [product.slug, product]));
  const byName = new Map(catalog.map((product) => [product.name, product]));
  const activeMenuSlugs = new Set(
    activeMenuProducts.map((product) => product.slug),
  );

  const slugs = rawItems
    .map((item) => item.slug)
    .filter((slug): slug is string => Boolean(slug));

  const liveStock = new Map<string, number>();
  if (slugs.length > 0) {
    const prisma = getPrisma();
    const rows = await prisma.product.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, stockRemaining: true },
    });
    for (const row of rows) {
      liveStock.set(row.slug, row.stockRemaining);
    }
  }

  const issues: PricingIssue[] = [];
  const items: SavedOrder["items"] = [];
  const stockClaims: StockClaim[] = [];
  let subtotal = 0;

  for (const raw of rawItems) {
    const product =
      (raw.slug ? bySlug.get(raw.slug) : undefined) ?? byName.get(raw.name);

    if (!product) {
      issues.push({
        name: raw.name,
        message: "Ce produit n'est plus disponible.",
      });
      continue;
    }

    const category = getProductCategory(product);
    const unlimitedStock = isUnlimitedStockCategory(category);

    if (!unlimitedStock) {
      if (!activeMenuSlugs.has(product.slug)) {
        issues.push({
          name: product.name,
          message:
            "Ce produit ne fait pas partie du menu disponible aujourd’hui.",
        });
        continue;
      }

      const stockRemaining =
        liveStock.get(product.slug) ?? product.stockRemaining;

      if (
        process.env.NODE_ENV === "production" &&
        !liveStock.has(product.slug)
      ) {
        issues.push({
          name: product.name,
          message: "Ce produit n'est plus disponible.",
        });
        continue;
      }

      if (stockRemaining <= 0) {
        issues.push({
          name: product.name,
          message: "Ce produit vient d'être épuisé.",
        });
        continue;
      }

      if (raw.quantity > stockRemaining) {
        issues.push({
          name: product.name,
          message: `Stock insuffisant (${stockRemaining} restant${
            stockRemaining > 1 ? "s" : ""
          }).`,
        });
        continue;
      }
    }

    let supplementsPrice = 0;
    let supplementInvalid = false;
    for (const supplementName of raw.supplements) {
      const price = supplementPriceByName.get(supplementName);
      if (price === undefined) {
        issues.push({
          name: product.name,
          message: `Supplément indisponible : ${supplementName}.`,
        });
        supplementInvalid = true;
        break;
      }
      supplementsPrice += price;
    }
    if (supplementInvalid) continue;

    const unitPrice = getProductPrice(product) + supplementsPrice;
    subtotal += unitPrice * raw.quantity;

    items.push({
      name: product.name,
      quantity: raw.quantity,
      unitPrice,
      supplements: raw.supplements,
      slug: product.slug,
    });
    stockClaims.push({
      slug: product.slug,
      name: product.name,
      quantity: raw.quantity,
      category,
      unlimitedStock,
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, data: { items, subtotal, stockClaims } };
}
