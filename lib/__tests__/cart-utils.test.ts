import { describe, expect, it } from "vitest";

import { buildLineFingerprint, mergeCartLine } from "@/lib/cart-utils";
import type { AddToCartPayload } from "@/types/cart";

const nounours = (sizeCm: number, price: number): AddToCartPayload => ({
  productId: "nounours",
  slug: "nounours",
  name: `Nounours — ${sizeCm} cm`,
  imageUrl: "/images/produits/nounours-beige.webp",
  baseUnitPrice: price,
  supplements: [],
  quantity: 1,
  sizeCm,
});

/**
 * La taille fait partie de l'identité d'une ligne. Sans ça, un nounours 25 cm
 * et un 80 cm fusionnaient en une seule ligne : la cliente payait un prix et
 * en recevait un autre.
 */
describe("fusion des lignes de panier", () => {
  it("distingue deux tailles du même produit", () => {
    expect(buildLineFingerprint("nounours", [], 25)).not.toBe(
      buildLineFingerprint("nounours", [], 80),
    );
  });

  it("ne fusionne pas deux tailles différentes", () => {
    const items = mergeCartLine([], nounours(25, 15000));
    const next = mergeCartLine(items, nounours(80, 35000));

    expect(next).toHaveLength(2);
    expect(next.map((item) => item.sizeCm)).toEqual([25, 80]);
  });

  it("fusionne bien deux fois la même taille", () => {
    const items = mergeCartLine([], nounours(80, 35000));
    const next = mergeCartLine(items, nounours(80, 35000));

    expect(next).toHaveLength(1);
    expect(next[0]!.quantity).toBe(2);
  });

  it("conserve la taille sur la ligne créée", () => {
    const items = mergeCartLine([], nounours(80, 35000));
    expect(items[0]!.sizeCm).toBe(80);
  });

  it("traite un produit sans taille normalement", () => {
    const bouquet: AddToCartPayload = {
      productId: "bouquet-7-roses",
      slug: "bouquet-7-roses",
      name: "Bouquet 7 roses",
      imageUrl: "/images/produits/bouquet-roses.webp",
      baseUnitPrice: 25000,
      supplements: [],
      quantity: 1,
    };
    const items = mergeCartLine([], bouquet);
    const next = mergeCartLine(items, bouquet);

    expect(next).toHaveLength(1);
    expect(next[0]!.quantity).toBe(2);
    expect(next[0]!.sizeCm).toBeUndefined();
  });
});
