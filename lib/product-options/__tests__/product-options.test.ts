import { describe, expect, it } from "vitest";

import {
  getBouquetIncludes,
  getRoseCount,
  getRoseLabel,
  isRoseProduct,
} from "@/lib/constants/rose-compositions";
import { getRoseCompositionOptions } from "@/lib/product-options/compositions";
import { getExtraProducts, isExtraProduct } from "@/lib/product-options/extras";
import {
  isUnlimitedStockCategory,
  PRODUCT_CATEGORIES,
  UPSELL_CATEGORIES,
} from "@/lib/admin/categories";
import { formatPrice } from "@/lib/format";
import {
  formatExtraPriceDelta,
  getProductRecommendations,
  MAX_RECOMMENDED_PRODUCTS,
} from "@/lib/product-options/recommendations";
import { canCarryMessage } from "@/lib/product-options/types";
import type { Product } from "@/types/product";

function product(
  slug: string,
  name: string,
  price: number,
  category: string,
  extra: Partial<Product> = {},
): Product {
  return {
    id: slug,
    slug,
    name,
    description: "",
    price,
    imageUrl: `/images/produits/${slug}.webp`,
    stockRemaining: 9999,
    stockMinimum: 0,
    isNew: false,
    isPromotion: false,
    isMenuDuJour: false,
    isPopular: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    category,
    ...extra,
  };
}

/** Reflet du catalogue réel (scripts/seed-catalogue-maison.mjs). */
const CATALOG: Product[] = [
  product("rose-unite", "Rose à l'unité", 3500, "Fleurs"),
  product("bouquet-1-rose", "Bouquet 1 rose", 5000, "Fleurs"),
  product("bouquet-3-roses", "Bouquet 3 roses", 12000, "Fleurs"),
  product("bouquet-7-roses", "Bouquet 7 roses", 25000, "Fleurs"),
  product("bouquet-20-roses", "Bouquet 20 roses", 70000, "Fleurs"),
  product("nounours", "Nounours", 10000, "Nounours"),
  product("commande-foret-noire", "Forêt-Noire", 3500, "Sur commande"),
  product("supplement-chocolats", "Quelques chocolats", 3000, "Chocolats"),
  product(
    "supplement-chocolats-paquet",
    "Paquet complet de chocolats",
    10000,
    "Chocolats",
  ),
];

describe("compositions de roses", () => {
  it("reconnaît une composition et son nombre de roses", () => {
    expect(isRoseProduct("bouquet-7-roses")).toBe(true);
    expect(isRoseProduct("bouquet-1-rose")).toBe(true);
    expect(isRoseProduct("rose-unite")).toBe(true);
    expect(isRoseProduct("nounours")).toBe(false);
    expect(getRoseCount("bouquet-7-roses")).toBe(7);
    expect(getRoseCount("nounours")).toBeNull();
  });

  it("nomme le palier sans le mot « Bouquet »", () => {
    expect(getRoseLabel("bouquet-7-roses", "ignoré")).toBe("7 roses");
    expect(getRoseLabel("rose-unite", "ignoré")).toBe("1 rose");
    expect(getRoseLabel("nounours", "Nounours")).toBe("Nounours");
  });

  it("décrit exactement ce que contient le bouquet", () => {
    expect(getBouquetIncludes("bouquet-7-roses")).toEqual([
      "7 roses parfumées",
      "Gypsophile",
      "Carte emballée",
      "Sacoche offerte",
    ]);
    expect(getBouquetIncludes("bouquet-2-roses")).toEqual([
      "2 roses parfumées",
      "Gypsophile",
    ]);
    expect(getBouquetIncludes("rose-unite")).toEqual([
      "1 rose fraîche",
      "Sans emballage",
    ]);
  });

  it("rend les paliers dans l'ordre, au prix du catalogue", () => {
    const options = getRoseCompositionOptions(CATALOG);
    expect(options.map((o) => o.slug)).toEqual([
      "rose-unite",
      "bouquet-1-rose",
      "bouquet-3-roses",
      "bouquet-7-roses",
      "bouquet-20-roses",
    ]);
    expect(options.map((o) => o.price)).toEqual([
      3500, 5000, 12000, 25000, 70000,
    ]);
    // Les prix viennent des produits, pas d'une constante parallèle.
    for (const option of options) {
      const source = CATALOG.find((p) => p.slug === option.slug)!;
      expect(option.price).toBe(source.price);
    }
  });

  it("omet une composition absente du catalogue", () => {
    const slim = CATALOG.filter((p) => p.slug !== "bouquet-3-roses");
    expect(getRoseCompositionOptions(slim).map((o) => o.slug)).not.toContain(
      "bouquet-3-roses",
    );
  });

  it("ne masque pas un bouquet à stock nul — les fleurs ne sont pas suivies", () => {
    const soldOut = CATALOG.map((p) =>
      p.slug === "bouquet-7-roses" ? { ...p, stockRemaining: 0 } : p,
    );
    expect(getRoseCompositionOptions(soldOut).map((o) => o.slug)).toContain(
      "bouquet-7-roses",
    );
  });
});

describe("compléments", () => {
  it("ne retient que les chocolats, par prix croissant", () => {
    expect(getExtraProducts(CATALOG).map((p) => p.slug)).toEqual([
      "supplement-chocolats",
      "supplement-chocolats-paquet",
    ]);
    expect(isExtraProduct(CATALOG.find((p) => p.slug === "nounours")!)).toBe(
      false,
    );
  });

  it("affiche un écart de prix lisible", () => {
    const chocolats = CATALOG.find((p) => p.slug === "supplement-chocolats")!;
    // Comparé à `formatPrice` plutôt qu'à une espace littérale : fr-FR insère
    // une espace fine insécable (U+202F), pas une espace ordinaire.
    expect(formatExtraPriceDelta(chocolats)).toBe(`+ ${formatPrice(3000)}`);
  });
});

describe("suggestions sur la fiche produit", () => {
  const find = (slug: string) => CATALOG.find((p) => p.slug === slug)!;

  it("propose les chocolats sur un bouquet", () => {
    const [first] = getProductRecommendations({
      product: find("bouquet-7-roses"),
      catalog: CATALOG,
    });
    expect(first?.id).toBe("fleurs-duo");
    expect(first?.products.map((p) => p.slug)).toEqual([
      "supplement-chocolats",
      "supplement-chocolats-paquet",
    ]);
  });

  it("propose les chocolats sur un nounours", () => {
    const [first] = getProductRecommendations({
      product: find("nounours"),
      catalog: CATALOG,
    });
    expect(first?.id).toBe("nounours-douceur");
  });

  it("propose les chocolats sur un entremets sur commande", () => {
    const [first] = getProductRecommendations({
      product: find("commande-foret-noire"),
      catalog: CATALOG,
    });
    expect(first?.id).toBe("entremets-douceur");
  });

  it("ne propose jamais le produit consulté lui-même", () => {
    const chocolats = find("supplement-chocolats");
    const recommendations = getProductRecommendations({
      product: chocolats,
      catalog: CATALOG,
    });
    for (const rec of recommendations) {
      expect(rec.products.map((p) => p.slug)).not.toContain(chocolats.slug);
    }
  });

  it("ne suggère rien sans complément au catalogue", () => {
    const withoutExtras = CATALOG.filter((p) => p.category !== "Chocolats");
    expect(
      getProductRecommendations({
        product: withoutExtras.find((p) => p.slug === "bouquet-7-roses")!,
        catalog: withoutExtras,
      }),
    ).toEqual([]);
  });

  it("reste sous le plafond de suggestions", () => {
    const [first] = getProductRecommendations({
      product: find("bouquet-7-roses"),
      catalog: CATALOG,
    });
    expect(first!.products.length).toBeLessThanOrEqual(
      MAX_RECOMMENDED_PRODUCTS,
    );
  });
});

describe("mot manuscrit", () => {
  it("n'est proposé que sur les cartes", () => {
    // Une carte cadeau et un produit de la catégorie « Carte » portent la carte
    // manuscrite ; le reste du catalogue ne doit plus annoncer « Offert ».
    expect(canCarryMessage(product("x", "X", 1000, "Carte"))).toBe(true);
    expect(
      canCarryMessage(
        product("carte-cadeau", "Carte cadeau", 1000, "Carte", {
          isGiftCard: true,
        }),
      ),
    ).toBe(true);
  });

  it("n'est pas proposé sur un entremets, une glace ou le menu du jour", () => {
    expect(canCarryMessage(product("a", "Entremets", 1000, "Entremets"))).toBe(
      false,
    );
    expect(
      canCarryMessage(product("b", "Glace", 3000, "Menu du jour")),
    ).toBe(false);
    expect(canCarryMessage(product("c", "Nounours", 10000, "Nounours"))).toBe(
      false,
    );
    expect(
      canCarryMessage(
        product("d", "Du jour", 3000, "Menu du jour", { isMenuDuJour: true }),
      ),
    ).toBe(false);
  });
});

describe("cohérence upsell du checkout", () => {
  it("propose bien les chocolats au checkout", () => {
    // `step-upsell.tsx` contient toute la logique « duo rose + chocolat »
    // (isChocolateSupplement) : si les chocolats ne sont pas des candidats,
    // cette branche ne se déclenche jamais. C'était le cas avant.
    expect(UPSELL_CATEGORIES).toContain("Chocolats");
  });

  it("ne propose pas de bouquet à qui en a déjà un", () => {
    expect(UPSELL_CATEGORIES).not.toContain("Fleurs");
  });

  it("n'oublie pas les nounours et les cartes", () => {
    expect(UPSELL_CATEGORIES).toContain("Nounours");
    expect(UPSELL_CATEGORIES).toContain("Carte");
  });
});

describe("cohérence back-office", () => {
  it("la catégorie Chocolats est gérable depuis l'admin", () => {
    // Le formulaire produit boucle sur PRODUCT_CATEGORIES : une catégorie
    // absente de cette liste serait impossible à créer ou corriger.
    expect(PRODUCT_CATEGORIES).toContain("Chocolats");
  });

  it("une catégorie à stock illimité le reste", () => {
    // Les fleurs et les chocolats sont montés à la demande : un stock suivi
    // bloquerait des ventes sans raison.
    expect(isUnlimitedStockCategory("Fleurs")).toBe(true);
    expect(isUnlimitedStockCategory("Chocolats")).toBe(true);
    expect(isUnlimitedStockCategory("Entremets")).toBe(false);
  });
});
