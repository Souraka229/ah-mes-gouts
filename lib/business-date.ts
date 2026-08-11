/** Fuseau boutique — Cotonou / Porto-Novo (UTC+1, sans heure d’été). */
export const SHOP_TIME_ZONE = "Africa/Porto-Novo";

/** Offset fixe Porto-Novo (pas de DST) — pour construire des ISO stables. */
export const SHOP_UTC_OFFSET = "+01:00";

/**
 * Heure (boutique) à partir de laquelle la journée du lendemain s'ouvre à la
 * commande. Avant cette heure on ne vend que le menu du jour.
 */
export const NEXT_DAY_ORDERING_OPENS_AT = 20;

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Clé calendrier boutique (YYYY-MM-DD), indépendante du fuseau du serveur. */
export function getShopDateKey(date: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function isTodayAtShop(date: Date | string, now = new Date()): boolean {
  return getShopDateKey(date) === getShopDateKey(now);
}

/** Heure locale boutique (0-23), indépendante du fuseau du serveur. */
export function getShopHour(date: Date | string = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).format(new Date(date));
  // `en-US` en 24 h rend « 24 » pour minuit — on le ramène à 0.
  return Number(hour) % 24;
}

/** Décale une clé calendrier boutique de N jours (arithmétique calendaire). */
export function addShopDays(dateKey: string, days: number): string {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function getTomorrowShopDateKey(now = new Date()): string {
  return addShopDays(getShopDateKey(now), 1);
}

export function isTomorrowAtShop(date: Date | string, now = new Date()): boolean {
  return getShopDateKey(date) === getTomorrowShopDateKey(now);
}

/**
 * Vrai à partir de 20 h (heure boutique) : la cliente peut alors réserver un
 * créneau du lendemain, en plus des créneaux restants du jour.
 */
export function isNextDayOrderingOpen(now = new Date()): boolean {
  return getShopHour(now) >= NEXT_DAY_ORDERING_OPENS_AT;
}

/**
 * Un créneau est commandable s'il tombe aujourd'hui, ou demain une fois la
 * fenêtre du lendemain ouverte. Source de vérité unique client + serveur.
 */
export function isOrderableShopDate(
  date: Date | string,
  now = new Date(),
): boolean {
  if (isTodayAtShop(date, now)) return true;
  return isNextDayOrderingOpen(now) && isTomorrowAtShop(date, now);
}

/** Jour de la semaine (0 = dimanche) dans le fuseau boutique. */
export function getShopDayOfWeek(date: Date | string = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TIME_ZONE,
    weekday: "short",
  }).format(new Date(date));
  return WEEKDAY_TO_INDEX[weekday] ?? new Date(date).getUTCDay();
}

/**
 * Convertit une date boutique (YYYY-MM-DD) + heure locale (HH:mm)
 * en Instant UTC — identique sur le navigateur client et Vercel.
 */
export function shopDateTimeToUtc(dateKey: string, timeHHmm: string): Date {
  const [rawH = "0", rawM = "0"] = timeHHmm.split(":");
  const hh = rawH.padStart(2, "0");
  const mm = rawM.padStart(2, "0");
  return new Date(`${dateKey}T${hh}:${mm}:00${SHOP_UTC_OFFSET}`);
}

export function shopDateTimeToIso(dateKey: string, timeHHmm: string): string {
  return shopDateTimeToUtc(dateKey, timeHHmm).toISOString();
}

/** Bornes UTC du jour boutique courant, utilisables dans les requêtes Prisma. */
export function getShopDayBounds(now = new Date()): {
  start: Date;
  end: Date;
} {
  const start = shopDateTimeToUtc(getShopDateKey(now), "00:00");
  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1),
  };
}
