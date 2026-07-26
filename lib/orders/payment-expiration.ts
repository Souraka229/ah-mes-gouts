/** Une commande non payée ne réserve le créneau que pendant 20 minutes. */
export const PENDING_PAYMENT_TTL_MS = 20 * 60 * 1000;

export function getPendingPaymentCutoff(now = new Date()): Date {
  return new Date(now.getTime() - PENDING_PAYMENT_TTL_MS);
}

export function isPendingPaymentExpired(
  createdAt: string | Date,
  now = new Date(),
): boolean {
  return new Date(createdAt).getTime() <= getPendingPaymentCutoff(now).getTime();
}
