export const PICKUP_ADDRESS =
  "Gift & ENTREMETS — Fidjrosse fin pavée, face à Yatt & Co, Cotonou";

/** Capacité par créneau de retrait (commandes simultanées). */
export const MAX_ORDERS_PER_SLOT = 5;

/**
 * Vagues de livraison — horaires fixes, décidés par la boutique.
 *
 * Contrairement au retrait, les vagues de livraison ne se déduisent pas d'une
 * plage horaire : ce sont trois tournées identifiées, calées sur la
 * disponibilité des livreurs.
 */
export const DELIVERY_WAVES = [
  { id: "vague-1", start: "13:30", end: "15:30", label: "1ʳᵉ vague" },
  { id: "vague-2", start: "15:30", end: "17:30", label: "2ᵉ vague" },
  { id: "vague-3", start: "17:30", end: "19:30", label: "3ᵉ vague" },
] as const;

/**
 * Nombre de livraisons par vague.
 *
 * Information interne : jamais affichée à la cliente, qui voit seulement si
 * une vague est encore ouverte ou non. Le back-office suit le remplissage et
 * reçoit une alerte quand une vague est complète.
 */
export const DELIVERY_WAVE_CAPACITY = 35;

export const SLOT_DURATION_OPTIONS = [15, 30, 45, 60] as const;

export const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;
