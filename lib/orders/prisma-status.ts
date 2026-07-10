import type { OrderStatus } from "@/types/order";

const TO_PRISMA: Record<OrderStatus, string> = {
  recue: "RECUE",
  paiement_confirme: "PAIEMENT_CONFIRME",
  preparation: "PREPARATION",
  prete: "PRETE",
  en_livraison: "EN_LIVRAISON",
  livree: "LIVREE",
  annulee: "ANNULEE",
};

const FROM_PRISMA: Record<string, OrderStatus> = {
  RECUE: "recue",
  PAIEMENT_CONFIRME: "paiement_confirme",
  PREPARATION: "preparation",
  PRETE: "prete",
  EN_LIVRAISON: "en_livraison",
  LIVREE: "livree",
  ANNULEE: "annulee",
};

export function fromPrismaOrderStatus(value: string): OrderStatus {
  return FROM_PRISMA[value] ?? "recue";
}

export function toPrismaOrderStatus(status: OrderStatus): string {
  return TO_PRISMA[status];
}
