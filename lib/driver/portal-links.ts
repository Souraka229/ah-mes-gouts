/** Normalise un numéro pour wa.me (chiffres uniquement, sans +). */
export function phoneToWhatsAppDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

function driverFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function buildDriverPortalUrl(accessToken: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/livreur/${accessToken}`;
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

export function buildWhatsAppShareUrl(phone: string, message: string): string {
  const digits = phoneToWhatsAppDigits(phone);
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

export function getMapsSearchUrl(
  address: string,
  landmark?: string | null,
  zoneName?: string | null,
): string {
  const parts = [address, landmark, zoneName].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;
}
