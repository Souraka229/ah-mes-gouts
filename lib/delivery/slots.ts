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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatWaveLabel(label: string, start: string, end: string): string {
  const fmt = (time: string) => time.replace(":", "h");
  return `${label} · ${fmt(start)} – ${fmt(end)}`;
}

/**
 * Vagues de livraison — horaires fixes (13h30–15h30, 15h30–17h30,
 * 17h30–19h30), et non plus une plage découpée en deux par calcul.
 *
 * Ce sont trois tournées réelles calées sur la disponibilité des livreurs :
 * les dériver d'un couple startTime/endTime donnait des horaires qui ne
 * correspondaient à aucune tournée effective.
 */
function buildDeliveryWaves(): { start: string; end: string; label: string }[] {
  return DELIVERY_WAVES.map((wave) => ({
    start: wave.start,
    end: wave.end,
    label: formatWaveLabel(wave.label, wave.start, wave.end),
  }));
}

/**
 * Retrait : l'horaire configuré par l'admin (startTime → endTime) reste
 * découpé en 2 vagues — la cliente vient quand elle veut dans la plage.
 */
function buildWavesFromSchedule(
  schedule: DeliveryScheduleConfig,
): { start: string; end: string; label: string }[] {
  const startMin = timeToMinutes(schedule.startTime);
  const endMin = timeToMinutes(schedule.endTime);
  const total = endMin - startMin;
  if (total <= 0) return [];

  // Battement de 30 min entre les 2 vagues si la plage est assez large.
  const gap = total >= 150 ? 30 : 0;
  const usable = total - gap;
  const half = Math.floor(usable / 2);

  const wave1Start = startMin;
  const wave1End = startMin + half;
  const wave2Start = wave1End + gap;
  const wave2End = endMin;

  const fmt = (mins: number) =>
    new Date(2000, 0, 1, Math.floor(mins / 60), mins % 60).toLocaleTimeString(
      "fr-FR",
      { hour: "2-digit", minute: "2-digit" },
    );

  return [
    {
      start: minutesToTime(wave1Start),
      end: minutesToTime(wave1End),
      label: `Vague 1 · ${fmt(wave1Start)} – ${fmt(wave1End)}`,
    },
    {
      start: minutesToTime(wave2Start),
      end: minutesToTime(wave2End),
      label: `Vague 2 · ${fmt(wave2Start)} – ${fmt(wave2End)}`,
    },
  ];
}

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
 * Créneaux proposés à la cliente — 2 vagues calculées depuis l'horaire
 * configuré par l'admin (schedule.startTime → schedule.endTime), en heure
 * Cotonou. La 2ᵉ vague va toujours jusqu'à l'heure de fermeture réglée.
 */
export function buildSlotsForDate(
  schedule: DeliveryScheduleConfig,
  date: Date,
  now = new Date(),
): TimeSlotOption[] {
  const dateKey = getShopDateKey(date);
  const today = dateKey === getShopDateKey(now);
  const waves =
    schedule.type === "delivery"
      ? buildDeliveryWaves()
      : buildWavesFromSchedule(schedule);

  return waves.flatMap((wave) => {
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
