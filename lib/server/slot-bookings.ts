import {
  buildSlotKey,
  getSlotsForDate,
  parseSlotKey,
} from "@/lib/delivery/slots";
import type { FulfillmentType, TimeSlotOption } from "@/lib/delivery/types";
import { getDeliveryConfig } from "@/lib/server/delivery-config-repository";
import { getPrisma } from "@/lib/prisma";
import { getPendingPaymentCutoff } from "@/lib/orders/payment-expiration";
import { getShopDateKey, isTodayAtShop } from "@/lib/business-date";

export { buildSlotKey, parseSlotKey };

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
    // Inclut le créneau courant s'il est encore libre (réessai après sync TZ).
    if (new Date(slot.start).getTime() < after.getTime()) continue;
    if (await isSlotAvailable(buildSlotKey(type, slot.start))) return slot;
  }

  return null;
}

/** Créneaux du jour encore libres (capacité restante > 0). */
export async function getAvailableSlotsToday(
  type: FulfillmentType,
  now = new Date(),
): Promise<TimeSlotOption[]> {
  const { schedules, options } = await getDeliveryConfig();
  const slots = getSlotsForDate(schedules, type, now, now);
  const max = options.maxOrdersPerSlot;

  const checked = await Promise.all(
    slots.map(async (slot) => {
      const usage = await getSlotUsageCount(buildSlotKey(type, slot.start));
      return usage < max ? slot : null;
    }),
  );

  return checked.filter((slot): slot is TimeSlotOption => slot !== null);
}

export function assertSlotIsToday(startIso: string, now = new Date()): boolean {
  return getShopDateKey(startIso) === getShopDateKey(now);
}
