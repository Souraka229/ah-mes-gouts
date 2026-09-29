/**
 * Pivot téléphone du CRM.
 *
 * Cette fonction vivait ici avec ses propres règles, en parallèle de
 * `lib/payments/normalize-phone.ts` qui en avait d'autres : un même numéro
 * pouvait donc être stocké sous deux formes selon le chemin de code, et une
 * même cliente exister deux fois.
 *
 * La logique est désormais dans `lib/phone.ts` — source de vérité unique.
 * Ce fichier ne garde que les noms historiquement importés par le CRM.
 *
 * Stockage : `+2290197310742` (E.164). Jamais d'identité basée sur l'IP.
 */

import {
  canonicalPhone,
  formatPhoneDisplay as formatCanonical,
  phoneLookupVariants,
  phonesMatch as matchCanonical,
} from "@/lib/phone";

/** Forme canonique stockée en base, ou `null` si le numéro est invalide. */
export function normalizeBeninPhone(raw: string): string | null {
  return canonicalPhone(raw);
}

/** Forme lisible : `+229 01 97 31 07 42`. */
export function formatPhoneDisplay(normalized: string): string {
  return formatCanonical(normalized);
}

/** Deux saisies désignent-elles le même abonné ? */
export function phonesMatch(a: string, b: string): boolean {
  return matchCanonical(a, b);
}

/**
 * Écritures acceptables d'un numéro dans un `where` Prisma.
 *
 * La base a connu les deux formes (`229…` puis `+229…`) : le temps que la
 * migration finisse, une recherche doit retrouver les deux.
 */
export function phoneSearchVariants(raw: string): string[] {
  return phoneLookupVariants(raw);
}
