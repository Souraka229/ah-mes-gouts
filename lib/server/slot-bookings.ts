import { getSlotsForDate } from "@/lib/delivery/slots";
import type { FulfillmentType, TimeSlotOption } from "@/lib/delivery/types";
import { getDeliveryConfig } from "@/lib/server/delivery-config-repository";
import { getPrisma } from "@/lib/prisma";
import { getPendingPaymentCutoff } from "@/lib/orders/payment-expiration";
import { isTodayAtShop } from "@/lib/business-date";

export function parseSlotKey(slotKey: string): {
  type: string;
  startIso: string;
} {
  const colon = slotKey.indexOf(":");
  return {
    type: slotKey.slice(0, colon),
    startIso: slotKey.slice(colon + 1),
  };
}

export async function countOrdersForSlot(slotKey: string): Promise<number> {
  const { type, startIso } = parseSlotKey(slotKey);
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return 0;

  const prisma = getPrisma();
  return prisma.order.count({
    where: {
      scheduledSlotStart: start,
      fulfillmentType: type,
      OR: [
        { status: { notIn: ["RECUE", "ANNULEE"] } },
        {
          status: "RECUE",
          createdAt: { gt: getPendingPaymentCutoff() },
        },
      ],
    },
  });
}

export async function getMaxOrdersPerSlot(): Promise<number> {
  const { options } = await getDeliveryConfig();
  return options.maxOrdersPerSlot;
}

/** Comptage DB uniquement — source de vérité unique (plus de Map RAM). */
export async function getSlotUsageCount(slotKey: string): Promise<number> {
  return countOrdersForSlot(slotKey);
}

export async function isSlotAvailable(slotKey: string): Promise<boolean> {
  const [usage, max] = await Promise.all([
    getSlotUsageCount(slotKey),
    getMaxOrdersPerSlot(),
  ]);
  return usage < max;
}

export function buildSlotKey(
  type: FulfillmentType,
  startIso: string,
): string {
  return `${type}:${startIso}`;
}

export async function findNextAvailableSlot(
  type: FulfillmentType,
  afterStartIso: string,
): Promise<TimeSlotOption | null> {
  const { schedules } = await getDeliveryConfig();
  const after = new Date(afterStartIso);
  const now = new Date();
  if (!isTodayAtShop(after, now)) return null;

  const slots = getSlotsForDate(schedules, type, now, now);
  for (const slot of slots) {
    if (new Date(slot.start) < after) continue;
    if (await isSlotAvailable(buildSlotKey(type, slot.start))) return slot;
  }

  return null;
}
