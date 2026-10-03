import { getWhatsAppNumber } from "@/lib/phone";

/**
 * Normalise un numéro pour wa.me (chiffres uniquement, sans `+`).
 *
 * Retourne `null` si le numéro n'est pas exploitable. Un simple
 * `replace(/\D/g, "")` produisait des liens morts : un numéro saisi
 * `+229 97 00 00 00` donne `22997000000`, auquel il manque le `01` du plan à
 * dix chiffres — WhatsApp ne sait pas le router. Mieux vaut ne pas afficher de
 * bouton que d'en afficher un qui ne marche pas.
 */
export function phoneToWhatsAppDigits(phone: string): string | null {
  return getWhatsAppNumber(phone);
}

function driverFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function shopOrigin(explicit?: string): string {
  if (explicit?.trim()) return explicit.replace(/\/$/, "");
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const host = hostname.startsWith("admin.")
      ? hostname.slice("admin.".length)
      : hostname;
    const suffix = port ? `:${port}` : "";
    return `${protocol}//${host}${suffix}`;
  }
  return "";
}

export function buildDriverPortalUrl(accessToken: string, origin?: string): string {
  return `${shopOrigin(origin)}/livreur/${accessToken}`;
}

export function buildDriverWelcomeMessage(
  driverName: string,
  portalUrl: string,
): string {
  const first = driverFirstName(driverName);
  return (
    `Bonjour ${first}, voici votre espace de livraison :\n` +
    `${portalUrl}\n\n` +
    `Vous y trouverez uniquement vos livraisons du jour.`
  );
}

/**
 * Lien WhatsApp, ou `null` si le numéro n'est pas normalisable.
 *
 * L'appelant masque alors le bouton : un lien `wa.me` invalide est plus
 * déroutant qu'une absence de bouton.
 */
export function buildWhatsAppShareUrl(
  phone: string,
  message: string,
): string | null {
  const digits = phoneToWhatsAppDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function getMapsSearchUrl(
  address: string,
  landmark?: string | null,
  zoneName?: string | null,
): string {
  const parts = [address, landmark, zoneName].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;
}
