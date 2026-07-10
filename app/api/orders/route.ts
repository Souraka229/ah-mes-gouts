import { NextResponse } from "next/server";

import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import { getSlotsForDate } from "@/lib/delivery/slots";
import { sendOrderNotifications } from "@/lib/notifications/order-notifications";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getDeliveryConfig, getZoneById } from "@/lib/server/delivery-config-repository";
import {
  rememberIdempotentOrder,
  resolveIdempotentOrder,
} from "@/lib/server/order-idempotency";
import {
  getServerOrder,
  saveServerOrderWithRetry,
} from "@/lib/server/order-repository";
import {
  buildSlotKey,
  findNextAvailableSlot,
  isSlotAvailable,
  reserveSlot,
} from "@/lib/server/slot-bookings";
import type { SavedOrder } from "@/types/order";

const ORDER_RATE_LIMIT = 5;
const ORDER_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(
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
    const existing = resolveIdempotentOrder(idempotencyKey);
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

  if (!order.scheduledSlotStart || !order.scheduledSlotEnd) {
    return NextResponse.json(
      { error: "Créneau horaire requis" },
      { status: 400 },
    );
  }

  const slotStart = order.scheduledSlotStart;
  const slotEnd = order.scheduledSlotEnd;
  const fulfillmentType = order.fulfillmentType ?? order.mode;

  try {
    const { schedules } = await getDeliveryConfig();
    const slots = getSlotsForDate(
      schedules,
      fulfillmentType,
      new Date(slotStart),
    );
    const matching = slots.find(
      (s) => s.start === slotStart && s.end === slotEnd,
    );
    if (!matching) {
      const nextSlot = await findNextAvailableSlot(fulfillmentType, slotStart);
      return NextResponse.json(
        {
          error: "Ce créneau n'est plus disponible.",
          nextSlot,
        },
        { status: 409 },
      );
    }

    const slotKey = buildSlotKey(fulfillmentType, slotStart);

    if (!(await isSlotAvailable(slotKey))) {
      const nextSlot = await findNextAvailableSlot(fulfillmentType, slotStart);
      return NextResponse.json(
        {
          error: "Ce créneau vient d'être réservé.",
          nextSlot,
        },
        { status: 409 },
      );
    }

    if (fulfillmentType === "delivery" && order.deliveryZoneId) {
      const zone = await getZoneById(order.deliveryZoneId);
      if (!zone || !zone.isActive) {
        return NextResponse.json(
          { error: "Zone de livraison indisponible" },
          { status: 400 },
        );
      }
      order = {
        ...order,
        zoneId: zone.id,
        deliveryZoneId: zone.id,
        zoneName: zone.name,
        deliveryFee: zone.cost,
        total: order.subtotal + zone.cost,
      };
    }

    if (!(await reserveSlot(slotKey))) {
      const nextSlot = await findNextAvailableSlot(fulfillmentType, slotStart);
      return NextResponse.json(
        {
          error: "Ce créneau vient d'être réservé.",
          nextSlot,
        },
        { status: 409 },
      );
    }

    order = {
      ...order,
      fulfillmentType,
      deliveryZoneId: order.deliveryZoneId ?? order.zoneId,
    };

    await saveServerOrderWithRetry(order);

    if (idempotencyKey) {
      rememberIdempotentOrder(idempotencyKey, order.id);
    }

    await sendOrderNotifications(order).catch((err) => {
      console.error("[orders] Notification échouée:", err);
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
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
