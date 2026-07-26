import {
  getShopDateKey,
  getShopDayOfWeek,
  shopDateTimeToUtc,
} from "@/lib/business-date";
import { DELIVERY_WAVES } from "@/lib/delivery/constants";
import type {
  DeliveryScheduleConfig,
  FulfillmentType,
  TimeSlotOption,
} from "@/lib/delivery/types";

/** Clé unique partagée client/serveur : `delivery:2026-07-26T12:00:00.000Z`. */
export function buildSlotKey(type: FulfillmentType, startIso: string): string {
  return `${type}:${startIso}`;
}

export function parseSlotKey(slotKey: string): {
  type: string;
  startIso: string;
} {
  const colon = slotKey.indexOf(":");
  if (colon < 0) return { type: "", startIso: slotKey };
  return {
    type: slotKey.slice(0, colon),
    startIso: slotKey.slice(colon + 1),
  };
}

export function getScheduleForDay(
  schedules: DeliveryScheduleConfig[],
  type: FulfillmentType,
  dayOfWeek: number,
): DeliveryScheduleConfig | undefined {
  return schedules.find(
    (s) => s.type === type && s.dayOfWeek === dayOfWeek && s.isActive,
  );
}

/** Aujourd'hui + N-1 jours suivants où le jour est actif (fuseau boutique). */
export function getSelectableDates(
  schedules: DeliveryScheduleConfig[],
  type: FulfillmentType,
  now = new Date(),
  daysAhead = 7,
): Date[] {
  const dates: Date[] = [];
  const todayKey = getShopDateKey(now);

  for (let offset = 0; offset < daysAhead; offset++) {
    const probe = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const dateKey = getShopDateKey(probe);
    // Ancre midi UTC+1 pour un Instant stable représentant ce jour boutique.
    const noon = shopDateTimeToUtc(dateKey, "12:00");
    const schedule = getScheduleForDay(
      schedules,
      type,
      getShopDayOfWeek(noon),
    );
    if (schedule) {
      // Évite les doublons si le décalage tombe sur la même dateKey.
      if (dates.some((d) => getShopDateKey(d) === dateKey)) continue;
      if (offset === 0 && dateKey !== todayKey) continue;
      dates.push(noon);
    }
  }

  return dates;
}

export function isDateClosed(
  schedules: DeliveryScheduleConfig[],
  type: FulfillmentType,
  date: Date,
): boolean {
  return !getScheduleForDay(schedules, type, getShopDayOfWeek(date));
}

/**
 * Créneaux proposés à la cliente.
 * Deux vagues fixes pour tous les modes (13h–15h30, 16h–18h30) en heure Cotonou.
 */
export function buildSlotsForDate(
  schedule: DeliveryScheduleConfig,
  date: Date,
  now = new Date(),
): TimeSlotOption[] {
  const dateKey = getShopDateKey(date);
  const today = dateKey === getShopDateKey(now);

  return DELIVERY_WAVES.flatMap((wave) => {
    const start = shopDateTimeToUtc(dateKey, wave.start);
    const end = shopDateTimeToUtc(dateKey, wave.end);
    // La vague reste commandable jusqu'à sa fin (heure boutique).
    if (today && end.getTime() <= now.getTime()) return [];

    const startIso = start.toISOString();
    return [
      {
        start: startIso,
        end: end.toISOString(),
        label: wave.label,
        slotKey: buildSlotKey(schedule.type, startIso),
      },
    ];
  });
}

export function getSlotsForDate(
  schedules: DeliveryScheduleConfig[],
  type: FulfillmentType,
  date: Date,
  now = new Date(),
): TimeSlotOption[] {
  const schedule = getScheduleForDay(
    schedules,
    type,
    getShopDayOfWeek(date),
  );
  if (!schedule) return [];
  return buildSlotsForDate(schedule, date, now);
}

export function formatSlotDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatSlotRange(startIso: string, endIso: string): string {
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("fr-FR", {
      timeZone: "Africa/Porto-Novo",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${time(startIso)} et ${time(endIso)}`;
}

export function formatSlotDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
