import {
  buildSlotKey,
  getSlotsForDate,
  parseSlotKey,
} from "@/lib/delivery/slots";
import { DELIVERY_WAVE_CAPACITY } from "@/lib/delivery/constants";
import type { FulfillmentType, TimeSlotOption } from "@/lib/delivery/types";
import { getDeliveryConfig } from "@/lib/server/delivery-config-repository";
import { getPrisma } from "@/lib/prisma";
import { getPendingPaymentCutoff } from "@/lib/orders/payment-expiration";
import {
  getTomorrowShopDateKey,
  isNextDayOrderingOpen,
  isOrderableShopDate,
  shopDateTimeToUtc,
} from "@/lib/business-date";

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

/**
 * Capacité d'un créneau.
 *
 * Livraison : 35 par vague, fixé par la boutique d'après ce qu'une tournée
 * peut absorber. Retrait : réglable par l'admin, la contrainte n'étant pas la
 * même (personne ne transporte les commandes).
 */
export async function getMaxOrdersPerSlot(
  type: FulfillmentType,
): Promise<number> {
  if (type === "delivery") return DELIVERY_WAVE_CAPACITY;
  const { options } = await getDeliveryConfig();
  return options.maxOrdersPerSlot;
}

/** Comptage DB uniquement — source de vérité unique (plus de Map RAM). */
export async function getSlotUsageCount(slotKey: string): Promise<number> {
  return countOrdersForSlot(slotKey);
}

export async function isSlotAvailable(slotKey: string): Promise<boolean> {
  const { type } = parseSlotKey(slotKey);
  const [usage, max] = await Promise.all([
    getSlotUsageCount(slotKey),
    getMaxOrdersPerSlot(type as FulfillmentType),
  ]);
  return usage < max;
}

/**
 * Remplissage d'une vague — réservé au back-office.
 * La cliente ne voit jamais ces chiffres, seulement si une vague est ouverte.
 */
export async function getSlotOccupancy(slotKey: string): Promise<{
  used: number;
  capacity: number;
  isFull: boolean;
}> {
  const { type } = parseSlotKey(slotKey);
  const [used, capacity] = await Promise.all([
    getSlotUsageCount(slotKey),
    getMaxOrdersPerSlot(type as FulfillmentType),
  ]);
  return { used, capacity, isFull: used >= capacity };
}

/**
 * Créneaux ouverts à la commande : ceux qui restent aujourd'hui, plus ceux de
 * demain dès 20 h (heure boutique). Ancre midi = Instant stable du jour visé.
 */
function getOrderableSlots(
  schedules: Parameters<typeof getSlotsForDate>[0],
  type: FulfillmentType,
  now: Date,
): TimeSlotOption[] {
  const slots = getSlotsForDate(schedules, type, now, now);
  if (!isNextDayOrderingOpen(now)) return slots;

  const tomorrowNoon = shopDateTimeToUtc(getTomorrowShopDateKey(now), "12:00");
  return [...slots, ...getSlotsForDate(schedules, type, tomorrowNoon, now)];
}

export async function findNextAvailableSlot(
  type: FulfillmentType,
  afterStartIso: string,
): Promise<TimeSlotOption | null> {
  const { schedules } = await getDeliveryConfig();
  const after = new Date(afterStartIso);
  const now = new Date();
  if (!isOrderableShopDate(after, now)) return null;

  const slots = getOrderableSlots(schedules, type, now);
  for (const slot of slots) {
    // Inclut le créneau courant s'il est encore libre (réessai après sync TZ).
    if (new Date(slot.start).getTime() < after.getTime()) continue;
    if (await isSlotAvailable(buildSlotKey(type, slot.start))) return slot;
  }

  return null;
}

/**
 * Créneaux encore libres (capacité restante > 0) : aujourd'hui, et demain une
 * fois passé 20 h — c'est la seule liste que le front affiche.
 */
export async function getAvailableSlots(
  type: FulfillmentType,
  now = new Date(),
): Promise<TimeSlotOption[]> {
  const { schedules } = await getDeliveryConfig();
  const slots = getOrderableSlots(schedules, type, now);
  const max = await getMaxOrdersPerSlot(type);

  const checked = await Promise.all(
    slots.map(async (slot) => {
      const usage = await getSlotUsageCount(buildSlotKey(type, slot.start));
      return usage < max ? slot : null;
    }),
  );

  return checked.filter((slot): slot is TimeSlotOption => slot !== null);
}

/** Le créneau tombe-t-il sur une journée encore commandable ? */
export function assertSlotIsOrderable(
  startIso: string,
  now = new Date(),
): boolean {
  return isOrderableShopDate(startIso, now);
}
