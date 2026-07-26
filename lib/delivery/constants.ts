export const PICKUP_ADDRESS =
  "Gift & ENTREMETS — Fidjrosse fin pavée, face à Yatt & Co, Cotonou";

/** Capacité par créneau (commandes simultanées). */
export const MAX_ORDERS_PER_SLOT = 5;

export const SLOT_DURATION_OPTIONS = [15, 30, 45, 60] as const;

/**
 * Livraison en 2 vagues fixes (choix ultra simple pour la cliente).
 * Vague 1 : après-midi · Vague 2 : fin de journée.
 */
export const DELIVERY_WAVES = [
  { key: "vague-1", start: "13:00", end: "15:30", label: "Vague 1 · 13h – 15h30" },
  { key: "vague-2", start: "16:00", end: "18:30", label: "Vague 2 · 16h – 18h30" },
] as const;

/**
 * Retrait / à emporter : une seule fenêtre très large.
 * La cliente passe chercher quand elle veut avant la fermeture.
 */
export const PICKUP_WINDOW = {
  start: "13:00",
  end: "19:00",
  label: "13h – 19h (passez quand vous voulez)",
} as const;

export const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;
