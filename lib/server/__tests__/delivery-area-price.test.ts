import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le chemin qui facture la livraison.
 *
 * `resolveDeliveryAreaPrice` est la seule source du montant de livraison côté
 * serveur. Sa règle : la **base** fait foi (l'admin y corrige un tarif sans
 * redéploiement), la **grille du code** amorce, et l'absence des deux se traduit
 * par `undefined` — que l'appelant refuse, plutôt que de facturer un tarif
 * inventé.
 */

const findFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ deliveryArea: { findFirst } }),
}));

const { resolveDeliveryAreaPrice } = await import(
  "@/lib/server/delivery-area-repository"
);

describe("tarif de livraison d'un lieu", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("facture le tarif de la base quand le lieu y est", async () => {
    findFirst.mockResolvedValue({ price: 3500 });

    await expect(resolveDeliveryAreaPrice("zone-c", "Vodjè")).resolves.toBe(3500);
  });

  it("retombe sur la grille du code si la base ne connaît pas le lieu", async () => {
    findFirst.mockResolvedValue(null);

    // Grille officielle : Vodjè est à 800 F en Destinations C.
    await expect(resolveDeliveryAreaPrice("zone-c", "Vodjè")).resolves.toBe(800);
  });

  it("retombe sur la grille du code si la base est injoignable", async () => {
    findFirst.mockRejectedValue(new Error("base injoignable"));

    // Une panne de base ne doit pas faire échouer une vente : on facture le
    // tarif officiel du code.
    await expect(
      resolveDeliveryAreaPrice("zone-hors-cotonou", "Ouidah"),
    ).resolves.toBe(4000);
  });

  it("ne rend rien pour un lieu inconnu des deux", async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      resolveDeliveryAreaPrice("zone-c", "Quartier Inventé"),
    ).resolves.toBeUndefined();
  });

  it("ne rend rien sans quartier précisé", async () => {
    await expect(resolveDeliveryAreaPrice("zone-c", null)).resolves.toBeUndefined();
    await expect(resolveDeliveryAreaPrice("zone-c", "   ")).resolves.toBeUndefined();
    // Aucune requête inutile dans ce cas.
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("ignore la casse et les espaces du quartier envoyé", async () => {
    findFirst.mockResolvedValue(null);

    await expect(resolveDeliveryAreaPrice("zone-c", "  vodjè ")).resolves.toBe(800);
  });
});
