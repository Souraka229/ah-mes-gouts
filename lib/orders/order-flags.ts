/**
 * Marqueurs structurés encodés dans `clientMessage` — évite une migration DB.
 *
 * On stocke le choix d'emballage et le signalement « client injoignable »
 * sous forme de balises en fin de message, puis on les relit côté back office
 * et côté livreur. Le message libre saisi par la cliente reste intact.
 *
 * Format : "<message libre>\n[[amg:packaging=together]]\n[[amg:unreachable=2026-07-20T15:04:00.000Z]]"
 */

export type PackagingChoice = "together" | "separate";

export type OrderFlags = {
  /** Message libre saisi par la cliente (sans les balises). */
  note: string;
  /** Emballer tout ensemble ou chaque article séparément. */
  packaging: PackagingChoice | null;
  /** Horodatage ISO du signalement « injoignable » par le livreur, si présent. */
  unreachableAt: string | null;
};

const PACKAGING_RE = /\[\[amg:packaging=(together|separate)\]\]/;
const UNREACHABLE_RE = /\[\[amg:unreachable=([^\]]+)\]\]/;

export const PACKAGING_LABELS: Record<PackagingChoice, string> = {
  together: "Tout emballer ensemble",
  separate: "Emballer séparément",
};

/** Extrait le message libre + les marqueurs d'une chaîne `clientMessage`. */
export function parseOrderFlags(raw: string | null | undefined): OrderFlags {
  const source = raw ?? "";
  const packagingMatch = source.match(PACKAGING_RE);
  const unreachableMatch = source.match(UNREACHABLE_RE);

  const note = source
    .replace(PACKAGING_RE, "")
    .replace(UNREACHABLE_RE, "")
    .trim();

  return {
    note,
    packaging: (packagingMatch?.[1] as PackagingChoice | undefined) ?? null,
    unreachableAt: unreachableMatch?.[1] ?? null,
  };
}

/** Ré-encode message libre + marqueurs en une seule chaîne `clientMessage`. */
export function encodeOrderFlags(flags: {
  note?: string | null;
  packaging?: PackagingChoice | null;
  unreachableAt?: string | null;
}): string {
  const parts: string[] = [];
  const note = flags.note?.trim();
  if (note) parts.push(note);
  if (flags.packaging) parts.push(`[[amg:packaging=${flags.packaging}]]`);
  if (flags.unreachableAt) {
    parts.push(`[[amg:unreachable=${flags.unreachableAt}]]`);
  }
  return parts.join("\n");
}

/** Ajoute/rafraîchit le marqueur « injoignable » sur un message existant. */
export function markUnreachable(
  raw: string | null | undefined,
  at = new Date().toISOString(),
): string {
  const flags = parseOrderFlags(raw);
  return encodeOrderFlags({ ...flags, unreachableAt: at });
}
