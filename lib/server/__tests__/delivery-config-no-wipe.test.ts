import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DeliveryConfig } from "@/lib/delivery/types";

/**
 * Enregistrer la configuration livraison ne doit JAMAIS vider la grille.
 *
 * `writeConfigToDb` faisait `deliveryZone.deleteMany()` avant de recréer les
 * zones. Les lieux (`DeliveryArea`) étant rattachés à leur zone, le premier
 * enregistrement depuis la page livraison de l'admin a effacé les 113 lieux de
 * la grille tarifaire. Le code fait désormais des upserts ; ce test tient la
 * propriété, parce qu'une relecture ne l'aurait pas vue.
 */

const calls: string[] = [];

const zoneUpsert = vi.fn(async () => {
  calls.push("zone.upsert");
  return {};
});
const zoneDeleteMany = vi.fn(async () => {
  calls.push("zone.deleteMany");
  return { count: 0 };
});
const zoneFindMany = vi.fn(async () => []);
const scheduleDeleteMany = vi.fn(async () => ({ count: 0 }));
const scheduleCreateMany = vi.fn(async () => ({ count: 0 }));
const optionsUpsert = vi.fn(async () => ({}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    deliveryZone: {
      upsert: zoneUpsert,
      deleteMany: zoneDeleteMany,
      findMany: zoneFindMany,
      delete: vi.fn(),
      update: vi.fn(),
    },
    deliverySchedule: {
      deleteMany: scheduleDeleteMany,
      createMany: scheduleCreateMany,
    },
    deliveryOptions: { upsert: optionsUpsert },
    $transaction: async (ops: unknown[]) => ops,
  }),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

const { saveDeliveryConfig } = await import(
  "@/lib/server/delivery-config-repository"
);

function configWith(zones: DeliveryConfig["zones"]): DeliveryConfig {
  return {
    zones,
    schedules: [],
    options: {
      maxOrdersPerSlot: 5,
      bookingDaysAhead: 7,
      pickupAddress: "Boutique",
    },
  };
}

const zone = (id: string, name: string, cost: number) => ({
  id,
  name,
  cost,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe("enregistrement de la configuration livraison", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
  });

  it("n'appelle jamais deleteMany sur les zones", async () => {
    await saveDeliveryConfig(
      configWith([zone("zone-e", "Destinations E", 500), zone("zone-c", "Destinations C", 800)]),
    );

    expect(zoneDeleteMany).not.toHaveBeenCalled();
    expect(calls).not.toContain("zone.deleteMany");
  });

  it("passe par un upsert par zone", async () => {
    await saveDeliveryConfig(
      configWith([zone("zone-e", "Destinations E", 500), zone("zone-c", "Destinations C", 800)]),
    );

    expect(zoneUpsert).toHaveBeenCalledTimes(2);
  });

  it("enregistre quand même une configuration sans zone", async () => {
    await saveDeliveryConfig(configWith([]));

    expect(zoneDeleteMany).not.toHaveBeenCalled();
    expect(zoneUpsert).not.toHaveBeenCalled();
  });
});
