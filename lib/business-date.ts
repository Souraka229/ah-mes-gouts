const SHOP_TIME_ZONE = "Africa/Porto-Novo";

/** Clé calendrier boutique (YYYY-MM-DD), indépendante du fuseau du serveur. */
export function getShopDateKey(date: Date | string): string {
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
