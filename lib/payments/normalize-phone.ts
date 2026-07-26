/**
 * Normalise un numéro béninois pour FeexPay : 229 + 10 chiffres (ex. 2290166000000).
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
  return null;
}
