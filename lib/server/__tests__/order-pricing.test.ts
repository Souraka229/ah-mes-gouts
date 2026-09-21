import { describe, expect, it, vi } from "vitest";

import { priceOrderItems } from "@/lib/server/order-pricing";

/**
 * Sans base : `getPrisma()` lève immédiatement et le catalogue retombe sur son
 * jeu de repli. Sans ça, chaque appel attend ~5 s l'échec d'une connexion
 * Supabase et le test expire — ce qui n'a rien à voir avec ce qu'on vérifie.
 */
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;

/**
 * Les variantes vivent désormais **en base**, pas dans une constante du code.
 * On remplace donc le dépôt par des fixtures : le test porte sur la logique de
 * facturation, pas sur Postgres.
 *
 * Grille officielle 20 cm → 150 cm. Deux produits :
 *   - « 12 » = Nounours beige, produit **à paliers** (le cas historique) ;
 *   - « 13 » = Bouquet de roses, produit **non nounours** à variantes : c'est
 *     la preuve que la résolution est générique et pas une branche nounours.
 */
const { VARIANTS_BY_PRODUCT } = vi.hoisted(() => {
  const grid: [number, number][] = [
    [20, 10_000],
    [25, 15_000],
    [30, 25_000],
    [80, 35_000],
    [90, 40_000],
    [100, 45_000],
    [120, 50_000],
    [130, 70_000],
    [140, 90_000],
    [150, 100_000],
  ];

  const nounours = grid.map(([cm, price], index) => ({
    id: `v-${cm}`,
    productId: "12",
    code: String(cm),
    label: `${cm} cm`,
    price,
    sortOrder: index,
    isActive: true,
    stockRemaining: null as number | null,
  }));

  // Variante désactivée : elle ne doit jamais pouvoir être facturée.
  nounours.push({
    id: "v-115",
    productId: "12",
    code: "115",
    label: "115 cm",
    price: 48_000,
    sortOrder: 11,
    isActive: false,
    stockRemaining: null,
  });

  const bouquet = [
    {
      id: "bv-petit",
      productId: "13",
      code: "petit",
      label: "Petit",
      price: 8_000,
      sortOrder: 0,
      isActive: true,
      stockRemaining: null as number | null,
    },
    {
      id: "bv-grand",
      productId: "13",
      code: "grand",
      label: "Grand",
      price: 15_000,
      sortOrder: 1,
      isActive: true,
      stockRemaining: null as number | null,
    },
    {
      // Variante à stock propre.
      id: "bv-prestige",
      productId: "13",
      code: "prestige",
      label: "Prestige",
      price: 25_000,
      sortOrder: 2,
      isActive: true,
      stockRemaining: 2,
    },
  ];

  return { VARIANTS_BY_PRODUCT: new Map<string, typeof nounours>([["12", nounours], ["13", bouquet]]) };
});

vi.mock("@/lib/server/variant-repository", () => ({
  // Émule le filtre `isActive` fait en base.
  getActiveVariantsByProductIds: async () => {
    const active = new Map<string, unknown[]>();
    for (const [productId, variants] of VARIANTS_BY_PRODUCT) {
      active.set(
        productId,
        variants.filter((variant) => variant.isActive),
      );
    }
    return active;
  },
  // Toutes les variantes, actives ou non — ce que lit le back-office pour
  // afficher la gamme de prix d'un produit.
  getVariantsByProductIds: async () => {
    const all = new Map<string, unknown[]>();
    for (const [productId, variants] of VARIANTS_BY_PRODUCT) {
      all.set(productId, variants);
    }
    return all;
  },
  findVariantByCode: (variants: { code: string }[], code: string) =>
    variants.find((variant) => variant.code === code),
}));

/** Ligne de panier telle que le client l'envoie : un code, jamais un montant. */
const item = (
  slug: string,
  opts: { sizeCm?: number; variantCode?: string; quantity?: number } = {},
) => ({
  slug,
  name: slug,
  quantity: opts.quantity ?? 1,
  supplements: [] as string[],
  ...(opts.sizeCm === undefined ? {} : { sizeCm: opts.sizeCm }),
  ...(opts.variantCode === undefined ? {} : { variantCode: opts.variantCode }),
});

describe("facturation serveur — variantes de produit", () => {
  it("facture chaque palier officiel au bon tarif", async () => {
    const expected: [number, number][] = [
      [20, 10_000],
      [25, 15_000],
      [30, 25_000],
      [80, 35_000],
      [90, 40_000],
      [100, 45_000],
      [120, 50_000],
      [130, 70_000],
      [140, 90_000],
      [150, 100_000],
    ];

    for (const [cm, price] of expected) {
      const result = await priceOrderItems([item("nounours-beige", { sizeCm: cm })]);
      expect(result.ok, `${cm} cm`).toBe(true);
      if (!result.ok) continue;
      expect(result.data.items[0]!.unitPrice, `${cm} cm`).toBe(price);
    }
  });

  it("accepte le code de variante explicite, pas seulement la taille héritée", async () => {
    const result = await priceOrderItems([
      item("nounours-beige", { variantCode: "150" }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0]!.unitPrice).toBe(100_000);
  });

  it("fige la variante dans la ligne de commande (snapshot)", async () => {
    const result = await priceOrderItems([
      item("nounours-beige", { sizeCm: 120 }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0]!.name).toBe("Nounours beige — 120 cm");
    expect(result.data.items[0]!.variantId).toBe("v-120");
    expect(result.data.items[0]!.variantLabel).toBe("120 cm");
  });

  it("refuse une commande sans variante choisie", async () => {
    const result = await priceOrderItems([item("nounours-beige")]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]!.message).toContain("Choisissez une option");
  });

  it("refuse un code de variante inexistant", async () => {
    const result = await priceOrderItems([
      item("nounours-beige", { variantCode: "45" }),
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]!.message).toContain("Option indisponible");
  });

  it("refuse une variante désactivée", async () => {
    const result = await priceOrderItems([
      item("nounours-beige", { variantCode: "115" }),
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]!.message).toContain("Option indisponible");
  });

  it("facture les variantes d'un produit qui n'est pas un nounours", async () => {
    const result = await priceOrderItems([
      item("bouquet-roses", { variantCode: "grand" }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0]!.unitPrice).toBe(15_000);
    expect(result.data.items[0]!.variantLabel).toBe("Grand");
  });

  it("ignore tout montant envoyé par le client", async () => {
    // Le type ne porte aucun prix : on force la charge utile d'un client
    // malveillant pour vérifier qu'elle n'a aucun effet.
    const hostile = {
      ...item("nounours-beige", { variantCode: "140" }),
      unitPrice: 1,
      baseUnitPrice: 1,
      price: 1,
      variantPrice: 1,
      total: 1,
    } as unknown as Parameters<typeof priceOrderItems>[0][number];

    const result = await priceOrderItems([hostile]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0]!.unitPrice).toBe(90_000);
  });

  it("multiplie correctement par la quantité", async () => {
    const result = await priceOrderItems([
      item("nounours-beige", { sizeCm: 80, quantity: 2 }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.subtotal).toBe(70_000);
  });

  it("respecte le stock propre à une variante", async () => {
    const tooMany = await priceOrderItems([
      item("bouquet-roses", { variantCode: "prestige", quantity: 3 }),
    ]);
    expect(tooMany.ok).toBe(false);

    const fits = await priceOrderItems([
      item("bouquet-roses", { variantCode: "prestige", quantity: 2 }),
    ]);
    expect(fits.ok).toBe(true);
    if (!fits.ok) return;
    expect(fits.data.subtotal).toBe(50_000);
    expect(fits.data.stockClaims[0]!.variantStockTracked).toBe(true);
  });

  it("n'impose aucune variante à un produit qui n'en a pas", async () => {
    const result = await priceOrderItems([item("mango-passion")]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0]!.variantId).toBeUndefined();
  });

  /**
   * Filet de sécurité transitoire : tant que les variantes nounours ne sont pas
   * semées en base, la grille officielle du code prend le relais. Il ne doit
   * JAMAIS facturer moins cher qu'un palier réel.
   */
  describe("repli transitoire sans variantes en base", () => {
    const withoutVariants = async <T,>(run: () => Promise<T>): Promise<T> => {
      const saved = VARIANTS_BY_PRODUCT.get("12");
      VARIANTS_BY_PRODUCT.delete("12");
      try {
        return await run();
      } finally {
        if (saved) VARIANTS_BY_PRODUCT.set("12", saved);
      }
    };

    it("facture le palier officiel, jamais le prix d'entrée", async () => {
      const result = await withoutVariants(() =>
        priceOrderItems([item("nounours-beige", { sizeCm: 150 })]),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items[0]!.unitPrice).toBe(100_000);
      expect(result.data.items[0]!.variantId).toBeUndefined();
    });

    it("refuse une fiche nounours sans taille choisie", async () => {
      const result = await withoutVariants(() =>
        priceOrderItems([item("nounours-beige")]),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.issues[0]!.message).toContain("Choisissez une taille");
    });

    it("refuse une taille hors grille", async () => {
      const result = await withoutVariants(() =>
        priceOrderItems([item("nounours-beige", { sizeCm: 45 })]),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.issues[0]!.message).toContain("Taille indisponible");
    });
  });

  it("refuse un panier vide", async () => {
    const result = await priceOrderItems([]);
    expect(result.ok).toBe(false);
  });
});
