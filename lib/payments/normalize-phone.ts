/**
 * Normalise un numéro béninois pour FeexPay : 229 + 10 chiffres (ex. 2290166000000).
 *
 * Le Bénin est passé aux numéros locaux à 10 chiffres (préfixe 01) en 2021,
 * mais beaucoup de numéros (dont le nôtre, ORDER_PHONE) restent affichés à
 * l'ancien format 8 chiffres avec l'indicatif — ex. +229 97 31 07 42. Sans le
 * cas ci-dessous, un client qui tape ce format se voit refuser le paiement
 * avec "numéro invalide" alors que le numéro est parfaitement valide.
 */
export function normalizeBeninPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("229")) {
    return digits;
  }
  if (digits.length === 10 && digits.startsWith("01")) {
    return `229${digits}`;
  }
  if (digits.length === 8) {
    return `22901${digits}`;
  }
  // 229 + ancien numéro local à 8 chiffres (sans le préfixe 01) = 11 chiffres.
  if (digits.length === 11 && digits.startsWith("229")) {
    return `22901${digits.slice(3)}`;
  }
  return null;
}
