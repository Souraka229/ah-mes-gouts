import type {
  DeliveryScheduleConfig,
  FulfillmentType,
  TimeSlotOption,
} from "@/lib/delivery/types";

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

export function buildSlotsForDate(
  schedule: DeliveryScheduleConfig,
  date: Date,
  now = new Date(),
): TimeSlotOption[] {
  const startMin = parseTimeToMinutes(schedule.startTime);
  const endMin = parseTimeToMinutes(schedule.endTime);
  const slots: TimeSlotOption[] = [];

  for (let cursor = startMin; cursor + schedule.slotDuration <= endMin; cursor += schedule.slotDuration) {
    const slotStart = new Date(date);
    slotStart.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + schedule.slotDuration);

    if (isSameDay(date, now) && slotStart <= now) continue;

    const label = `${formatMinutes(cursor)} – ${formatMinutes(cursor + schedule.slotDuration)}`;
    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      label,
      slotKey: `${schedule.type}:${slotStart.toISOString()}`,
    });
  }

  return slots;
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
