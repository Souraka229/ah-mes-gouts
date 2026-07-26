export type MenuStatus = "scheduled" | "active" | "expired";

export type ScheduledMenu = {
  id: string;
  /** Jour calendaire du menu (ISO date, minuit UTC ou locale) */
  date: string;
  /** Date+heure exacte d'activation automatique */
  activateAt: string;
  status: MenuStatus;
  productIds: string[];
  displayOrder: number[];
  /** Stock du jour par produit (même ordre que productIds). Réinitialise le
   *  stockRemaining à l'activation du menu (20h la veille). */
  dailyStock: number[];
  createdAt: string;
};

export const MENU_STATUS_LABELS: Record<MenuStatus, string> = {
  scheduled: "Programmé",
  active: "Actif",
  expired: "Expiré",
};

export type PublicMenuInfo = {
  activeMenu: ScheduledMenu | null;
  nextMenu: ScheduledMenu | null;
  activateAtLabel: string | null;
};
