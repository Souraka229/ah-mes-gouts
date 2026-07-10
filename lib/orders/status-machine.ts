import type { OrderStatus } from "@/types/order";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  recue: ["paiement_confirme", "annulee"],
  paiement_confirme: ["preparation", "annulee"],
  preparation: ["prete", "annulee"],
  prete: ["en_livraison", "annulee"],
  en_livraison: ["livree", "annulee"],
  livree: [],
  annulee: [],
};

/** Admin peut forcer n'importe quel statut valide (prévaut sur le livreur). */
export function canAdminSetStatus(
  _current: OrderStatus,
  next: OrderStatus,
): boolean {
  return next !== _current;
}

export function canDriverStartDelivery(status: OrderStatus): boolean {
  return status === "prete";
}

export function canDriverMarkDelivered(
  status: OrderStatus,
  driverStartedAt: Date | null,
): boolean {
  return status === "en_livraison" && driverStartedAt !== null;
}

export function assertDriverTransition(
  current: OrderStatus,
  next: OrderStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new Error(
      `Transition interdite : ${current} → ${next}`,
    );
  }
}
