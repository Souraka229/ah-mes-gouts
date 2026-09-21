import type { DeliveryAreaOption, DeliveryZone } from "@/types/order";

/**
 * Ce fichier n'a **aucune dépendance d'exécution**, et ça compte :
 * `scripts/sync-delivery-areas.mjs` l'importe directement pour semer la base en
 * lisant la grille officielle, sans en recopier les tarifs. Node ne sait pas
 * résoudre l'alias `@/`, donc le moindre import de valeur ici casserait le
 * script. D'où ce formatage local plutôt que `formatPrice` de `lib/format` —
 * le test vérifie que les deux rendent exactement la même chaîne.
 */
function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} F`;
}

/**
 * Grille tarifaire officielle de livraison.
 *
 * **Le prix est porté par le LIEU, pas par la zone.** Une zone n'est qu'un
 * palier, rangé par prix (« Destinations A » … « Destinations E »), plus un
 * fourre-tout « Hors Cotonou » dont les lieux vont de 2 000 à 4 000 F. C'est la
 * seule façon de dire la grille réelle : plusieurs zones mélangent les tarifs,
 * et un quartier qui change de prix ne doit pas obliger à en déplacer d'autres.
 *
 * Ce fichier est la **source d'amorçage**. Une fois la grille en base
 * (`DeliveryArea`, via `scripts/sync-delivery-areas.mjs`), c'est la base qui
 * fait foi pour la facturation — comme les variantes produit. Le serveur ne
 * facture jamais un montant envoyé par le client.
 */

/** Un palier : tous ses lieux partagent le même tarif. */
function tier(id: string, code: string, name: string, price: number, names: string[]): DeliveryZone {
  return {
    id,
    code,
    name,
    areas: names.map((area) => ({ name: area, price })),
  };
}

export const deliveryZones: DeliveryZone[] = [
  tier("zone-e", "E", "Destinations E", 500, [
    "Fidjrossè centre",
    "Calvaire",
    "Akogbato",
    "Fidjrossè JNP",
    "Sème City",
    "Erevan Aéroport",
  ]),

  tier("zone-d", "D", "Destinations D", 700, [
    "Agla",
    "Cadjèhoun",
    "Fidjrossè Cabane des Pêcheurs",
    "Haie Vive",
    "Direction Générale MTN",
  ]),

  tier("zone-c", "C", "Destinations C", 800, [
    "St Michel",
    "Aïdjèdo",
    "Ste Cécile",
    "Vedokô",
    "Toyota",
    "Sikèkodji",
    "Étoile",
    "Agontikon",
    "Zongo",
    "Jéricho",
    "Hindé",
    "Djidjè",
    "Maromilitaire",
    "Stade GMK",
    "Coris Banque Maromilitaire",
    "Aïbatin",
    "Barrière",
    "Gbégamey",
    "Houeyiho",
    "St Jean",
    "Vodjè",
    "Aupiais",
    "Place du Souvenir",
  ]),

  tier("zone-b", "B", "Destinations B", 1000, [
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
    "Place Lénine",
    "Vossa",
    "Togoudo",
    "Itta",
    "Campus Abomey-Calavi",
    "Fidjrossè Club des Rois",
    "Ganhi",
    "Tokpa",
    "St Rita",
    "Menontin",
    "Adjègoulè",
    "Missèbo",
    "Jonquet",
    "Fifadji",
    "Zogbo",
    "Notre Dame",
    "Fidjrossè Station Ewell",
    "Coris Banque Steimetz",
    "Sourou Léré",
    "Tanti",
    "Yagbé",
    "Avotrou",
    "Kowègbo",
    "Donatien",
    "Pk3",
    "Minonchou",
    "Cocotomey",
    "Zone des Ambassades",
    "Calavi Bidossessi",
    "Tankpè",
    "Ciné Concorde Akpakpa",
    "Ciné Concorde Cocotomey",
  ]),

  tier("zone-a", "A", "Destinations A", 1500, [
    "Finagon",
    "Le Bélier",
    "Towlègbé",
    "Cococodji",
    "Allègleta",
    "Kpota",
    "Arconville",
    "Bakita",
    "Aïchedji",
    "Zoca",
  ]),

  {
    id: "zone-hors-cotonou",
    code: "HC",
    name: "Hors Cotonou",
    // Chaque lieu porte son tarif : c'est ici que le prix par lieu est
    // indispensable, la périphérie allant de 2 000 à 4 000 F.
    areas: [
      { name: "Séminaire", price: 2000 },
      { name: "Zopa", price: 2000 },
      { name: "Agassa Godomey", price: 2000 },
      { name: "Kansounkpa", price: 2000 },
      { name: "Erevan Calavi", price: 2000 },
      { name: "Akassato", price: 2000 },
      { name: "Ouèdo", price: 2000 },
      { name: "Hevié", price: 2000 },
      { name: "PK10", price: 2000 },
      { name: "PK18", price: 2000 },
      { name: "Pavé Kérékou nouveau marché", price: 2000 },
      { name: "Zoudja", price: 2000 },
      { name: "Ouéga", price: 2000 },
      { name: "Tori", price: 2500 },
      { name: "Sèmè-Podji", price: 2500 },
      { name: "Djèffa", price: 2500 },
      { name: "Adjagbo", price: 2500 },
      { name: "Hevié chez Arès", price: 2500 },
      { name: "Kpovié", price: 2500 },
      { name: "Porto-Novo", price: 3000 },
      { name: "Ouidah", price: 4000 },
      { name: "Allada", price: 4000 },
    ],
  },
];

export type DeliveryLocalityOption = DeliveryAreaOption & {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  area: string;
  /** Valeur unique select : zoneId::area */
  value: string;
};

/** Liste plate des localités (affiche) pour le sélecteur checkout. */
export function getDeliveryLocalityOptions(): DeliveryLocalityOption[] {
  return deliveryZones.flatMap((zone) =>
    zone.areas.map((entry) => ({
      ...entry,
      zoneId: zone.id,
      zoneCode: zone.code,
      zoneName: zone.name,
      area: entry.name,
      value: `${zone.id}::${entry.name}`,
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

/** Tarif d'un lieu — `undefined` si le couple zone/lieu n'existe pas. */
export function getAreaPrice(
  zoneId: string,
  area: string,
): number | undefined {
  return getDeliveryZoneById(zoneId)?.areas.find(
    (entry) => entry.name.toLowerCase() === area.trim().toLowerCase(),
  )?.price;
}

/**
 * Libellé tarifaire d'une zone — « 800 F », ou « de 2 000 à 4 000 F » quand
 * ses lieux ne partagent pas le même prix (cas de « Hors Cotonou »).
 */
export function getZonePriceLabel(zoneId: string): string {
  const zone = getDeliveryZoneById(zoneId);
  if (!zone || zone.areas.length === 0) return "";

  const prices = [...new Set(zone.areas.map((a) => a.price))].sort((a, b) => a - b);
  const min = prices[0]!;
  const max = prices[prices.length - 1]!;

  if (min === max) return formatFcfa(min);
  return `de ${formatFcfa(min)} à ${formatFcfa(max)}`;
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
  BULK_LABELS.add(zone.areas.map((a) => a.name).join(", ").toLowerCase());
  const byZone = new Map<string, string>();
  for (const { name: area } of zone.areas) {
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

/** « Destinations C », « Hors Cotonou » : des paliers, pas des quartiers. */
const GENERIC_ZONE_RE = /^(zone|destinations)\s+[a-e]$|^hors cotonou$/i;

/** Valide un quartier contre la grille officielle d'une zone. */
export function resolveLocalityName(
  zoneId: string,
  candidate: string | null | undefined,
): string | null {
  const trimmed = candidate?.trim();
  if (!trimmed || isBulkAreasLabel(trimmed)) return null;
  return LOCALITY_BY_ZONE.get(zoneId)?.get(trimmed.toLowerCase()) ?? null;
}

/** Liste de quartiers collée (erreur d'affichage) — à ignorer. */
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
 * Un seul quartier pour l'affichage / stockage — jamais « Zone E »
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
