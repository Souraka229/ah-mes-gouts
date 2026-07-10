import { randomUUID } from "crypto";

import { getPrisma } from "@/lib/prisma";

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

export function getDriverPortalPath(accessToken: string): string {
  return `/livreur/${accessToken}`;
}

export function getDriverFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
