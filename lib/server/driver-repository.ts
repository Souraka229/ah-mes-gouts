import { randomUUID } from "crypto";

import { getPrisma } from "@/lib/prisma";
import { parseOrderFlags } from "@/lib/orders/order-flags";
import { getShopDayBounds } from "@/lib/business-date";
import {
  isBulkAreasLabel,
  resolveDeliveryDisplayName,
} from "@/lib/delivery-zones";
import type {
  DriverHistoryAction,
  DriverHistoryData,
  DriverHistoryOrder,
} from "@/types/driver";

export type DriverRecord = {
  id: string;
  name: string;
  phone: string;
  accessToken: string;
  isActive: boolean;
  createdAt: string;
};

function mapDriver(row: {
  id: string;
  name: string;
  phone: string;
  accessToken: string;
  isActive: boolean;
  createdAt: Date;
}): DriverRecord {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    accessToken: row.accessToken,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listDrivers(): Promise<DriverRecord[]> {
  const prisma = getPrisma();
  const rows = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapDriver);
}

export async function getActiveDrivers(): Promise<DriverRecord[]> {
  const prisma = getPrisma();
  const rows = await prisma.driver.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return rows.map(mapDriver);
}

export async function getDriverByAccessToken(
  accessToken: string,
): Promise<DriverRecord | undefined> {
  const prisma = getPrisma();
  const row = await prisma.driver.findUnique({
    where: { accessToken },
  });
  return row ? mapDriver(row) : undefined;
}

export async function createDriver(input: {
  name: string;
  phone: string;
}): Promise<DriverRecord> {
  const prisma = getPrisma();
  const row = await prisma.driver.create({
    data: {
      id: randomUUID(),
      name: input.name.trim(),
      phone: input.phone.trim(),
      accessToken: randomUUID(),
    },
  });
  return mapDriver(row);
}

export async function setDriverActive(
  driverId: string,
  isActive: boolean,
): Promise<DriverRecord | undefined> {
  const prisma = getPrisma();
  try {
    const row = await prisma.driver.update({
      where: { id: driverId },
      data: { isActive },
    });
    return mapDriver(row);
  } catch {
    return undefined;
  }
}

export async function regenerateDriverToken(
  driverId: string,
): Promise<DriverRecord | undefined> {
  const prisma = getPrisma();
  try {
    const row = await prisma.driver.update({
      where: { id: driverId },
      data: { accessToken: randomUUID() },
    });
    return mapDriver(row);
  } catch {
    return undefined;
  }
}

/** Nombre de livraisons assignées au livreur pour aujourd'hui (hors annulées). */
export async function countDriverDeliveriesToday(
  driverId: string,
): Promise<number> {
  const prisma = getPrisma();
  const { start, end } = getShopDayBounds();
  return prisma.order.count({
    where: {
      driverId,
      fulfillmentType: "delivery",
      scheduledSlotStart: {
        gte: start,
        lte: end,
      },
      status: { not: "ANNULEE" },
    },
  });
}

export async function listDriversWithTodayCounts(): Promise<
  Array<
    DriverRecord & {
      deliveriesToday: number;
      totalDeliveries: number;
      lastOrderAt: string | null;
    }
  >
> {
  const drivers = await listDrivers();
  if (drivers.length === 0) return [];

  const prisma = getPrisma();
  const driverIds = drivers.map((driver) => driver.id);
  const { start, end } = getShopDayBounds();
  const baseWhere = {
    driverId: { in: driverIds },
    fulfillmentType: "delivery",
    status: { not: "ANNULEE" as const },
  };
  const [totals, today] = await Promise.all([
    prisma.order.groupBy({
      by: ["driverId"],
      where: baseWhere,
      _count: { id: true },
      _max: {
        driverDeliveredAt: true,
        driverStartedAt: true,
        updatedAt: true,
      },
    }),
    prisma.order.groupBy({
      by: ["driverId"],
      where: {
        ...baseWhere,
        scheduledSlotStart: { gte: start, lte: end },
      },
      _count: { id: true },
    }),
  ]);

  const totalByDriver = new Map(totals.map((row) => [row.driverId, row]));
  const todayByDriver = new Map(
    today.map((row) => [row.driverId, row._count.id]),
  );

  return drivers.map((driver) => {
    const total = totalByDriver.get(driver.id);
    const lastOrderAt = total
      ? latestDate([
          total._max.driverDeliveredAt,
          total._max.driverStartedAt,
          total._max.updatedAt,
        ])
      : null;
    return {
      ...driver,
      deliveriesToday: todayByDriver.get(driver.id) ?? 0,
      totalDeliveries: total?._count.id ?? 0,
      lastOrderAt: lastOrderAt?.toISOString() ?? null,
    };
  });
}

function latestDate(values: Array<Date | null | undefined>): Date | null {
  const dates = values.filter((value): value is Date => value instanceof Date);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function durationMinutes(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function orderToHistory(row: {
  id: string;
  status: string;
  clientFirstName: string;
  clientLastName: string;
  zoneId: string | null;
  zoneName: string | null;
  clientLandmark: string | null;
  total: number;
  createdAt: Date;
  scheduledSlotStart: Date | null;
  driverStartedAt: Date | null;
  driverDeliveredAt: Date | null;
  clientMessage: string | null;
}): DriverHistoryOrder {
  const flags = parseOrderFlags(row.clientMessage);
  return {
    id: row.id,
    status: row.status.toLowerCase(),
    clientName:
      `${row.clientFirstName} ${row.clientLastName}`.trim() || "Client",
    zoneName: resolveDeliveryDisplayName(
      row.zoneId,
      isBulkAreasLabel(row.zoneName) ? null : row.zoneName,
      row.clientLandmark,
    ),
    total: row.total,
    createdAt: row.createdAt.toISOString(),
    scheduledSlotStart: row.scheduledSlotStart?.toISOString() ?? null,
    startedAt: row.driverStartedAt?.toISOString() ?? null,
    deliveredAt: row.driverDeliveredAt?.toISOString() ?? null,
    unreachableAt: flags.unreachableAt,
    durationMinutes: durationMinutes(
      row.driverStartedAt,
      row.driverDeliveredAt,
    ),
  };
}

function derivedActions(orders: DriverHistoryOrder[]): DriverHistoryAction[] {
  return orders
    .flatMap((order) => {
      const actions: DriverHistoryAction[] = [];
      if (order.startedAt) {
        actions.push({
          id: `${order.id}-started`,
          orderId: order.id,
          action: "started",
          label: `Départ pour la commande ${order.id}`,
          createdAt: order.startedAt,
        });
      }
      if (order.unreachableAt) {
        actions.push({
          id: `${order.id}-unreachable`,
          orderId: order.id,
          action: "unreachable",
          label: `Client injoignable — commande ${order.id}`,
          createdAt: order.unreachableAt,
        });
      }
      if (order.deliveredAt) {
        actions.push({
          id: `${order.id}-delivered`,
          orderId: order.id,
          action: "delivered",
          label: `Commande ${order.id} livrée`,
          createdAt: order.deliveredAt,
        });
      }
      return actions;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function getDriverHistory(
  driverId: string,
  page = 1,
  pageSize = 20,
): Promise<DriverHistoryData | null> {
  const prisma = getPrisma();
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(10, pageSize));

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return null;

  const where = {
    driverId,
    fulfillmentType: "delivery",
    status: { not: "ANNULEE" as const },
  };

  const [rows, statusGroups, aggregate, avgRows, loggedActions] =
    await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        select: {
          id: true,
          status: true,
          clientFirstName: true,
          clientLastName: true,
          zoneId: true,
          zoneName: true,
          clientLandmark: true,
          total: true,
          createdAt: true,
          scheduledSlotStart: true,
          driverStartedAt: true,
          driverDeliveredAt: true,
          clientMessage: true,
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where,
        _max: {
          driverDeliveredAt: true,
          driverStartedAt: true,
          updatedAt: true,
        },
      }),
      prisma.$queryRaw<Array<{ avg_min: number | null }>>`
        SELECT AVG(
          EXTRACT(EPOCH FROM ("driverDeliveredAt" - "driverStartedAt")) / 60.0
        )::float AS avg_min
        FROM "Order"
        WHERE "driverId" = ${driverId}
          AND "fulfillmentType" = 'delivery'
          AND status = 'LIVREE'
          AND "driverStartedAt" IS NOT NULL
          AND "driverDeliveredAt" IS NOT NULL
      `,
      prisma.adminActionLog.findMany({
        where: {
          source: "driver",
          details: { path: ["driverId"], equals: driverId },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
    ]);

  const countByStatus = new Map(
    statusGroups.map((row) => [row.status, row._count._all]),
  );
  const totalItems = [...countByStatus.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  const deliveredOrders = countByStatus.get("LIVREE") ?? 0;
  const activeOrders =
    (countByStatus.get("PRETE") ?? 0) +
    (countByStatus.get("EN_LIVRAISON") ?? 0);

  const orders = rows.map(orderToHistory);
  const lastOrderAt = latestDate([
    aggregate._max.driverDeliveredAt,
    aggregate._max.driverStartedAt,
    aggregate._max.updatedAt,
  ]);
  const averageDeliveryMinutes =
    avgRows[0]?.avg_min != null ? Math.round(avgRows[0].avg_min) : null;

  const persistedActions: DriverHistoryAction[] = loggedActions.map((entry) => {
    const details =
      entry.details &&
      typeof entry.details === "object" &&
      !Array.isArray(entry.details)
        ? (entry.details as Record<string, unknown>)
        : {};
    const action =
      entry.action === "started" ||
      entry.action === "unreachable" ||
      entry.action === "delivered" ||
      entry.action === "assigned"
        ? entry.action
        : "status";
    return {
      id: entry.id,
      orderId: typeof details.orderId === "string" ? details.orderId : null,
      action,
      label: entry.summary,
      createdAt: entry.createdAt.toISOString(),
    };
  });
  const persistedKeys = new Set(
    persistedActions.map(
      (action) => `${action.action}:${action.orderId ?? ""}`,
    ),
  );
  const actions = [
    ...persistedActions,
    ...derivedActions(orders).filter(
      (action) =>
        !persistedKeys.has(`${action.action}:${action.orderId ?? ""}`),
    ),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    driver: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      isActive: driver.isActive,
      createdAt: driver.createdAt.toISOString(),
    },
    summary: {
      totalOrders: totalItems,
      deliveredOrders,
      activeOrders,
      lastOrderAt: lastOrderAt?.toISOString() ?? null,
      averageDeliveryMinutes,
    },
    orders,
    actions,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(totalItems / safePageSize)),
      totalItems,
    },
  };
}

export function getDriverPortalPath(accessToken: string): string {
  return `/livreur/${accessToken}`;
}

export function getDriverFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
