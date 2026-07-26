import { NextResponse } from "next/server";

import { toPublicTrackingOrder } from "@/lib/orders/tracking-dto";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  expirePendingOrder,
  getServerOrder,
} from "@/lib/server/order-repository";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

const TRACKING_RATE_LIMIT = 30;
const TRACKING_RATE_WINDOW_MS = 60_000;

export async function GET(request: Request, context: RouteContext) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `orders:tracking:${ip}`,
    TRACKING_RATE_LIMIT,
    TRACKING_RATE_WINDOW_MS,
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  const { orderId } = await context.params;
  await expirePendingOrder(orderId);
  const order = await getServerOrder(orderId);

  if (!order) {
    return NextResponse.json(
      { error: "Commande introuvable" },
      { status: 404 },
    );
  }

  const publicOrder = toPublicTrackingOrder(order);

  if (publicOrder.isAnonymousGift) {
    const serialized = JSON.stringify(publicOrder);
    if (
      serialized.includes(order.client.firstName) ||
      serialized.includes(order.client.lastName) ||
      serialized.includes(order.client.phone)
    ) {
      return NextResponse.json(
        { error: "Fuite de données expéditeur détectée" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(publicOrder);
}
