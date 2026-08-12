import { describe, expect, it } from "vitest";

import {
  DELIVERY_WAVE_CAPACITY,
  DELIVERY_WAVES,
} from "@/lib/delivery/constants";
import { buildSlotsForDate } from "@/lib/delivery/slots";
import { shopDateTimeToUtc } from "@/lib/business-date";
import type { DeliveryScheduleConfig } from "@/lib/delivery/types";

const JOUR = "2026-08-13";

function schedule(type: "delivery" | "pickup"): DeliveryScheduleConfig {
  return {
    id: `sched-${type}`,
    dayOfWeek: 4,
    startTime: "13:00",
    endTime: "19:00",
    slotDuration: 30,
    type,
    isActive: true,
  };
}

/** Un instant avant la première vague, pour que rien ne soit filtré. */
const AVANT = shopDateTimeToUtc(JOUR, "08:00");

describe("vagues de livraison", () => {
  it("propose exactement les trois tournées de la boutique", () => {
    const slots = buildSlotsForDate(
      schedule("delivery"),
      shopDateTimeToUtc(JOUR, "12:00"),
      AVANT,
    );

    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.label)).toEqual([
      "1ʳᵉ vague · 13h30 – 15h30",
      "2ᵉ vague · 15h30 – 17h30",
      "3ᵉ vague · 17h30 – 19h30",
    ]);
  });

  it("cale les horaires en heure boutique, pas en UTC", () => {
    const [first] = buildSlotsForDate(
      schedule("delivery"),
      shopDateTimeToUtc(JOUR, "12:00"),
      AVANT,
    );
    // 13h30 à Cotonou = 12h30 UTC.
    expect(first!.start).toBe("2026-08-13T12:30:00.000Z");
    expect(first!.end).toBe("2026-08-13T14:30:00.000Z");
  });

  it("enchaîne les vagues sans trou ni chevauchement", () => {
    const slots = buildSlotsForDate(
      schedule("delivery"),
      shopDateTimeToUtc(JOUR, "12:00"),
      AVANT,
    );
    expect(slots[0]!.end).toBe(slots[1]!.start);
    expect(slots[1]!.end).toBe(slots[2]!.start);
  });

  it("ignore la plage horaire configurée — les vagues sont fixes", () => {
    const large = { ...schedule("delivery"), startTime: "08:00", endTime: "23:00" };
    const slots = buildSlotsForDate(
      large,
      shopDateTimeToUtc(JOUR, "12:00"),
      AVANT,
    );
    expect(slots).toHaveLength(3);
    expect(slots[0]!.start).toBe("2026-08-13T12:30:00.000Z");
  });

  it("retire une vague déjà terminée dans la journée", () => {
    const slots = buildSlotsForDate(
      schedule("delivery"),
      shopDateTimeToUtc(JOUR, "12:00"),
      // 16h à Cotonou : la 1ʳᵉ vague est passée.
      shopDateTimeToUtc(JOUR, "16:00"),
    );
    expect(slots).toHaveLength(2);
    expect(slots[0]!.label).toContain("2ᵉ vague");
  });

  it("garde 35 par vague", () => {
    expect(DELIVERY_WAVE_CAPACITY).toBe(35);
    expect(DELIVERY_WAVES).toHaveLength(3);
  });
});

describe("retrait", () => {
  it("continue de dériver ses créneaux de la plage configurée", () => {
    const slots = buildSlotsForDate(
      schedule("pickup"),
      shopDateTimeToUtc(JOUR, "12:00"),
      AVANT,
    );
    // Le retrait n'est pas concerné par les vagues de livraison.
    expect(slots).toHaveLength(2);
    expect(slots[0]!.label).toContain("Vague 1");
  });
});
