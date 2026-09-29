import { describe, expect, it } from "vitest";

import {
  getEffectiveStock,
  isExhausted,
  isLowStock,
} from "@/lib/product-stock-display";
import type { Product, ProductVariantView } from "@/types/product";

function product(partial: Partial<Product>): Product {
  return {
    id: "p1",
    slug: "p1",
    name: "Produit",
    price: 5_000,
    category: "Entremets",
    stockRemaining: 10,
    stockMinimum: 3,
    ...partial,
  } as unknown as Product;
}

function variant(
  id: string,
  stockRemaining: number | null,
  isActive = true,
): ProductVariantView {
  return {
    id,
    code: id,
    label: id,
    price: 5_000,
    sortOrder: 0,
    isActive,
    stockRemaining,
  };
}

/**
 * Le stock d'un produit à variantes est porté par ses variantes : la commande
 * décrémente la variante, pas le produit. Lire `product.stockRemaining`
 * revenait donc à ne jamais signaler ces produits.
 */
describe("getEffectiveStock — produit sans variante", () => {
  it("retourne le stock du produit", () => {
    expect(getEffectiveStock(product({ stockRemaining: 7 }))).toBe(7);
  });

  it("retourne 0 quand le produit est épuisé", () => {
    expect(getEffectiveStock(product({ stockRemaining: 0 }))).toBe(0);
  });
});

describe("getEffectiveStock — produit à variantes", () => {
  it("additionne le stock des variantes actives", () => {
    const p = product({
      stockRemaining: 999,
      variants: [variant("s", 2), variant("m", 3), variant("l", 5)],
    });

    expect(getEffectiveStock(p)).toBe(10);
  });

  it("ignore les variantes désactivées", () => {
    const p = product({
      variants: [variant("s", 4), variant("old", 100, false)],
    });

    expect(getEffectiveStock(p)).toBe(4);
  });

  it("retourne 0 quand toutes les variantes actives sont épuisées", () => {
    const p = product({
      // Le compteur du produit reste haut : c'est justement le piège.
      stockRemaining: 50,
      variants: [variant("s", 0), variant("m", 0)],
    });

    expect(getEffectiveStock(p)).toBe(0);
    expect(isExhausted(p)).toBe(true);
  });

  it("traite une variante non suivie comme illimité, pas comme zéro", () => {
    const p = product({
      variants: [variant("s", 0), variant("unique", null)],
    });

    expect(getEffectiveStock(p)).toBeNull();
    expect(isExhausted(p)).toBe(false);
    expect(isLowStock(p)).toBe(false);
  });
});

describe("seuils d'alerte", () => {
  it("signale un stock bas au seuil", () => {
    expect(isLowStock(product({ stockRemaining: 3, stockMinimum: 3 }))).toBe(true);
  });

  it("ne signale pas un stock confortable", () => {
    expect(isLowStock(product({ stockRemaining: 50, stockMinimum: 3 }))).toBe(false);
  });

  it("signale un produit à variantes sous le seuil", () => {
    const p = product({
      stockRemaining: 500,
      stockMinimum: 3,
      variants: [variant("s", 1), variant("m", 1)],
    });

    expect(isLowStock(p)).toBe(true);
  });
});
