import { getSlotsForDate } from "@/lib/delivery/slots";
import type { FulfillmentType, TimeSlotOption } from "@/lib/delivery/types";
import { getDeliveryConfig } from "@/lib/server/delivery-config-repository";
import { getPrisma } from "@/lib/prisma";

declare global {
  var __amgSlotBookings: Map<string, number> | undefined;
}

function getBookingStore(): Map<string, number> {
  if (!globalThis.__amgSlotBookings) {
    globalThis.__amgSlotBookings = new Map();
  }
  return globalThis.__amgSlotBookings;
}

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
      status: { not: "ANNULEE" },
    },
  });
}

export async function getMaxOrdersPerSlot(): Promise<number> {
  const { options } = await getDeliveryConfig();
  return options.maxOrdersPerSlot;
}

export function getSlotBookingCount(slotKey: string): number {
  return getBookingStore().get(slotKey) ?? 0;
}

export async function getSlotUsageCount(slotKey: string): Promise<number> {
  const [dbCount, memoryCount] = await Promise.all([
    countOrdersForSlot(slotKey),
    Promise.resolve(getSlotBookingCount(slotKey)),
  ]);
  return Math.max(dbCount, memoryCount);
}

export async function isSlotAvailable(slotKey: string): Promise<boolean> {
  const [usage, max] = await Promise.all([
    getSlotUsageCount(slotKey),
    getMaxOrdersPerSlot(),
  ]);
  return usage < max;
}

export async function reserveSlot(slotKey: string): Promise<boolean> {
  const available = await isSlotAvailable(slotKey);
  if (!available) return false;

  const store = getBookingStore();
  const current = store.get(slotKey) ?? 0;
  store.set(slotKey, current + 1);
  return true;
}

export function releaseSlot(slotKey: string): void {
  const store = getBookingStore();
  const current = store.get(slotKey) ?? 0;
  if (current <= 1) store.delete(slotKey);
  else store.set(slotKey, current - 1);
}

export function getAllSlotBookings(): Record<string, number> {
  return Object.fromEntries(getBookingStore());
}

export function buildSlotKey(
  type: import("@/lib/delivery/types").FulfillmentType,
  startIso: string,
): string {
  return `${type}:${startIso}`;
}

export async function findNextAvailableSlot(
  type: FulfillmentType,
  afterStartIso: string,
): Promise<TimeSlotOption | null> {
  const { schedules, options } = await getDeliveryConfig();
  const after = new Date(afterStartIso);
  const now = new Date();

  for (let offset = 0; offset < options.bookingDaysAhead; offset++) {
    const date = new Date(after);
    date.setDate(after.getDate() + offset);
    date.setHours(0, 0, 0, 0);

    const slots = getSlotsForDate(schedules, type, date, now);
    for (const slot of slots) {
      if (new Date(slot.start) < after) continue;
      if (await isSlotAvailable(slot.slotKey)) return slot;
    }
  }

  return null;
}
