import { describe, expect, it } from "vitest";

import {
  getMaxOrderQuantity,
  isProductAvailable,
} from "@/lib/catalog-utils";
import { validateCartStockWithCatalog } from "@/lib/validate-cart-stock";
import type { Product, ProductVariantView } from "@/types/product";

const variant = (
  code: string,
  stockRemaining: number | null,
): ProductVariantView => ({
  id: `v-${code}`,
  code,
  label: code,
  price: 5000,
  sortOrder: 0,
  isActive: true,
  stockRemaining,
});

const product = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  slug: "entremets-test",
  name: "Entremets test",
  description: "",
  price: 5000,
  imageUrl: "",
  stockRemaining: 4,
  stockMinimum: 2,
  isNew: false,
  isPromotion: false,
  isMenuDuJour: false,
  isPopular: false,
  updatedAt: "2026-01-01T00:00:00.000Z",
  category: "Entremets",
  ...overrides,
});

describe("disponibilité et plafond de commande", () => {
  it("un produit à variantes épuisé n'est plus commandable", () => {
    const p = product({
      stockRemaining: 99,
      variants: [variant("6p", 0), variant("8p", 0)],
    });
    expect(isProductAvailable(p)).toBe(false);
    expect(getMaxOrderQuantity(p)).toBe(0);
  });

  it("le plafond suit la variante choisie, pas le total produit", () => {
    const p = product({
      stockRemaining: 99,
      variants: [variant("6p", 2), variant("8p", 5)],
    });
    expect(isProductAvailable(p)).toBe(true);
    expect(getMaxOrderQuantity(p, "6p")).toBe(2);
    expect(getMaxOrderQuantity(p, "8p")).toBe(5);
  });
});

describe("validation du panier (agrégation)", () => {
  it("cumule deux lignes du même slug contre le stock réel", () => {
    const catalog = [product({ stockRemaining: 5 })];
    const issues = validateCartStockWithCatalog(
      [
        { slug: "entremets-test", name: "A", quantity: 3 },
        { slug: "entremets-test", name: "B", quantity: 3 },
      ],
      catalog,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/insuffisant/i);
  });

  it("agrège par variante, pas par produit", () => {
    const catalog = [
      product({
        variants: [variant("6p", 2), variant("8p", 2)],
      }),
    ];
    const issues = validateCartStockWithCatalog(
      [
        {
          slug: "entremets-test",
          name: "6p",
          quantity: 2,
          variantCode: "6p",
        },
        {
          slug: "entremets-test",
          name: "8p",
          quantity: 2,
          variantCode: "8p",
        },
      ],
      catalog,
    );
    expect(issues).toHaveLength(0);
  });
});
