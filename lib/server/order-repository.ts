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
import { getShopDayBounds } from "@/lib/business-date";
import {
  isBulkAreasLabel,
  resolveDeliveryDisplayName,
} from "@/lib/delivery-zones";
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
/**
 * Une commande portant une tentative de paiement vivante (PENDING ou SUCCESS)
 * n'est JAMAIS annulée à l'aveugle : c'est le cron de réconciliation qui
 * tranche, après avoir interrogé FeexPay. Sans ce garde-fou, un paiement
 * Mobile Money lent était encaissé puis la commande annulée — argent parti,
 * commande perdue, aucune trace exploitable.
 */
const NO_LIVE_ATTEMPT: Prisma.OrderWhereInput = {
  attempts: { none: { status: { in: ["PENDING", "SUCCESS"] } } },
};

export async function expirePendingOrder(
  orderId: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: "RECUE",
      createdAt: { lte: getPendingPaymentCutoff() },
      ...NO_LIVE_ATTEMPT,
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
      ...NO_LIVE_ATTEMPT,
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

export type ManualOrderInput = {
  client: {
    firstName: string;
    lastName: string;
    phone: string;
    address?: string;
    landmark?: string;
    message?: string;
  };
  mode: SavedOrder["mode"];
  zoneId?: string | null;
  zoneName?: string | null;
  deliveryFee?: number;
  paymentMethod: SavedOrder["paymentMethod"];
  markPaid?: boolean;
  items: { name: string; quantity: number; unitPrice: number }[];
};

/**
 * Création manuelle d'une commande côté admin (commande téléphone / boutique) —
 * ne passe pas par la réservation de créneau/stock du checkout client, l'admin
 * saisit ce qu'il a réellement vendu.
 */
export async function createManualServerOrder(
  input: ManualOrderInput,
): Promise<SavedOrder> {
  const deliveryFee = Math.max(0, Math.round(input.deliveryFee ?? 0));
  const items = input.items.map((item) => ({
    name: item.name.trim(),
    quantity: Math.max(1, Math.round(item.quantity)),
    unitPrice: Math.max(0, Math.round(item.unitPrice)),
    supplements: [] as string[],
  }));
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  const order: SavedOrder = {
    id: generateOrderId(),
    createdAt: new Date().toISOString(),
    status: input.markPaid ? "paiement_confirme" : "recue",
    mode: input.mode,
    fulfillmentType: input.mode,
    zoneId: input.mode === "delivery" ? (input.zoneId ?? null) : null,
    deliveryZoneId: input.mode === "delivery" ? (input.zoneId ?? null) : null,
    zoneName: input.mode === "delivery" ? (input.zoneName ?? null) : null,
    scheduledSlotStart: null,
    scheduledSlotEnd: null,
    deliveryFee: input.mode === "delivery" ? deliveryFee : 0,
    client: {
      firstName: input.client.firstName.trim(),
      lastName: input.client.lastName.trim(),
      phone: input.client.phone.trim(),
      address: input.client.address?.trim() ?? "",
      landmark: input.client.landmark?.trim() ?? "",
      message: input.client.message?.trim() ?? "",
    },
    isGift: false,
    gift: null,
    paymentMethod: input.paymentMethod,
    items,
    subtotal,
    total: subtotal + (input.mode === "delivery" ? deliveryFee : 0),
  };

  await saveServerOrderWithRetry(order);
  return order;
}

export type OrderDetailsPatch = {
  client: {
    firstName: string;
    lastName: string;
    phone: string;
    address?: string;
    landmark?: string;
    message?: string;
  };
  deliveryFee?: number;
  items: { name: string; quantity: number; unitPrice: number }[];
};

/** Édition complète (client + articles) d'une commande existante par l'admin. */
export async function updateServerOrderDetails(
  orderId: string,
  patch: OrderDetailsPatch,
): Promise<SavedOrder | undefined> {
  const prisma = getPrisma();
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) return undefined;

  const items = patch.items.map((item) => ({
    name: item.name.trim(),
    quantity: Math.max(1, Math.round(item.quantity)),
    unitPrice: Math.max(0, Math.round(item.unitPrice)),
    supplements: [] as string[],
  }));
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const deliveryFee =
    patch.deliveryFee !== undefined
      ? Math.max(0, Math.round(patch.deliveryFee))
      : existing.deliveryFee;

  try {
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId } }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          clientFirstName: patch.client.firstName.trim(),
          clientLastName: patch.client.lastName.trim(),
          clientPhone: patch.client.phone.trim(),
          clientAddress: patch.client.address?.trim() || null,
          clientLandmark: patch.client.landmark?.trim() || null,
          clientMessage: patch.client.message?.trim() || null,
          deliveryFee,
          subtotal,
          total: subtotal + deliveryFee,
          items: { create: items },
        },
      }),
    ]);
  } catch {
    return undefined;
  }

  return getServerOrder(orderId);
}

/**
 * Suppression définitive — réservée aux commandes jamais payées (recue) ou déjà
 * annulées. Une commande payée doit être annulée (statut), jamais supprimée,
 * pour garder une trace comptable.
 */
export async function deleteServerOrder(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const prisma = getPrisma();
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!existing) {
    return { ok: false, error: "Commande introuvable." };
  }

  if (existing.status !== "RECUE" && existing.status !== "ANNULEE") {
    return {
      ok: false,
      error:
        "Seules les commandes non payées ou déjà annulées peuvent être supprimées. Utilisez « Annuler » pour les autres.",
    };
  }

  await prisma.order.delete({ where: { id: orderId } });
  return { ok: true };
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

type DriverOrderRow = {
  id: string;
  status: import("@prisma/client").OrderStatus;
  zoneId: string | null;
  zoneName: string | null;
  clientAddress: string | null;
  clientLandmark: string | null;
  clientPhone: string;
  clientFirstName: string;
  clientMessage: string | null;
  isGift: boolean;
  recipientName: string | null;
  recipientAddress: string | null;
  recipientLandmark: string | null;
  recipientPhone: string | null;
  total: number;
  paymentMethod: import("@prisma/client").PaymentMethod;
  scheduledSlotStart: Date | null;
  driverStartedAt: Date | null;
};

export async function getDriverOrdersForToday(
  driverId: string,
): Promise<DriverOrderView[]> {
  const prisma = getPrisma();
  const { start, end } = getShopDayBounds();
  const rows = await prisma.order.findMany({
    where: {
      driverId,
      status: { in: ["PRETE", "EN_LIVRAISON"] },
      scheduledSlotStart: {
        gte: start,
        lte: end,
      },
      fulfillmentType: "delivery",
    },
    orderBy: { scheduledSlotStart: "asc" },
    select: {
      id: true,
      status: true,
      zoneId: true,
      zoneName: true,
      clientAddress: true,
      clientLandmark: true,
      clientPhone: true,
      clientFirstName: true,
      clientMessage: true,
      isGift: true,
      recipientName: true,
      recipientAddress: true,
      recipientLandmark: true,
      recipientPhone: true,
      total: true,
      paymentMethod: true,
      scheduledSlotStart: true,
      driverStartedAt: true,
    },
  });

  return rows.map((row) => toDriverOrderView(row));
}

function toDriverOrderView(row: DriverOrderRow): DriverOrderView {
  const status = fromPrismaOrderStatus(row.status);
  const address =
    row.isGift && row.recipientAddress
      ? row.recipientAddress
      : (row.clientAddress ?? "");
  const landmark =
    row.isGift && row.recipientLandmark
      ? row.recipientLandmark
      : row.clientLandmark;
  const phone =
    row.isGift && row.recipientPhone ? row.recipientPhone : row.clientPhone;

  const quartier = resolveDeliveryDisplayName(
    row.zoneId,
    isBulkAreasLabel(row.zoneName) ? null : row.zoneName,
    landmark,
  );

  return {
    id: row.id,
    status: status as "prete" | "en_livraison",
    zoneName: quartier,
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
