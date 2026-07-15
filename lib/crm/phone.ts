/**
 * Normalisation téléphone Bénin — pivot CRM.
 * Stockage : chiffres uniquement avec indicatif 229 (ex. 2290197310742).
 * Jamais d'identité basée sur l'IP.
 */

export function normalizeBeninPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let n = digits;
  if (n.startsWith("00229")) n = n.slice(2);
  if (n.startsWith("229")) {
    // ok
  } else if (n.startsWith("01") && n.length >= 10) {
    n = `229${n}`;
  } else if (n.length === 8) {
    n = `22901${n}`;
  } else if (n.length === 10 && n.startsWith("0")) {
    n = `229${n}`;
  } else {
    return null;
  }

  // 229 + 10 chiffres locaux typiques (01 XX XX XX XX)
  if (n.length < 11 || n.length > 13) return null;
  return n;
}

export function formatPhoneDisplay(normalized: string): string {
  if (!normalized.startsWith("229") || normalized.length < 11) return normalized;
  const local = normalized.slice(3);
  const parts = local.match(/.{1,2}/g) ?? [local];
  return `+229 ${parts.join(" ")}`;
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizeBeninPhone(a);
  const nb = normalizeBeninPhone(b);
  return Boolean(na && nb && na === nb);
}
