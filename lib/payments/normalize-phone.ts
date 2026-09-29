/**
 * Numéro destiné à l'agrégateur de paiement (FeexPay).
 *
 * FeexPay attend la forme internationale **en chiffres nus**, sans `+` :
 * `2290166000000`. La charge utile envoyée contient d'ailleurs
 * `phoneNumber: Number(phoneNumber)` — un `+` en tête y produirait `NaN`.
 *
 * La logique de reconnaissance est dans `lib/phone.ts` (source unique) ; ce
 * module n'est qu'un adaptateur qui retire le `+`.
 */

import { normalizePhone } from "@/lib/phone";

/**
 * Forme `229` + 10 chiffres (ex. `2290166000000`), ou `null` si invalide.
 *
 * Le Bénin est passé aux numéros à 10 chiffres (préfixe `01`), mais beaucoup
 * de numéros circulent encore à l'ancien format à 8 chiffres. Les deux sont
 * acceptés et ramenés à la même forme : sans cela, une cliente saisissant
 * l'ancien format se voyait refuser le paiement alors que son numéro est
 * parfaitement valide.
 */
export function normalizeBeninPhone(raw: string): string | null {
  const result = normalizePhone(raw);
  return result.valid ? result.e164.slice(1) : null;
}
