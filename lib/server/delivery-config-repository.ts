import { randomUUID } from "crypto";

import type {
  DeliveryConfig,
  DeliveryScheduleConfig,
  DeliveryZoneConfig,
  FulfillmentType,
} from "@/lib/delivery/types";
import { getPrisma } from "@/lib/prisma";

declare global {
  var __amgDeliveryConfig: DeliveryConfig | undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultSchedulesForType(type: FulfillmentType): DeliveryScheduleConfig[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    id: randomUUID(),
    dayOfWeek,
    startTime: "10:00",
    endTime: "21:00",
    slotDuration: 30,
    type,
    isActive: dayOfWeek !== 0,
  }));
}

function createDefaultConfig(): DeliveryConfig {
  const timestamp = nowIso();
  const zones: DeliveryZoneConfig[] = [
    {
      id: randomUUID(),
      name: "Fidjrossè & bord de mer",
      cost: 500,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: randomUUID(),
      name: "Agla & Godomey",
      cost: 700,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: randomUUID(),
      name: "Guinkomey & Tokpa",
      cost: 800,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: randomUUID(),
      name: "Cadjehoun & Haie Vive",
      cost: 1000,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: randomUUID(),
      name: "Abomey-Calavi & périphérie",
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

async function readConfigFromDb(): Promise<DeliveryConfig | null> {
  const prisma = getPrisma();
  const [zones, schedules] = await Promise.all([
    prisma.deliveryZone.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.deliverySchedule.findMany(),
  ]);

  if (zones.length === 0 && schedules.length === 0) return null;

  return {
    zones: zones.map(toZoneConfig),
    schedules: schedules.map(toScheduleConfig),
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
}

export async function getDeliveryConfig(): Promise<DeliveryConfig> {
  if (globalThis.__amgDeliveryConfig) {
    return globalThis.__amgDeliveryConfig;
  }

  const fromDb = await readConfigFromDb();
  const config = fromDb ?? createDefaultConfig();

  if (!fromDb) {
    await writeConfigToDb(config);
  }

  globalThis.__amgDeliveryConfig = config;
  return config;
}

export async function saveDeliveryConfig(
  config: DeliveryConfig,
): Promise<DeliveryConfig> {
  globalThis.__amgDeliveryConfig = config;
  await writeConfigToDb(config);
  return config;
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
