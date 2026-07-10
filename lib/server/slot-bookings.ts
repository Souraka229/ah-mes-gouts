import { MAX_ORDERS_PER_SLOT } from "@/lib/delivery/constants";
import { getSlotsForDate } from "@/lib/delivery/slots";
import type { FulfillmentType, TimeSlotOption } from "@/lib/delivery/types";
import { getDeliveryConfig } from "@/lib/server/delivery-config-repository";

declare global {
  var __amgSlotBookings: Map<string, number> | undefined;
}

function getBookingStore(): Map<string, number> {
  if (!globalThis.__amgSlotBookings) {
    globalThis.__amgSlotBookings = new Map();
  }
  return globalThis.__amgSlotBookings;
}

export function getSlotBookingCount(slotKey: string): number {
  return getBookingStore().get(slotKey) ?? 0;
}

export function isSlotAvailable(slotKey: string): boolean {
  return getSlotBookingCount(slotKey) < MAX_ORDERS_PER_SLOT;
}

export function reserveSlot(slotKey: string): boolean {
  const store = getBookingStore();
  const current = store.get(slotKey) ?? 0;
  if (current >= MAX_ORDERS_PER_SLOT) return false;
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

  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(after);
    date.setDate(after.getDate() + offset);
    date.setHours(0, 0, 0, 0);

    const slots = getSlotsForDate(schedules, type, date, now);
    for (const slot of slots) {
      if (new Date(slot.start) < after) continue;
      if (isSlotAvailable(slot.slotKey)) return slot;
    }
  }

  return null;
}
