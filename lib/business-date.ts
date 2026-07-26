/** Fuseau boutique — Cotonou / Porto-Novo (UTC+1, sans heure d’été). */
export const SHOP_TIME_ZONE = "Africa/Porto-Novo";

/** Offset fixe Porto-Novo (pas de DST) — pour construire des ISO stables. */
export const SHOP_UTC_OFFSET = "+01:00";

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
