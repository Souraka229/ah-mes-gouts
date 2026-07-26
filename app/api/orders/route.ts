import { NextResponse } from "next/server";
import { z } from "zod";

import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import { getSlotsForDate } from "@/lib/delivery/slots";
import { sendOrderNotifications } from "@/lib/notifications/order-notifications";
import {
  formatNewOrderAlert,
  notifyTelegramSafe,
} from "@/lib/notifications/telegram";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { attachOrderToCustomer } from "@/lib/server/crm/customer-service";
import { getDeliveryConfig, getZoneById } from "@/lib/server/delivery-config-repository";
import {
  rememberIdempotentOrder,
  resolveIdempotentOrder,
} from "@/lib/server/order-idempotency";
import {
  createServerOrderWithStock,
  getServerOrder,
  OrderStockError,
  saveServerOrderWithSlotReservation,
  SlotFullError,
} from "@/lib/server/order-repository";
import { priceOrderItems } from "@/lib/server/order-pricing";
import { withRetry } from "@/lib/server/retry";
import {
  buildSlotKey,
  findNextAvailableSlot,
  isSlotAvailable,
} from "@/lib/server/slot-bookings";
import type { SavedOrder } from "@/types/order";

const orderItemsSchema = z
  .array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().int().positive().max(99),
      supplements: z.array(z.string()).default([]),
      slug: z.string().optional(),
    }),
  )
  .min(1);

const ORDER_RATE_LIMIT = 5;
const ORDER_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `orders:create:${ip}`,
    ORDER_RATE_LIMIT,
    ORDER_RATE_WINDOW_MS,
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques instants." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim();

  if (idempotencyKey) {
    const existing = await resolveIdempotentOrder(idempotencyKey);
    if (existing) {
      const prior = await getServerOrder(existing.orderId);
      if (prior) {
        return NextResponse.json({
          ok: true,
          orderId: prior.id,
          duplicate: true,
          fulfillmentSummary: formatFulfillmentSummary(prior),
        });
      }
    }
  }

  let order: SavedOrder;

  try {
    order = (await request.json()) as SavedOrder;
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  if (!order.id || !order.client?.phone) {
    return NextResponse.json(
      { error: "Commande incomplète" },
      { status: 400 },
    );
  }

  const parsedItems = orderItemsSchema.safeParse(order.items);
  if (!parsedItems.success) {
    return NextResponse.json(
      { error: "Panier invalide" },
      { status: 400 },
    );
  }

  if (!order.scheduledSlotStart || !order.scheduledSlotEnd) {
    return NextResponse.json(
      { error: "Créneau horaire requis" },
      { status: 400 },
    );
  }

  const slotStart = order.scheduledSlotStart;
  const slotEnd = order.scheduledSlotEnd;
  const fulfillmentType = order.fulfillmentType ?? order.mode;
  const scheduleType = fulfillmentType === "delivery" ? "delivery" : "pickup";

  try {
    const { schedules, options } = await getDeliveryConfig();
    const slots = getSlotsForDate(
      schedules,
      scheduleType,
      new Date(slotStart),
    );
    const matching = slots.find(
      (s) => s.start === slotStart && s.end === slotEnd,
    );
    if (!matching) {
      const nextSlot = await findNextAvailableSlot(scheduleType, slotStart);
      return NextResponse.json(
        {
          error: "Ce créneau n'est plus disponible.",
          nextSlot,
        },
        { status: 409 },
      );
    }

    const slotKey = buildSlotKey(scheduleType, slotStart);

    if (!(await isSlotAvailable(slotKey))) {
      const nextSlot = await findNextAvailableSlot(scheduleType, slotStart);
      return NextResponse.json(
        {
          error: "Ce créneau vient d'être réservé.",
          nextSlot,
        },
        { status: 409 },
      );
    }

    const priced = await priceOrderItems(parsedItems.data);
    if (!priced.ok) {
      return NextResponse.json(
        {
          error: priced.issues.map((i) => `${i.name} : ${i.message}`).join(" — "),
          issues: priced.issues,
        },
        { status: 409 },
      );
    }

    let deliveryFee = 0;
    let zoneId: string | null = null;
    let zoneName: string | null = null;

    if (fulfillmentType === "delivery") {
      const requestedZoneId = order.deliveryZoneId ?? order.zoneId;
      if (!requestedZoneId) {
        return NextResponse.json(
          { error: "Zone de livraison requise" },
          { status: 400 },
        );
      }
      const zone = await getZoneById(requestedZoneId);
      if (!zone || !zone.isActive) {
        return NextResponse.json(
          { error: "Zone de livraison indisponible" },
          { status: 400 },
        );
      }
      deliveryFee = zone.cost;
      zoneId = zone.id;
      zoneName = zone.name;
    }

    const subtotal = priced.data.subtotal;
    const total = subtotal + deliveryFee;

    order = {
      ...order,
      fulfillmentType,
      items: priced.data.items,
      subtotal,
      deliveryFee,
      total,
      zoneId,
      deliveryZoneId: zoneId,
      zoneName,
      status: order.status === "paiement_confirme" ? "paiement_confirme" : "recue",
    };

    const awaitingPayment = order.status === "recue";

    try {
      if (awaitingPayment) {
        await withRetry(
          () =>
            saveServerOrderWithSlotReservation(order, {
              scheduledSlotStart: new Date(slotStart),
              fulfillmentType: scheduleType,
              maxOrdersPerSlot: options.maxOrdersPerSlot,
            }),
          {
            label: "saveServerOrderWithSlotReservation",
            maxAttempts: 3,
            baseDelayMs: 150,
            shouldRetry: (err) => !(err instanceof SlotFullError),
          },
        );
      } else {
        await withRetry(
          () => createServerOrderWithStock(order, priced.data.stockClaims),
          {
            label: "createServerOrderWithStock",
            maxAttempts: 3,
            baseDelayMs: 200,
            shouldRetry: (err) => !(err instanceof OrderStockError),
          },
        );
      }
    } catch (err) {
      if (err instanceof SlotFullError) {
        const nextSlot = await findNextAvailableSlot(scheduleType, slotStart);
        return NextResponse.json(
          {
            error: "Ce créneau vient d'être réservé.",
            nextSlot,
          },
          { status: 409 },
        );
      }
      if (err instanceof OrderStockError) {
        return NextResponse.json(
          {
            error: err.issues
              .map((i) => `${i.name} : ${i.message}`)
              .join(" — "),
            issues: err.issues,
          },
          { status: 409 },
        );
      }
      throw err;
    }

    if (idempotencyKey) {
      await rememberIdempotentOrder(idempotencyKey, order.id);
    }

    if (!awaitingPayment) {
      const deviceKey =
        request.headers.get("x-amg-device-key")?.trim() ||
        (typeof (order as { deviceKey?: string }).deviceKey === "string"
          ? (order as { deviceKey?: string }).deviceKey
          : null);

      await attachOrderToCustomer({
        orderId: order.id,
        phone: order.client.phone,
        firstName: order.client.firstName,
        lastName: order.client.lastName,
        total: order.total,
        createdAt: new Date(order.createdAt),
        deviceKey,
      });

      await sendOrderNotifications(order).catch((err) => {
        console.error("[orders] Notification échouée:", err);
      });

      notifyTelegramSafe(
        formatNewOrderAlert({
          orderId: order.id,
          total: order.total,
          mode: order.mode,
          clientName: `${order.client.firstName} ${order.client.lastName}`.trim(),
        }),
      );
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      status: order.status,
      fulfillmentSummary: formatFulfillmentSummary(order),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur serveur lors de la commande";
    console.error("[orders] POST échoué:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
