import { describe, expect, it } from "vitest";

import { priceOrderItems } from "@/lib/server/order-pricing";

/**
 * Sans base : `getPrisma()` lève immédiatement et le catalogue retombe sur son
 * jeu de repli. Sans ça, chaque appel attend ~5 s l'échec d'une connexion
 * Supabase et le test expire — ce qui n'a rien à voir avec ce qu'on vérifie.
 */
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;

/**
 * Le serveur est la source de vérité du prix.
 *
 * `RawOrderItem` ne porte AUCUN montant : le client ne peut pas proposer un
 * prix, seulement un slug, une quantité, des suppléments et — pour les
 * produits à paliers — une taille. Ces tests vérifient que la taille choisie
 * est bien celle qui est facturée.
 *
 * Ils s'exécutent sur le catalogue de repli (sans Postgres) : `nounours-beige`
 * en fait partie, et `isNounoursProduct` le reconnaît. La résolution du palier
 * ne dépend pas de la base, seulement de `NOUNOURS_SIZES`.
 */
describe("facturation serveur — nounours par taille", () => {
  const nounoursItem = (sizeCm?: number) => ({
    slug: "nounours-beige",
    name: sizeCm ? `Nounours — ${sizeCm} cm` : "Nounours beige",
    quantity: 1,
    supplements: [],
    ...(sizeCm === undefined ? {} : { sizeCm }),
  });

  it("facture 100 cm à 45 000 F, pas le prix d'entrée", async () => {
    const result = await priceOrderItems([nounoursItem(100)]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0]!.unitPrice).toBe(45_000);
    expect(result.data.subtotal).toBe(45_000);
  });

  it("facture chaque palier officiel au bon tarif", async () => {
    const expected: [number, number][] = [
      [25, 15_000],
      [30, 25_000],
      [80, 35_000],
      [90, 40_000],
      [100, 45_000],
      [120, 50_000],
      [130, 70_000],
      [140, 90_000],
    ];

    for (const [cm, price] of expected) {
      const result = await priceOrderItems([nounoursItem(cm)]);
      expect(result.ok, `${cm} cm`).toBe(true);
      if (!result.ok) continue;
      expect(result.data.items[0]!.unitPrice, `${cm} cm`).toBe(price);
    }
  });

  it("nomme la ligne avec la taille, pour la préparation", async () => {
    const result = await priceOrderItems([nounoursItem(120)]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0]!.name).toBe("Nounours beige — 120 cm");
  });

  it("retombe sur le premier palier quand aucune taille n'est envoyée", async () => {
    const result = await priceOrderItems([nounoursItem()]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Le plus petit palier : jamais moins cher qu'un vrai tarif, donc l'absence
    // de taille ne peut pas servir à sous-payer.
    expect(result.data.items[0]!.unitPrice).toBe(15_000);
  });

  it("refuse une taille qui n'existe pas", async () => {
    const result = await priceOrderItems([nounoursItem(20)]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]!.message).toContain("Taille indisponible");
  });

  it("multiplie correctement par la quantité", async () => {
    const result = await priceOrderItems([
      { ...nounoursItem(80), quantity: 2 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.subtotal).toBe(70_000);
  });

  it("ignore tout montant envoyé par le client", async () => {
    // Le type ne porte pas de prix : on force la charge utile d'un client
    // malveillant pour vérifier qu'elle n'a aucun effet.
    const hostile = {
      ...nounoursItem(140),
      unitPrice: 1,
      baseUnitPrice: 1,
      price: 1,
    } as unknown as Parameters<typeof priceOrderItems>[0][number];

    const result = await priceOrderItems([hostile]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0]!.unitPrice).toBe(90_000);
  });

  it("refuse un panier vide", async () => {
    const result = await priceOrderItems([]);
    expect(result.ok).toBe(false);
  });
});
