import { randomBytes } from "crypto";

/**
 * Crockford base32 — ni I, ni L, ni O, ni U : une cliente doit pouvoir dicter
 * son numéro de commande au téléphone sans ambiguïté.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomId(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/**
 * Identifiant de commande — GE-XXXXXXXXXX, 50 bits d'entropie.
 *
 * Remplace l'ancien `AMG-` + horodatage base36 tronqué, qui était à la fois
 * devinable (fonction déterministe de l'heure) et sujet aux collisions
 * (deux commandes dans la même milliseconde produisaient le même ID).
 * Généré côté serveur uniquement : ce que le client envoie est ignoré.
 */
export function generateOrderId(): string {
  return `GE-${randomId(10)}`;
}

/**
 * Jeton de suivi — 128 bits, non devinable.
 * Remis une seule fois à la création, exigé ensuite pour lire la commande.
 */
export function generateTrackingToken(): string {
  return randomId(26);
}
