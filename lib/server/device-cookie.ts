/**
 * Identifiant d'appareil — couche 1 de la mémoire client.
 *
 * Posé par le serveur via Set-Cookie, `httpOnly`, 400 jours. L'ancien
 * `deviceKey` vivait uniquement en LocalStorage, écrit par JavaScript : Safari
 * et iOS purgent ce stockage après 7 jours d'inactivité, donc la « mémoire
 * client » s'effaçait toute seule chaque semaine — précisément le cas
 * « elle revient des semaines plus tard » qu'on veut couvrir.
 *
 * `httpOnly` a un second bénéfice : l'identifiant devient inaccessible au JS,
 * donc involable par XSS.
 */
export const DEVICE_COOKIE = "ge_did";

/** Plafond navigateur pour la durée de vie d'un cookie. */
export const DEVICE_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 3600;

export const DEVICE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS,
} as const;
