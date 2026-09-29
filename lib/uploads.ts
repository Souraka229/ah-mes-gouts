/**
 * Limites d'envoi de fichiers — partagées serveur et navigateur.
 *
 * Le plafond de 5 Mo posé ici au départ dépassait la limite de corps de
 * requête de la plateforme d'hébergement (4,5 Mo). Une photo entre les deux
 * était donc acceptée par notre validation puis rejetée par l'hébergeur, avec
 * une page d'erreur HTML en réponse — que `response.json()` ne pouvait pas
 * parser. De là venait « Unexpected end of JSON input » dans le back-office.
 *
 * On garde donc une marge sous la limite de la plateforme, et surtout on
 * refuse AVANT l'envoi côté navigateur : l'admin reçoit une phrase claire au
 * lieu d'attendre pour rien.
 */

/** Limite de corps de requête de l'hébergeur (Vercel) : 4,5 Mo. */
export const PLATFORM_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;

/** Plafond retenu : la marge absorbe l'encapsulation multipart. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Formats acceptés par le stockage. */
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb % 1 === 0 ? mb : mb.toFixed(1)} Mo`;
  }
  return `${Math.round(bytes / 1024)} Ko`;
}

/**
 * Valide un fichier avant envoi.
 *
 * Retourne `null` si tout va bien, sinon le message à afficher tel quel.
 * Volontairement hors de `lib/server` : le navigateur doit pouvoir l'appeler
 * sans embarquer de code serveur.
 */
export function validateUploadFile(file: {
  type: string;
  size: number;
  name?: string;
}): string | null {
  if (
    !ALLOWED_UPLOAD_TYPES.includes(
      file.type as (typeof ALLOWED_UPLOAD_TYPES)[number],
    )
  ) {
    return "Format non pris en charge. Utilisez une image JPEG, PNG, WebP ou GIF.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Image trop lourde (${formatBytes(file.size)}). Maximum ${formatBytes(
      MAX_UPLOAD_BYTES,
    )} — compressez-la ou réduisez ses dimensions.`;
  }
  if (file.size === 0) {
    return "Le fichier choisi est vide.";
  }
  return null;
}
