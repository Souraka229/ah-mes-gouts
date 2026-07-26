import { DELIVERY_WAVES, PICKUP_WINDOW } from "@/lib/delivery/constants";
import type {
  DeliveryScheduleConfig,
  FulfillmentType,
  TimeSlotOption,
} from "@/lib/delivery/types";

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

/** Aujourd'hui + N-1 jours suivants où le jour est actif. */
export function getSelectableDates(
  schedules: DeliveryScheduleConfig[],
  type: FulfillmentType,
  now = new Date(),
  daysAhead = 7,
): Date[] {
  const dates: Date[] = [];
  const base = startOfDay(now);

  for (let offset = 0; offset < daysAhead; offset++) {
    const date = new Date(base);
    date.setDate(base.getDate() + offset);
    const schedule = getScheduleForDay(schedules, type, date.getDay());
    if (schedule) dates.push(date);
  }

  return dates;
}

export function isDateClosed(
  schedules: DeliveryScheduleConfig[],
  type: FulfillmentType,
  date: Date,
): boolean {
  return !getScheduleForDay(schedules, type, date.getDay());
}

function timeOnDate(date: Date, time: string): Date {
  const minutes = parseTimeToMinutes(time);
  const d = new Date(date);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

/**
 * Créneaux proposés à la cliente.
 * - Livraison : 2 vagues fixes (13h–15h30, 16h–18h30).
 * - Retrait / sur place : une seule fenêtre large (jusqu'à 19h).
 * Le jour reste piloté par la config (schedule.isActive) ; seules
 * les heures sont figées pour rester ultra simples.
 */
export function buildSlotsForDate(
  schedule: DeliveryScheduleConfig,
  date: Date,
  now = new Date(),
): TimeSlotOption[] {
  const today = isSameDay(date, now);

  if (schedule.type === "delivery") {
    return DELIVERY_WAVES.flatMap((wave) => {
      const start = timeOnDate(date, wave.start);
      const end = timeOnDate(date, wave.end);
      // On masque une vague déjà commencée pour une commande du jour.
      if (today && start <= now) return [];
      return [
        {
          start: start.toISOString(),
          end: end.toISOString(),
          label: wave.label,
          slotKey: `delivery:${wave.key}:${start.toISOString()}`,
        },
      ];
    });
  }

  // Retrait / sur place : fenêtre unique.
  const start = timeOnDate(date, PICKUP_WINDOW.start);
  const end = timeOnDate(date, PICKUP_WINDOW.end);
  if (today && end <= now) return [];
  return [
    {
      start: start.toISOString(),
      end: end.toISOString(),
      label: PICKUP_WINDOW.label,
      slotKey: `pickup:${start.toISOString()}`,
    },
  ];
}

export function getSlotsForDate(
  schedules: DeliveryScheduleConfig[],
  type: FulfillmentType,
  date: Date,
  now = new Date(),
): TimeSlotOption[] {
  const schedule = getScheduleForDay(schedules, type, date.getDay());
  if (!schedule) return [];
  return buildSlotsForDate(schedule, date, now);
}

export function formatSlotDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatSlotRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const time = (d: Date) =>
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${time(start)} et ${time(end)}`;
}

export function formatSlotDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
