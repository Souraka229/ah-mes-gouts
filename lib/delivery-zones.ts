import type { DeliveryZone } from "@/types/order";

/**
 * Grille tarifaire officielle — affiches ops `/public/images/ops/livraison/zone-*.webp`
 * Prix en FCFA (entiers). Ordre croissant pour le checkout.
 */
export const deliveryZones: DeliveryZone[] = [
  {
    id: "zone-e",
    code: "E",
    name: "Destinations E",
    price: 500,
    areas: [
      "Fidjrossè centre",
      "Calvaire",
      "Akogbato",
      "Fidjrossè JNP",
      "Sème City",
      "Erevan Aéroport",
      "Direction générale MTN",
    ],
  },
  {
    id: "zone-d",
    code: "D",
    name: "Destinations D",
    price: 700,
    areas: [
      "Agla",
      "Aïbatin",
      "Barrière",
      "Cadjèhoun",
      "Fidjrossè Cabane des Pêcheurs",
      "Gbégamey",
      "Haie Vive",
      "Houeyiho",
      "St Jean",
      "Vodjè",
    ],
  },
  {
    id: "zone-c",
    code: "C",
    name: "Destinations C",
    price: 800,
    areas: [
      "Ganhi",
      "Tokpa",
      "St Michel",
      "Aïdjèdo",
      "Ste Cécile",
      "Vedokô",
      "Toyota",
      "St Rita",
      "Sikèkodji",
      "Menontin",
      "Étoile",
      "Agontikon",
      "Adjègoulè",
      "Missèbo",
      "Coris Banque",
      "Zongo",
      "Jonquet",
      "Jéricho",
      "Hindé",
      "Djidjè",
      "Fifadji",
      "Zogbo",
      "Notre Dame",
      "Maromilitaire",
      "Stade GMK",
      "Fidjrossè Station Ewell",
    ],
  },
  {
    id: "zone-b",
    code: "B",
    name: "Destinations B",
    price: 1000,
    areas: [
      "Segbèya",
      "Lomnava",
      "Sènadé",
      "Sobebra",
      "Habitat",
      "Quartier Jack",
      "Yenawa",
      "Sacré Cœur",
      "Midonbô",
      "Dedokpo",
      "Godomin",
      "Cimetière Pk14",
      "Adogléta",
      "Agbatô",
      "Agbôdjèdo",
      "Ciné Concorde",
      "Place Lénine",
      "Vossa",
      "Togoudo",
      "Itta",
      "Campus Abomey-Calavi",
      "Fidjrossè Club des Rois",
    ],
  },
  {
    id: "zone-a",
    code: "A",
    name: "Destinations A",
    price: 1500,
    areas: [
      "Sourou Léré",
      "Tanti",
      "Yagbé",
      "Avotrou",
      "Yenawa",
      "Finagon",
      "Le Bélier",
      "Kowègbo",
      "Towlègbé",
      "Donatien",
      "Pk3",
      "Minonchou",
      "Cocotomey",
      "Zone des Ambassades",
      "Cococodji",
      "Calavi Bidossessi",
      "Allègleta",
      "Tankpè",
      "Kpota",
      "Arconville",
      "Bakita",
      "Séminaire",
      "Aïchedji",
      "Zopa",
    ],
  },
];

export type DeliveryLocalityOption = {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  area: string;
  price: number;
  /** Valeur unique select : zoneId::area */
  value: string;
};

/** Liste plate des localités (affiche) pour le sélecteur checkout. */
export function getDeliveryLocalityOptions(): DeliveryLocalityOption[] {
  return deliveryZones.flatMap((zone) =>
    zone.areas.map((area) => ({
      zoneId: zone.id,
      zoneCode: zone.code,
      zoneName: zone.name,
      area,
      price: zone.price,
      value: `${zone.id}::${area}`,
    })),
  );
}

export function parseLocalityValue(
  value: string,
): { zoneId: string; area: string } | null {
  const sep = value.indexOf("::");
  if (sep <= 0) return null;
  const zoneId = value.slice(0, sep);
  const area = value.slice(sep + 2).trim();
  if (!zoneId || !area) return null;
  return { zoneId, area };
}

export function getDeliveryZoneById(id: string): DeliveryZone | undefined {
  return deliveryZones.find((zone) => zone.id === id);
}
