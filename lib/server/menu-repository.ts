import { randomUUID } from "crypto";
import type { MenuStatus as PrismaMenuStatus } from "@prisma/client";

import { getAdminCatalog } from "@/lib/server/admin-catalog-repository";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import {
  addShopDays,
  getShopDateKey,
  isTodayAtShop,
  NEXT_DAY_ORDERING_OPENS_AT,
  shopDateTimeToUtc,
} from "@/lib/business-date";
import { getPrisma } from "@/lib/prisma";
import type { MenuStatus, ScheduledMenu } from "@/types/menu";
import type { Product } from "@/types/product";

// Pas de cache mémoire process (globalThis) ici volontairement : sur Vercel,
// chaque instance aurait sa propre copie et pourrait continuer à servir un
// ancien menu après une modification admin ou une activation ailleurs. Le
// volume (quelques menus programmés) rend une lecture DB directe négligeable.

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

/**
 * Minuit du jour boutique, en UTC. `setHours(0,0,0,0)` donnait minuit dans le
 * fuseau du *serveur* — soit 01 h à Cotonou sur Vercel (UTC), d'où les dates de
 * menu à 01:00, 12:00 ou 23:00 observées en base.
 */
function shopMidnight(date: Date | string): string {
  return shopDateTimeToUtc(getShopDateKey(date), "00:00").toISOString();
}

/**
 * Ouverture d'un menu : 20 h (heure boutique) LA VEILLE du jour servi.
 *
 * Deux bugs corrigés ici :
 *  - `setHours` utilisait le fuseau serveur (20 h UTC = 21 h à Cotonou) ;
 *  - l'heure d'ouverture était posée le jour même du menu, donc un menu du
 *    jour J s'ouvrait à 20 h de J — après la fermeture de la boutique (19 h).
 *    La règle métier est bien « le menu du lendemain s'ouvre à 20 h la veille »
 *    (NEXT_DAY_ORDERING_OPENS_AT), alignée sur isNextDayOrderingOpen().
 */
function defaultActivateAt(menuDate: Date | string): string {
  const eve = addShopDays(getShopDateKey(menuDate), -1);
  return shopDateTimeToUtc(
    eve,
    `${String(NEXT_DAY_ORDERING_OPENS_AT).padStart(2, "0")}:00`,
  ).toISOString();
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

  const todayKey = getShopDateKey();
  const tomorrowKey = addShopDays(todayKey, 1);

  const active: ScheduledMenu = {
    id: randomUUID(),
    date: shopMidnight(new Date()),
    // Le menu du jour est déjà ouvert : son heure d'ouverture est passée.
    activateAt: defaultActivateAt(todayKey),
    status: "active",
    productIds,
    displayOrder,
    dailyStock,
    createdAt: new Date().toISOString(),
  };

  const scheduled: ScheduledMenu = {
    id: randomUUID(),
    date: shopDateTimeToUtc(tomorrowKey, "00:00").toISOString(),
    activateAt: defaultActivateAt(tomorrowKey),
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
  const fromDb = await readMenusFromDb();
  const menus = fromDb ?? (await seedMenus());
  if (!fromDb) await writeMenusToDb(menus);
  return menus;
}

async function saveMenus(menus: ScheduledMenu[]): Promise<void> {
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
  return updated;
}

export async function duplicateMenu(
  id: string,
  targetDate?: Date,
): Promise<ScheduledMenu> {
  const source = await getMenuById(id);
  if (!source) throw new Error("Menu introuvable");

  // Par défaut : le lendemain (jour boutique), ouvert à 20 h ce soir.
  const dateKey = targetDate
    ? getShopDateKey(targetDate)
    : addShopDays(getShopDateKey(), 1);

  return createMenu({
    date: shopDateTimeToUtc(dateKey, "00:00").toISOString(),
    activateAt: defaultActivateAt(dateKey),
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

/**
 * Active les menus dus — updates ciblés uniquement (pas de réécriture de toute
 * la table) : évite qu'une activation concurrente à une édition admin écrase
 * le travail de l'autre.
 */
export async function activateDueMenus(): Promise<ScheduledMenu[]> {
  try {
    const prisma = getPrisma();
    const now = new Date();

    const dueRows = await prisma.menu.findMany({
      where: { status: "SCHEDULED", activateAt: { lte: now } },
      orderBy: { activateAt: "asc" },
    });

    if (dueRows.length === 0) return [];

    const due = dueRows.map(toScheduledMenu);
    // S'il y a plusieurs menus en retard (ex. serveur arrêté un moment), seul
    // le plus récent reste actif — même comportement qu'avant, juste sans
    // réécrire toute la table pour y arriver.
    const last = due[due.length - 1]!;
    const earlier = due.slice(0, -1);

    await prisma.$transaction([
      prisma.menu.updateMany({
        where: { status: "ACTIVE" },
        data: { status: "EXPIRED" },
      }),
      ...(earlier.length > 0
        ? [
            prisma.menu.updateMany({
              where: { id: { in: earlier.map((m) => m.id) } },
              data: { status: toPrismaStatus("expired") },
            }),
          ]
        : []),
      prisma.menu.update({
        where: { id: last.id },
        data: { status: toPrismaStatus("active") },
      }),
    ]);

    const activated: ScheduledMenu[] = due.map((m) => ({
      ...m,
      status: m.id === last.id ? "active" : "expired",
    }));

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
