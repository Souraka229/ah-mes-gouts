import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  resolveDeliveryDisplayName,
} from "@/lib/delivery-zones";
import { getZoneById } from "@/lib/server/delivery-config-repository";
import { priceOrderItems } from "@/lib/server/order-pricing";

const quoteSchema = z.object({
  mode: z.enum(["delivery", "pickup", "dinein"]).nullable(),
  zoneId: z.string().trim().min(1).nullable(),
  locality: z.string().trim().min(1).max(120).nullable().optional(),
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1),
        name: z.string().trim().min(1),
        quantity: z.number().int().positive().max(99),
        supplements: z.array(z.string()).default([]),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `cart:quote:${ip}`,
    30,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de demandes de calcul." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Panier invalide." }, { status: 400 });
  }

  const priced = await priceOrderItems(parsed.data.items);
  if (!priced.ok) {
    return NextResponse.json(
      { error: "Le panier doit être actualisé.", issues: priced.issues },
      { status: 409 },
    );
  }

  let deliveryFee = 0;
  let zoneName: string | null = null;
  if (parsed.data.mode === "delivery" && parsed.data.zoneId) {
    const zone = await getZoneById(parsed.data.zoneId);
    if (!zone?.isActive) {
      return NextResponse.json(
        { error: "Zone de livraison indisponible." },
        { status: 409 },
      );
    }
    deliveryFee = zone.cost;
    zoneName =
      resolveDeliveryDisplayName(
        zone.id,
        null,
        parsed.data.locality ?? null,
      ) ?? zone.name;
  }

  return NextResponse.json({
    subtotal: priced.data.subtotal,
    deliveryFee,
    total: priced.data.subtotal + deliveryFee,
    zoneName,
  });
}
