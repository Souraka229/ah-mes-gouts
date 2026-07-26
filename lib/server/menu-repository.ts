import { randomUUID } from "crypto";
import type { MenuStatus as PrismaMenuStatus } from "@prisma/client";

import { getAdminCatalog } from "@/lib/server/admin-catalog-repository";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isTodayAtShop } from "@/lib/business-date";
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
  dailyStock: number[];
  createdAt: Date;
}): ScheduledMenu {
  return {
    id: row.id,
    date: row.date.toISOString(),
    activateAt: row.activateAt.toISOString(),
    status: fromPrismaStatus(row.status),
    productIds: row.productIds,
    displayOrder: row.displayOrder,
    dailyStock: row.dailyStock,
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
    dailyStock: menu.dailyStock,
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
  const selected = catalog
    .filter((p) => !p.isGiftCard && p.slug !== "carte-cadeau")
    .slice(0, 8);
  const productIds = selected.map((p) => p.id);
  const displayOrder = productIds.map((_, i) => i);
  // Stock du jour par défaut = stock actuel du produit.
  const dailyStock = selected.map((p) => p.stockRemaining);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active: ScheduledMenu = {
    id: randomUUID(),
    date: today.toISOString(),
    activateAt: defaultActivateAt(today, 8, 0),
    status: "active",
    productIds,
    displayOrder,
    dailyStock,
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
    dailyStock: [...dailyStock],
    createdAt: new Date().toISOString(),
  };

  return [active, scheduled];
}

async function readMenusFromDb(): Promise<ScheduledMenu[] | null> {
  try {
    const prisma = getPrisma();
    const rows = await prisma.menu.findMany({ orderBy: { activateAt: "desc" } });
    if (rows.length === 0) return null;
    return rows.map(toScheduledMenu);
  } catch {
    return null;
  }
}

async function writeMenusToDb(menus: ScheduledMenu[]): Promise<void> {
  try {
    const prisma = getPrisma();
    await prisma.$transaction([
      prisma.menu.deleteMany(),
      prisma.menu.createMany({ data: menus.map(toMenuRow) }),
    ]);
  } catch {
    // Mode dégradé sans Postgres
  }
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
  dailyStock?: number[];
}): Promise<ScheduledMenu> {
  const menu: ScheduledMenu = {
    id: randomUUID(),
    date: input.date,
    activateAt: input.activateAt,
    status: "scheduled",
    productIds: input.productIds,
    displayOrder: input.displayOrder,
    // Par défaut : pas de cible de stock (0 = illimité, on ne réinitialise pas).
    dailyStock: input.dailyStock ?? input.productIds.map(() => 0),
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
      "date" | "activateAt" | "productIds" | "displayOrder" | "status" | "dailyStock"
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
    dailyStock: [...source.dailyStock],
  });
}

/**
 * Recharge le stock du jour : pour chaque produit du menu ayant une quantité
 * cible définie (`dailyStock`), on remet `stockRemaining` à cette valeur.
 * Une quantité ≤ 0 est ignorée (produit non piloté par le stock du jour).
 */
async function resetDailyStock(menu: ScheduledMenu): Promise<void> {
  const targets = menu.productIds
    .map((productId, i) => ({ productId, quantity: menu.dailyStock[i] ?? 0 }))
    .filter((t) => t.quantity > 0);

  if (targets.length === 0) return;

  const prisma = getPrisma();
  await prisma.$transaction(
    targets.map((t) =>
      prisma.product.update({
        where: { id: t.productId },
        data: { stockRemaining: t.quantity },
      }),
    ),
  );
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

    // Chaque menu qui s'active remet le stock du jour au plein.
    for (const menu of activated) {
      try {
        await resetDailyStock(menu);
      } catch {
        // Produit hors base / erreur ponctuelle : on n'empêche pas l'activation.
      }
    }

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
  } catch {
    return [];
  }
}

export async function getShopProductsFromActiveMenu(): Promise<Product[]> {
  try {
    await activateDueMenus();
  } catch {
    // ignore — fallback mock / catalogue
  }
  const catalog = await getAdminCatalog();
  const active = await getActiveMenu();

  if (!active || !isTodayAtShop(active.date)) {
    return [];
  }

  if (active.productIds.length === 0) {
    return [];
  }

  // Résolution robuste : par ID puis par slug. Après un reseed, les IDs du
  // menu (ex. "6") peuvent ne plus correspondre aux IDs catalogue (UUID) —
  // le repli par slug évite un menu du jour vide.
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const ordered: Product[] = [];

  const pairs = active.productIds.map((id, i) => ({
    id,
    order: active.displayOrder[i] ?? i,
  }));
  pairs.sort((a, b) => a.order - b.order);

  for (const { id } of pairs) {
    const product = byId.get(id) ?? bySlug.get(id);
    if (product) {
      ordered.push({ ...product, isMenuDuJour: true });
    }
  }

  return ordered;
}

export async function reseedMenus(): Promise<ScheduledMenu[]> {
  const menus = await seedMenus();
  await saveMenus(menus);
  return menus;
}
