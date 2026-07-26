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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Index précompilés — évite regex/`toLowerCase` en boucle sur les hot paths. */
const LOCALITY_BY_LOWER = new Map<string, string>();
const LOCALITY_BY_ZONE = new Map<string, Map<string, string>>();
const BULK_LABELS = new Set<string>();
const EMBEDDED_PATTERNS: Array<{ area: string; re: RegExp }> = [];

for (const zone of deliveryZones) {
  BULK_LABELS.add(zone.areas.join(", ").toLowerCase());
  const byZone = new Map<string, string>();
  for (const area of zone.areas) {
    const key = area.toLowerCase();
    LOCALITY_BY_LOWER.set(key, area);
    byZone.set(key, area);
    EMBEDDED_PATTERNS.push({
      area,
      re: new RegExp(
        `(^|[\\s,;(/])${escapeRegExp(area)}($|[\\s,;)/])`,
        "i",
      ),
    });
  }
  LOCALITY_BY_ZONE.set(zone.id, byZone);
}

const GENERIC_ZONE_RE = /^(zone|destinations)\s+[a-e]$/i;

/** Valide un quartier contre la grille officielle d’une zone. */
export function resolveLocalityName(
  zoneId: string,
  candidate: string | null | undefined,
): string | null {
  const trimmed = candidate?.trim();
  if (!trimmed || isBulkAreasLabel(trimmed)) return null;
  return LOCALITY_BY_ZONE.get(zoneId)?.get(trimmed.toLowerCase()) ?? null;
}

/** Liste de quartiers collée (erreur d’affichage) — à ignorer. */
export function isBulkAreasLabel(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  const t = name.trim();
  if (t.includes("…") || t.includes("...")) return true;
  if (t.split(",").length >= 3) return true;
  return BULK_LABELS.has(t.toLowerCase());
}

export function isGenericZoneLabel(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  return GENERIC_ZONE_RE.test(name.trim());
}

/** Cherche un quartier connu (toutes zones), y compris dans « … (Quartier) ». */
export function findKnownLocality(
  candidate: string | null | undefined,
): string | null {
  const trimmed = candidate?.trim();
  if (!trimmed || isBulkAreasLabel(trimmed) || isGenericZoneLabel(trimmed)) {
    return null;
  }

  const exact = LOCALITY_BY_LOWER.get(trimmed.toLowerCase());
  if (exact) return exact;

  const paren = trimmed.match(/\(([^)]+)\)/);
  if (paren?.[1]) {
    const inner = LOCALITY_BY_LOWER.get(paren[1].trim().toLowerCase());
    if (inner) return inner;
  }

  for (const { area, re } of EMBEDDED_PATTERNS) {
    if (re.test(trimmed)) return area;
  }

  return null;
}

/**
 * Un seul quartier pour l’affichage / stockage — jamais « Zone E »
 * ni la liste complète des destinations.
 */
export function resolveDeliveryDisplayName(
  zoneId: string | null | undefined,
  zoneName: string | null | undefined,
  localityHint?: string | null,
): string | null {
  if (zoneId) {
    const fromHint = resolveLocalityName(zoneId, localityHint);
    if (fromHint) return fromHint;
    const fromStored = resolveLocalityName(zoneId, zoneName);
    if (fromStored) return fromStored;
  }

  const fromHintAnywhere = findKnownLocality(localityHint);
  if (fromHintAnywhere) return fromHintAnywhere;

  const fromStoredAnywhere = findKnownLocality(zoneName);
  if (fromStoredAnywhere) return fromStoredAnywhere;

  if (
    zoneName &&
    !isGenericZoneLabel(zoneName) &&
    !isBulkAreasLabel(zoneName)
  ) {
    return zoneName.trim();
  }

  return null;
}

/** Ligne adresse livreur / admin : quartier + adresse + repère. */
export function formatDeliveryAddressLine(input: {
  zoneId?: string | null;
  zoneName?: string | null;
  address?: string | null;
  landmark?: string | null;
}): string {
  const landmark = input.landmark?.trim() || "";
  const quartier = resolveDeliveryDisplayName(
    input.zoneId,
    input.zoneName,
    landmark || null,
  );
  const address = input.address?.trim() || "";
  const landmarkIsQuartier = Boolean(
    landmark && LOCALITY_BY_LOWER.has(landmark.toLowerCase()),
  );
  const landmarkUseful =
    Boolean(landmark) &&
    landmark !== quartier &&
    landmark !== address &&
    !isBulkAreasLabel(landmark) &&
    !landmarkIsQuartier;

  const parts: string[] = [];
  if (quartier) parts.push(quartier);
  if (address && address !== quartier) parts.push(address);
  if (landmarkUseful) parts.push(`(${landmark})`);

  return parts.join(" — ") || "—";
}
