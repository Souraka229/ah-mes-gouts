import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import type { StockClaim } from "@/lib/server/order-pricing";
import { getPrisma } from "@/lib/prisma";
import { buildDemoOrders } from "@/lib/server/demo-orders";
import {
  getPendingPaymentCutoff,
  isPendingPaymentExpired,
} from "@/lib/orders/payment-expiration";
import {
  fromPrismaOrder,
  fromPrismaOrderStatus,
  toPrismaOrderCreateInput,
  toPrismaOrderStatus,
} from "@/lib/server/order-mapper";
import { withRetry } from "@/lib/server/retry";
import {
  assertDriverTransition,
  canDriverMarkDelivered,
  canDriverStartDelivery,
} from "@/lib/orders/status-machine";
import { markUnreachable, parseOrderFlags } from "@/lib/orders/order-flags";
import type { DriverOrderView } from "@/types/driver";
import type { OrderStatus, SavedOrder } from "@/types/order";

/**
 * Persiste une commande en base Postgres (Prisma) — jamais de fichier local.
 */
export async function saveServerOrder(order: SavedOrder): Promise<void> {
  const prisma = getPrisma();
  const data = toPrismaOrderCreateInput(order);

  try {
    await prisma.order.create({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Persistance commande échouée";
    throw new Error(`Impossible d'enregistrer la commande : ${message}`);
  }
}

export async function saveServerOrderWithRetry(
  order: SavedOrder,
): Promise<void> {
  await withRetry(async () => saveServerOrder(order), {
    label: "saveServerOrder",
    maxAttempts: 3,
    baseDelayMs: 200,
  });
}

/** Créneau complet — erreur métier lors de la réservation atomique. */
export class SlotFullError extends Error {
  constructor() {
    super("Ce créneau est complet.");
    this.name = "SlotFullError";
  }
}

/**
 * Insert commande + vérif capacité créneau en une transaction Serializable.
 * Remplace reserveSlot() en RAM — safe multi-instance Vercel.
 */
export async function saveServerOrderWithSlotReservation(
  order: SavedOrder,
  slot: {
    scheduledSlotStart: Date;
    fulfillmentType: string;
    maxOrdersPerSlot: number;
  },
): Promise<void> {
  const prisma = getPrisma();
  const data = toPrismaOrderCreateInput(order);

  await prisma.$transaction(
    async (tx) => {
      const count = await tx.order.count({
        where: {
          scheduledSlotStart: slot.scheduledSlotStart,
          fulfillmentType: slot.fulfillmentType,
          OR: [
            { status: { notIn: ["RECUE", "ANNULEE"] } },
            {
              status: "RECUE",
              createdAt: { gt: getPendingPaymentCutoff() },
            },
          ],
        },
      });

      if (count >= slot.maxOrdersPerSlot) {
        throw new SlotFullError();
      }

      await tx.order.create({ data });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/** Stock insuffisant à la création — erreur métier, jamais réessayée. */
export class OrderStockError extends Error {
  readonly issues: { name: string; message: string }[];

  constructor(issues: { name: string; message: string }[]) {
    super("Stock insuffisant");
    this.name = "OrderStockError";
    this.issues = issues;
  }
}

/**
 * Crée la commande et décrémente le stock DANS LA MÊME TRANSACTION.
 * Le décrément conditionnel (`stockRemaining >= quantity`) est atomique :
 * il ferme la fenêtre TOCTOU entre la vérification et l'écriture.
 * Les produits absents de la base (catalogue mock/fallback) ne sont pas suivis.
 */
export async function createServerOrderWithStock(
  order: SavedOrder,
  stockClaims: StockClaim[],
): Promise<void> {
  const prisma = getPrisma();
  const data = toPrismaOrderCreateInput(order);

  await prisma.$transaction(async (tx) => {
    for (const claim of stockClaims) {
      if (claim.unlimitedStock) continue;

      const tracked = await tx.product.findUnique({
        where: { slug: claim.slug },
        select: { id: true },
      });
      if (!tracked) continue;

      const result = await tx.product.updateMany({
        where: { slug: claim.slug, stockRemaining: { gte: claim.quantity } },
        data: { stockRemaining: { decrement: claim.quantity } },
      });

      if (result.count === 0) {
        throw new OrderStockError([
          {
            name: claim.name,
            message: "Ce produit vient d'être épuisé.",
          },
        ]);
      }
    }

    await tx.order.create({ data });
  });
}

/**
 * Confirme le paiement : décrémente le stock et passe la commande en PAIEMENT_CONFIRME.
 * Idempotent si déjà confirmée.
 */
export async function confirmServerOrderPayment(
  orderId: string,
  stockClaims: StockClaim[],
  paymentReference?: string,
): Promise<SavedOrder | undefined> {
  const prisma = getPrisma();

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, driver: { select: { name: true } } },
      });

      if (!existing) return undefined;

      const currentStatus = fromPrismaOrderStatus(existing.status);
      if (currentStatus !== "recue") {
        return fromPrismaOrder(existing);
      }

      if (isPendingPaymentExpired(existing.createdAt)) {
        const expired = await tx.order.update({
          where: { id: orderId },
          data: { status: toPrismaOrderStatus("annulee") },
          include: { items: true, driver: { select: { name: true } } },
        });
        return fromPrismaOrder(expired);
      }

      for (const claim of stockClaims) {
        if ("unlimitedStock" in claim && claim.unlimitedStock) continue;

        const tracked = await tx.product.findUnique({
          where: { slug: claim.slug },
          select: { id: true },
        });
        if (!tracked) continue;

        const result = await tx.product.updateMany({
          where: { slug: claim.slug, stockRemaining: { gte: claim.quantity } },
          data: { stockRemaining: { decrement: claim.quantity } },
        });

        if (result.count === 0) {
          throw new OrderStockError([
            {
              name: claim.name,
              message: "Ce produit vient d'être épuisé.",
            },
          ]);
        }
      }

      const row = await tx.order.update({
        where: { id: orderId },
        data: {
          status: toPrismaOrderStatus("paiement_confirme"),
          ...(paymentReference ? { paymentReference } : {}),
        },
        include: { items: true, driver: { select: { name: true } } },
      });

      return fromPrismaOrder(row);
    });
  } catch (error) {
    if (error instanceof OrderStockError) {
      throw error;
    }
    return undefined;
  }
}

export async function getServerOrder(
  orderId: string,
): Promise<SavedOrder | undefined> {
  const prisma = getPrisma();
  const row = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, driver: { select: { name: true } } },
  });
  return row ? fromPrismaOrder(row) : undefined;
}

/**
 * Annule paresseusement une commande non payée arrivée à expiration.
 * Le updateMany rend l'opération atomique et sans effet sur une commande payée.
 */
export async function expirePendingOrder(
  orderId: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: "RECUE",
      createdAt: { lte: getPendingPaymentCutoff() },
    },
    data: { status: "ANNULEE" },
  });
  return result.count > 0;
}

export async function expireAllPendingOrders(): Promise<number> {
  const prisma = getPrisma();
  const result = await prisma.order.updateMany({
    where: {
      status: "RECUE",
      createdAt: { lte: getPendingPaymentCutoff() },
    },
    data: { status: "ANNULEE" },
  });
  return result.count;
}

export async function getAllServerOrders(): Promise<SavedOrder[]> {
  return getServerOrdersForAdmin({ limit: 500 });
}

export type AdminOrdersQuery = {
  /** Nombre max de commandes (défaut 100, plafond 200). */
  limit?: number;
  /** Fenêtre glissante en jours (défaut 7). */
  days?: number;
};

/** Liste paginée pour le KDS — évite le full scan sous charge. */
export async function getServerOrdersForAdmin(
  query: AdminOrdersQuery = {},
): Promise<SavedOrder[]> {
  const limit = Math.min(Math.max(query.limit ?? 100, 1), 200);
  const days = Math.min(Math.max(query.days ?? 7, 1), 30);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const prisma = getPrisma();
  await expireAllPendingOrders();
  const rows = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    include: { items: true, driver: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(fromPrismaOrder);
}

export async function updateServerOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra?: {
    driverStartedAt?: Date | null;
    driverDeliveredAt?: Date | null;
  },
): Promise<SavedOrder | undefined> {
  const prisma = getPrisma();

  try {
    const row = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: toPrismaOrderStatus(status),
        ...(extra?.driverStartedAt !== undefined
          ? { driverStartedAt: extra.driverStartedAt }
          : {}),
        ...(extra?.driverDeliveredAt !== undefined
          ? { driverDeliveredAt: extra.driverDeliveredAt }
          : {}),
      },
      include: { items: true, driver: { select: { name: true } } },
    });
    return fromPrismaOrder(row);
  } catch {
    return undefined;
  }
}

export async function assignOrderDriver(
  orderId: string,
  driverId: string | null,
): Promise<SavedOrder | undefined> {
  const prisma = getPrisma();
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) return undefined;

  if (driverId && fromPrismaOrderStatus(existing.status) !== "prete") {
    throw new Error("Assignation possible uniquement sur une commande « Prête ».");
  }

  if (driverId) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, isActive: true },
    });
    if (!driver) throw new Error("Livreur introuvable ou inactif.");
  }

  const row = await prisma.order.update({
    where: { id: orderId },
    data: { driverId },
    include: { items: true, driver: { select: { name: true } } },
  });
  return fromPrismaOrder(row);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getDriverOrdersForToday(
  driverId: string,
): Promise<DriverOrderView[]> {
  const prisma = getPrisma();
  const rows = await prisma.order.findMany({
    where: {
      driverId,
      status: { in: ["PRETE", "EN_LIVRAISON"] },
      scheduledSlotStart: {
        gte: startOfToday(),
        lte: endOfToday(),
      },
      fulfillmentType: "delivery",
    },
    orderBy: { scheduledSlotStart: "asc" },
  });

  return rows.map((row) => toDriverOrderView(row));
}

function toDriverOrderView(
  row: import("@prisma/client").Order,
): DriverOrderView {
  const status = fromPrismaOrderStatus(row.status);
  const address =
    row.isGift && row.recipientAddress
      ? row.recipientAddress
      : row.clientAddress ?? "";
  const landmark =
    row.isGift && row.recipientLandmark
      ? row.recipientLandmark
      : row.clientLandmark;
  const phone =
    row.isGift && row.recipientPhone ? row.recipientPhone : row.clientPhone;

  return {
    id: row.id,
    status: status as "prete" | "en_livraison",
    zoneName: row.zoneName,
    deliveryAddress: address,
    landmark,
    clientPhone: phone,
    clientFirstName: row.clientFirstName,
    recipientName: row.recipientName,
    isGift: row.isGift,
    total: row.total,
    collectOnDelivery: row.status === "PRETE" && row.paymentMethod !== "CARD",
    scheduledSlotStart: row.scheduledSlotStart?.toISOString() ?? null,
    driverStartedAt: row.driverStartedAt?.toISOString() ?? null,
    unreachableAt: parseOrderFlags(row.clientMessage).unreachableAt,
  };
}

export async function driverStartDelivery(
  driverId: string,
  orderId: string,
): Promise<SavedOrder> {
  const prisma = getPrisma();
  const row = await prisma.order.findFirst({
    where: { id: orderId, driverId },
    include: { items: true, driver: { select: { name: true } } },
  });

  if (!row) {
    throw new Error("Commande introuvable ou non assignée à ce livreur.");
  }

  const current = fromPrismaOrderStatus(row.status);
  if (!canDriverStartDelivery(current)) {
    throw new Error("La commande doit être « Prête » pour démarrer la livraison.");
  }

  assertDriverTransition(current, "en_livraison");
  const now = new Date();

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "EN_LIVRAISON",
      driverStartedAt: now,
    },
    include: { items: true, driver: { select: { name: true } } },
  });

  return fromPrismaOrder(updated);
}

/**
 * Le livreur signale qu'il n'a pas pu joindre la cliente.
 * Sans nouveau statut DB : on pose un marqueur horodaté dans clientMessage,
 * relu par le back office (bandeau rouge « à rappeler »). La commande reste
 * en cours de livraison pour que le livreur puisse retenter ou clôturer.
 */
export async function driverMarkUnreachable(
  driverId: string,
  orderId: string,
): Promise<SavedOrder> {
  const prisma = getPrisma();
  const row = await prisma.order.findFirst({
    where: { id: orderId, driverId },
    include: { items: true, driver: { select: { name: true } } },
  });

  if (!row) {
    throw new Error("Commande introuvable ou non assignée à ce livreur.");
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { clientMessage: markUnreachable(row.clientMessage) },
    include: { items: true, driver: { select: { name: true } } },
  });

  return fromPrismaOrder(updated);
}

export async function driverMarkDelivered(
  driverId: string,
  orderId: string,
): Promise<SavedOrder> {
  const prisma = getPrisma();
  const row = await prisma.order.findFirst({
    where: { id: orderId, driverId },
    include: { items: true, driver: { select: { name: true } } },
  });

  if (!row) {
    throw new Error("Commande introuvable ou non assignée à ce livreur.");
  }

  const current = fromPrismaOrderStatus(row.status);
  if (!canDriverMarkDelivered(current, row.driverStartedAt)) {
    throw new Error(
      "Démarrez la livraison avant de marquer comme livrée.",
    );
  }

  assertDriverTransition(current, "livree");
  const now = new Date();

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "LIVREE",
      driverDeliveredAt: now,
    },
    include: { items: true, driver: { select: { name: true } } },
  });

  return fromPrismaOrder(updated);
}

/** Recharge les commandes de démo en base (admin dev uniquement). */
export async function reseedDemoOrders(): Promise<SavedOrder[]> {
  const prisma = getPrisma();
  const orders = buildDemoOrders();

  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
  ]);

  for (const order of orders) {
    await saveServerOrder(order);
  }

  return orders;
}

/** ID de commande client (préfixe AMG). */
export function generateOrderId(): string {
  return `AMG-${randomUUID().slice(0, 8).toUpperCase()}`;
}
