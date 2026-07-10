import { randomUUID } from "crypto";
import type { MenuStatus as PrismaMenuStatus } from "@prisma/client";

import { getAdminCatalog } from "@/lib/server/admin-catalog-repository";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { getPrisma } from "@/lib/prisma";
import type { MenuStatus, ScheduledMenu } from "@/types/menu";
import type { Product } from "@/types/product";

declare global {
  var __amgMenus: ScheduledMenu[] | undefined;
}

function toPrismaStatus(status: MenuStatus): PrismaMenuStatus {
  const map: Record<MenuStatus, PrismaMenuStatus> = {
    scheduled: "SCHEDULED",
    active: "ACTIVE",
    expired: "EXPIRED",
  };
  return map[status];
}

function fromPrismaStatus(status: PrismaMenuStatus): MenuStatus {
  const map: Record<PrismaMenuStatus, MenuStatus> = {
    SCHEDULED: "scheduled",
    ACTIVE: "active",
    EXPIRED: "expired",
  };
  return map[status];
}

function toScheduledMenu(row: {
  id: string;
  date: Date;
  activateAt: Date;
  status: PrismaMenuStatus;
  productIds: string[];
  displayOrder: number[];
  createdAt: Date;
}): ScheduledMenu {
  return {
    id: row.id,
    date: row.date.toISOString(),
    activateAt: row.activateAt.toISOString(),
    status: fromPrismaStatus(row.status),
    productIds: row.productIds,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
  };
}

function toMenuRow(menu: ScheduledMenu) {
  return {
    id: menu.id,
    date: new Date(menu.date),
    activateAt: new Date(menu.activateAt),
    status: toPrismaStatus(menu.status),
    productIds: menu.productIds,
    displayOrder: menu.displayOrder,
    createdAt: new Date(menu.createdAt),
  };
}

function defaultActivateAt(date: Date, hour = 20, minute = 0): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function seedMenus(): Promise<ScheduledMenu[]> {
  const catalog = await getAdminCatalog();
  const productIds = catalog
    .filter((p) => !p.isGiftCard && p.slug !== "carte-cadeau")
    .slice(0, 8)
    .map((p) => p.id);
  const displayOrder = productIds.map((_, i) => i);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active: ScheduledMenu = {
    id: randomUUID(),
    date: today.toISOString(),
    activateAt: defaultActivateAt(today, 8, 0),
    status: "active",
    productIds,
    displayOrder,
    createdAt: new Date().toISOString(),
  };

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const scheduled: ScheduledMenu = {
    id: randomUUID(),
    date: tomorrow.toISOString(),
    activateAt: defaultActivateAt(tomorrow, 20, 0),
    status: "scheduled",
    productIds: [...productIds],
    displayOrder: [...displayOrder],
    createdAt: new Date().toISOString(),
  };

  return [active, scheduled];
}

async function readMenusFromDb(): Promise<ScheduledMenu[] | null> {
  const prisma = getPrisma();
  const rows = await prisma.menu.findMany({ orderBy: { activateAt: "desc" } });
  if (rows.length === 0) return null;
  return rows.map(toScheduledMenu);
}

async function writeMenusToDb(menus: ScheduledMenu[]): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.menu.deleteMany(),
    prisma.menu.createMany({ data: menus.map(toMenuRow) }),
  ]);
}

export async function getAllMenus(): Promise<ScheduledMenu[]> {
  if (globalThis.__amgMenus) return globalThis.__amgMenus;
  const fromDb = await readMenusFromDb();
  const menus = fromDb ?? (await seedMenus());
  if (!fromDb) await writeMenusToDb(menus);
  globalThis.__amgMenus = menus;
  return menus;
}

async function saveMenus(menus: ScheduledMenu[]): Promise<void> {
  globalThis.__amgMenus = menus;
  await writeMenusToDb(menus);
}

export async function getMenuById(id: string): Promise<ScheduledMenu | undefined> {
  const menus = await getAllMenus();
  return menus.find((m) => m.id === id);
}

export async function getActiveMenu(): Promise<ScheduledMenu | undefined> {
  const menus = await getAllMenus();
  return menus.find((m) => m.status === "active");
}

export async function getNextScheduledMenu(): Promise<ScheduledMenu | undefined> {
  const menus = await getAllMenus();
  const now = Date.now();
  return menus
    .filter((m) => m.status === "scheduled" && new Date(m.activateAt).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.activateAt).getTime() - new Date(b.activateAt).getTime(),
    )[0];
}

export async function createMenu(input: {
  date: string;
  activateAt: string;
  productIds: string[];
  displayOrder: number[];
}): Promise<ScheduledMenu> {
  const menu: ScheduledMenu = {
    id: randomUUID(),
    date: input.date,
    activateAt: input.activateAt,
    status: "scheduled",
    productIds: input.productIds,
    displayOrder: input.displayOrder,
    createdAt: new Date().toISOString(),
  };

  const prisma = getPrisma();
  await prisma.menu.create({ data: toMenuRow(menu) });
  globalThis.__amgMenus = undefined;
  return menu;
}

export async function updateMenu(
  id: string,
  patch: Partial<
    Pick<
      ScheduledMenu,
      "date" | "activateAt" | "productIds" | "displayOrder" | "status"
    >
  >,
  options?: { forceActiveEdit?: boolean },
): Promise<ScheduledMenu> {
  const menus = await getAllMenus();
  const index = menus.findIndex((m) => m.id === id);
  if (index < 0) throw new Error("Menu introuvable");

  const current = menus[index]!;
  if (current.status === "active" && !options?.forceActiveEdit) {
    throw new Error("MENU_ACTIVE_LOCKED");
  }
  if (current.status === "expired") {
    throw new Error("MENU_EXPIRED");
  }

  const updated = { ...current, ...patch };
  const prisma = getPrisma();
  await prisma.menu.update({
    where: { id },
    data: toMenuRow(updated),
  });
  globalThis.__amgMenus = undefined;
  return updated;
}

export async function duplicateMenu(
  id: string,
  targetDate?: Date,
): Promise<ScheduledMenu> {
  const source = await getMenuById(id);
  if (!source) throw new Error("Menu introuvable");

  const date = targetDate ?? new Date();
  if (!targetDate) {
    date.setDate(date.getDate() + 1);
  }
  date.setHours(0, 0, 0, 0);

  return createMenu({
    date: date.toISOString(),
    activateAt: defaultActivateAt(date, 20, 0),
    productIds: [...source.productIds],
    displayOrder: [...source.displayOrder],
  });
}

export async function activateDueMenus(): Promise<ScheduledMenu[]> {
  try {
    const menus = await getAllMenus();
    const now = new Date();
    const due = menus.filter(
      (m) => m.status === "scheduled" && new Date(m.activateAt) <= now,
    );

    if (due.length === 0) return [];

    const activated: ScheduledMenu[] = [];

    for (const menu of due.sort(
      (a, b) => new Date(a.activateAt).getTime() - new Date(b.activateAt).getTime(),
    )) {
      for (const m of menus) {
        if (m.status === "active") m.status = "expired";
      }
      const index = menus.findIndex((m) => m.id === menu.id);
      if (index >= 0) {
        menus[index] = { ...menus[index]!, status: "active" };
        activated.push(menus[index]!);
      }
    }

    await saveMenus(menus);

    for (const menu of activated) {
      await appendAdminActionLog({
        adminName: "Système",
        source: "manual",
        action: "menu_activated",
        summary: `Menu activé automatiquement (${new Date(menu.date).toLocaleDateString("fr-FR")})`,
        details: { menuId: menu.id, productCount: menu.productIds.length },
      });
    }

    return activated;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur activation menus";
    throw new Error(`Activation menu programmé impossible : ${message}`);
  }
}

export async function getShopProductsFromActiveMenu(): Promise<Product[]> {
  await activateDueMenus();
  const catalog = await getAdminCatalog();
  const active = await getActiveMenu();

  if (!active || active.productIds.length === 0) {
    const { products } = await import("@/lib/mock-data");
    return products;
  }

  const byId = new Map(catalog.map((p) => [p.id, p]));
  const ordered: Product[] = [];

  const pairs = active.productIds.map((id, i) => ({
    id,
    order: active.displayOrder[i] ?? i,
  }));
  pairs.sort((a, b) => a.order - b.order);

  for (const { id } of pairs) {
    const product = byId.get(id);
    if (product) {
      ordered.push({ ...product, isMenuDuJour: true });
    }
  }

  return ordered.length > 0 ? ordered : (await import("@/lib/mock-data")).products;
}

export async function reseedMenus(): Promise<ScheduledMenu[]> {
  const menus = await seedMenus();
  await saveMenus(menus);
  return menus;
}
