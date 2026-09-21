import { describe, expect, it } from "vitest";

import {
  getProductPrice,
  getProductStartingPrice,
  hasVariants,
} from "@/lib/catalog-utils";
import type { Product, ProductVariantView } from "@/types/product";

const variant = (
  code: string,
  price: number,
  overrides: Partial<ProductVariantView> = {},
): ProductVariantView => ({
  id: `v-${code}`,
  code,
  label: `${code} cm`,
  price,
  sortOrder: 0,
  isActive: true,
  stockRemaining: null,
  ...overrides,
});

const product = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  slug: "nounours-teddy",
  name: "Nounours Teddy",
  description: "",
  price: 10_000,
  imageUrl: "",
  stockRemaining: 10,
  stockMinimum: 5,
  isNew: false,
  isPromotion: false,
  isMenuDuJour: false,
  isPopular: false,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("prix d'appel affiché sur une carte produit", () => {
  it("sans variante : prix catalogue, promotion appliquée", () => {
    expect(getProductStartingPrice(product())).toBe(10_000);
    expect(
      getProductStartingPrice(
        product({ isPromotion: true, promotionPrice: 8_000 }),
      ),
    ).toBe(8_000);
  });

  it("avec variantes : le plus bas palier ACTIF", () => {
    const variants = [
      variant("150", 100_000),
      variant("20", 10_000),
      variant("80", 35_000),
    ];
    expect(getProductStartingPrice(product({ variants }))).toBe(10_000);
  });

  it("ignore une variante désactivée, même moins chère", () => {
    const variants = [
      variant("20", 10_000, { isActive: false }),
      variant("25", 15_000),
      variant("30", 25_000),
    ];
    // 20 cm est désactivée : le prix d'appel ne doit pas l'annoncer.
    expect(getProductStartingPrice(product({ variants }))).toBe(15_000);
  });

  it("toutes les variantes désactivées : retombe sur le prix catalogue", () => {
    const variants = [
      variant("20", 10_000, { isActive: false }),
      variant("25", 15_000, { isActive: false }),
    ];
    expect(getProductStartingPrice(product({ variants }))).toBe(10_000);
  });

  it("hasVariants ne compte que les variantes actives", () => {
    expect(hasVariants(product())).toBe(false);
    expect(hasVariants(product({ variants: [variant("20", 10_000)] }))).toBe(true);
    expect(
      hasVariants(product({ variants: [variant("20", 10_000, { isActive: false })] })),
    ).toBe(false);
  });

  it("le prix d'appel n'altère pas le prix catalogue du produit", () => {
    const p = product({ variants: [variant("20", 10_000), variant("150", 100_000)] });
    expect(getProductStartingPrice(p)).toBe(10_000);
    // Le prix produit porté par la fiche reste inchangé — le serveur refacture
    // de toute façon la variante choisie.
    expect(getProductPrice(p)).toBe(10_000);
  });
});
