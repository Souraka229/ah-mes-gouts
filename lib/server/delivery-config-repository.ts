import { randomUUID } from "crypto";

import { revalidateTag } from "next/cache";

import { unstable_cache } from "next/cache";

import type {
  DeliveryConfig,
  DeliveryOptions,
  DeliveryScheduleConfig,
  DeliveryZoneConfig,
  FulfillmentType,
} from "@/lib/delivery/types";
import { getPrisma } from "@/lib/prisma";

function defaultOptions(): DeliveryOptions {
  return {
    maxOrdersPerSlot: 5,
    bookingDaysAhead: 7,
    pickupAddress: "Gift & ENTREMETS — Cotonou, Bénin",
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultSchedulesForType(type: FulfillmentType): DeliveryScheduleConfig[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    id: randomUUID(),
    dayOfWeek,
    startTime: "13:00",
    endTime: "19:00",
    slotDuration: 30,
    type,
    isActive: true,
  }));
}

function createDefaultConfig(): DeliveryConfig {
  const timestamp = nowIso();
  /** Aligné sur affiches ops zone-a…zone-e (prix officiels). */
  const zones: DeliveryZoneConfig[] = [
    {
      id: "zone-e",
      name: "Fidjrossè centre, Calvaire, Akogbato, Fidjrossè JNP, Sème City, Erevan Aéroport, Direction générale MTN",
      cost: 500,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "zone-d",
      name: "Agla, Aïbatin, Barrière, Cadjèhoun, Fidjrossè Cabane des Pêcheurs, Gbégamey, Haie Vive, Houeyiho, St Jean, Vodjè",
      cost: 700,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "zone-c",
      name: "Ganhi, Tokpa, St Michel, Aïdjèdo, Ste Cécile, Vedokô, Toyota, St Rita, Sikèkodji, Menontin…",
      cost: 800,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "zone-b",
      name: "Segbèya, Lomnava, Sènadé, Sobebra, Habitat, Quartier Jack, Yenawa, Sacré Cœur…",
      cost: 1000,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "zone-a",
      name: "Sourou Léré, Tanti, Yagbé, Avotrou, Finagon, Cocotomey, Zone des Ambassades, Cococodji…",
      cost: 1500,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  return {
    zones,
    schedules: [
      ...defaultSchedulesForType("delivery"),
      ...defaultSchedulesForType("pickup"),
    ],
    options: defaultOptions(),
  };
}

function toZoneConfig(row: {
  id: string;
  name: string;
  cost: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DeliveryZoneConfig {
  return {
    id: row.id,
    name: row.name,
    cost: row.cost,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toScheduleConfig(row: {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  type: string;
  isActive: boolean;
}): DeliveryScheduleConfig {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    slotDuration: row.slotDuration,
    type: row.type as FulfillmentType,
    isActive: row.isActive,
  };
}

async function readOptionsFromDb(): Promise<DeliveryOptions | null> {
  const prisma = getPrisma();
  const row = await prisma.deliveryOptions.findUnique({ where: { id: "default" } });
  if (!row) return null;
  return {
    maxOrdersPerSlot: row.maxOrdersPerSlot,
    bookingDaysAhead: row.bookingDaysAhead,
    pickupAddress: row.pickupAddress,
  };
}

async function writeOptionsToDb(options: DeliveryOptions): Promise<void> {
  const prisma = getPrisma();
  await prisma.deliveryOptions.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      maxOrdersPerSlot: options.maxOrdersPerSlot,
      bookingDaysAhead: options.bookingDaysAhead,
      pickupAddress: options.pickupAddress,
    },
    update: {
      maxOrdersPerSlot: options.maxOrdersPerSlot,
      bookingDaysAhead: options.bookingDaysAhead,
      pickupAddress: options.pickupAddress,
    },
  });
}

async function readConfigFromDb(): Promise<DeliveryConfig | null> {
  const prisma = getPrisma();
  const [zones, schedules, options] = await Promise.all([
    prisma.deliveryZone.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.deliverySchedule.findMany(),
    readOptionsFromDb(),
  ]);

  if (zones.length === 0 && schedules.length === 0) return null;

  return {
    zones: zones.map(toZoneConfig),
    schedules: schedules.map(toScheduleConfig),
    options: options ?? defaultOptions(),
  };
}

async function writeConfigToDb(config: DeliveryConfig): Promise<void> {
  const prisma = getPrisma();

  await prisma.$transaction([
    prisma.deliveryZone.deleteMany(),
    prisma.deliverySchedule.deleteMany(),
  ]);

  if (config.zones.length > 0) {
    await prisma.deliveryZone.createMany({
      data: config.zones.map((z) => ({
        id: z.id,
        name: z.name,
        cost: z.cost,
        isActive: z.isActive,
        createdAt: new Date(z.createdAt),
        updatedAt: new Date(z.updatedAt),
      })),
    });
  }

  if (config.schedules.length > 0) {
    await prisma.deliverySchedule.createMany({
      data: config.schedules.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDuration: s.slotDuration,
        type: s.type,
        isActive: s.isActive,
      })),
    });
  }

  await writeOptionsToDb(config.options ?? defaultOptions());
}

export async function getDeliveryConfig(): Promise<DeliveryConfig> {
  return getCachedDeliveryConfig();
}

const getCachedDeliveryConfig = unstable_cache(
  async (): Promise<DeliveryConfig> => {
    const fromDb = await readConfigFromDb();
    const config = fromDb ?? createDefaultConfig();

    if (!fromDb) {
      await writeConfigToDb(config);
    }

    return config;
  },
  ["delivery-config-v2"],
  { revalidate: 60, tags: ["delivery-config"] },
);

export async function saveDeliveryConfig(
  config: DeliveryConfig,
): Promise<DeliveryConfig> {
  const withOptions: DeliveryConfig = {
    ...config,
    options: config.options ?? defaultOptions(),
  };
  await writeConfigToDb(withOptions);
  revalidateTag("delivery-config");
  return withOptions;
}

export async function getActiveZones(): Promise<DeliveryZoneConfig[]> {
  const { zones } = await getDeliveryConfig();
  return zones.filter((z) => z.isActive);
}

export async function getZoneById(
  id: string,
): Promise<DeliveryZoneConfig | undefined> {
  const { zones } = await getDeliveryConfig();
  return zones.find((z) => z.id === id);
}

export function createZone(
  config: DeliveryConfig,
  input: Pick<DeliveryZoneConfig, "name" | "cost">,
): DeliveryConfig {
  const timestamp = nowIso();
  const zone: DeliveryZoneConfig = {
    id: randomUUID(),
    name: input.name,
    cost: input.cost,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return {
    ...config,
    zones: [...config.zones, zone],
  };
}

export function updateZone(
  config: DeliveryConfig,
  zoneId: string,
  patch: Partial<Pick<DeliveryZoneConfig, "name" | "cost" | "isActive">>,
): DeliveryConfig {
  return {
    ...config,
    zones: config.zones.map((z) =>
      z.id === zoneId ? { ...z, ...patch, updatedAt: nowIso() } : z,
    ),
  };
}

export function upsertSchedules(
  config: DeliveryConfig,
  schedules: DeliveryScheduleConfig[],
): DeliveryConfig {
  const byId = new Map(config.schedules.map((s) => [s.id, s]));
  for (const schedule of schedules) {
    byId.set(schedule.id, schedule);
  }
  return { ...config, schedules: Array.from(byId.values()) };
}
