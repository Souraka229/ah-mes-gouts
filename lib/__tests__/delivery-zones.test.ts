import { describe, expect, it } from "vitest";

import { formatPrice } from "@/lib/format";
import {
  deliveryZones,
  findKnownLocality,
  getAreaPrice,
  getDeliveryLocalityOptions,
  getZonePriceLabel,
  isGenericZoneLabel,
  parseLocalityValue,
  resolveLocalityName,
} from "@/lib/delivery-zones";

/**
 * La grille de livraison est de l'argent : chaque lieu a **son** tarif, et le
 * serveur facture depuis elle (`resolveDeliveryAreaPrice`). Ces tests tiennent
 * les propriétés qu'une relecture manuelle de 113 lignes laisse filer.
 */
describe("grille de livraison", () => {
  const allAreas = deliveryZones.flatMap((zone) =>
    zone.areas.map((area) => ({ ...area, zoneId: zone.id, zoneName: zone.name })),
  );

  it("donne un tarif strictement positif à chaque lieu", () => {
    for (const area of allAreas) {
      expect(area.price, `${area.name} (${area.zoneName})`).toBeGreaterThan(0);
      expect(Number.isInteger(area.price)).toBe(true);
    }
  });

  it("n'inscrit jamais deux fois le même quartier", () => {
    // Deux entrées « Yenawa » à des prix différents laisseraient la cliente
    // choisir son tarif : le sélecteur afficherait deux fois le même nom.
    const seen = new Map<string, string>();
    for (const area of allAreas) {
      const key = area.name.toLowerCase();
      const previous = seen.get(key);
      expect(
        previous,
        `« ${area.name} » apparaît en ${previous} et en ${area.zoneName}`,
      ).toBeUndefined();
      seen.set(key, area.zoneName);
    }
  });

  it("donne au moins un lieu à chaque zone", () => {
    for (const zone of deliveryZones) {
      expect(zone.areas.length, zone.name).toBeGreaterThan(0);
    }
  });

  it("facture le tarif du lieu, pas celui du palier", () => {
    // Les quatre mouvements demandés par la boutique.
    expect(getAreaPrice("zone-d", "Direction Générale MTN")).toBe(700);
    expect(getAreaPrice("zone-c", "Vodjè")).toBe(800);
    expect(getAreaPrice("zone-b", "Ganhi")).toBe(1000);
    expect(getAreaPrice("zone-hors-cotonou", "Ouidah")).toBe(4000);
    expect(getAreaPrice("zone-hors-cotonou", "Séminaire")).toBe(2000);
  });

  it("ignore la casse et les espaces autour du nom", () => {
    expect(getAreaPrice("zone-c", "  vodjè  ")).toBe(800);
    expect(getAreaPrice("zone-c", "VODJÈ")).toBe(800);
  });

  it("ne rend rien pour un couple zone/lieu qui n'existe pas", () => {
    expect(getAreaPrice("zone-c", "Ouidah")).toBeUndefined();
    expect(getAreaPrice("zone-inexistante", "Vodjè")).toBeUndefined();
  });

  it("résume une zone d'un seul tarif, et une zone variable par sa plage", () => {
    expect(getZonePriceLabel("zone-c")).toBe("800 F");
    // Espace insécable fine : c'est `formatPrice` qui décide, pas le test.
    expect(getZonePriceLabel("zone-a")).toBe(formatPrice(1500));
    // « Hors Cotonou » va de 2 000 à 4 000 F : un seul montant mentirait.
    expect(getZonePriceLabel("zone-hors-cotonou")).toBe(
      `de ${formatPrice(2000)} à ${formatPrice(4000)}`,
    );
  });

  it("expose chaque lieu du sélecteur avec son tarif", () => {
    const options = getDeliveryLocalityOptions();
    expect(options).toHaveLength(allAreas.length);

    const vodje = options.find((o) => o.area === "Vodjè");
    expect(vodje).toMatchObject({ price: 800, zoneId: "zone-c" });
    expect(parseLocalityValue(vodje!.value)).toEqual({
      zoneId: "zone-c",
      area: "Vodjè",
    });
  });

  it("ne prend pas un nom de palier pour un quartier", () => {
    expect(isGenericZoneLabel("Destinations C")).toBe(true);
    expect(isGenericZoneLabel("Hors Cotonou")).toBe(true);
    expect(isGenericZoneLabel("Vodjè")).toBe(false);
    expect(findKnownLocality("Hors Cotonou")).toBeNull();
  });

  it("valide un quartier dans sa zone, et le refuse ailleurs", () => {
    expect(resolveLocalityName("zone-c", "Vodjè")).toBe("Vodjè");
    expect(resolveLocalityName("zone-c", "Ouidah")).toBeNull();
    expect(resolveLocalityName("zone-hors-cotonou", "Ouidah")).toBe("Ouidah");
  });

  it("ajoute Aupiais et Place du Souvenir au palier 800", () => {
    expect(getAreaPrice("zone-c", "Aupiais")).toBe(800);
    expect(getAreaPrice("zone-c", "Place du Souvenir")).toBe(800);
  });

  it("scinde Coris Banque et Ciné Concorde en deux lieux distincts", () => {
    expect(getAreaPrice("zone-c", "Coris Banque Maromilitaire")).toBe(800);
    expect(getAreaPrice("zone-b", "Coris Banque Steimetz")).toBe(1000);
    expect(getAreaPrice("zone-b", "Ciné Concorde Akpakpa")).toBe(1000);
    expect(getAreaPrice("zone-b", "Ciné Concorde Cocotomey")).toBe(1000);
  });
});
