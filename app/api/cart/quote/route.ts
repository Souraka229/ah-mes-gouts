import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  resolveDeliveryDisplayName,
} from "@/lib/delivery-zones";
import { resolveDeliveryAreaPrice } from "@/lib/server/delivery-area-repository";
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
        /**
         * Code de la variante choisie. Sans lui, une fiche à tailles est
         * refusée par la facturation (« Choisissez une option ») : ce champ est
         * un **identifiant de choix**, jamais un montant.
         */
        variantCode: z.string().min(1).max(40).optional(),
        /** @deprecated Ancien champ taille nounours, converti en code. */
        sizeCm: z.number().int().positive().optional(),
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

    /**
     * Le tarif est celui du **lieu**, pas celui de la zone : « Hors Cotonou »
     * va de 2 000 à 4 000 F, et plusieurs paliers mélangent les prix.
     *
     * Un quartier annoncé mais introuvable est refusé plutôt que facturé au
     * tarif de la zone : mieux vaut une vente qui s'arrête qu'une livraison
     * facturée 2 000 F pour un trajet à 4 000 F.
     */
    const locality = parsed.data.locality?.trim() || null;
    if (locality) {
      const areaPrice = await resolveDeliveryAreaPrice(zone.id, locality);
      if (areaPrice === undefined) {
        return NextResponse.json(
          { error: "Ce quartier n'est plus desservi. Choisissez-en un autre." },
          { status: 409 },
        );
      }
      deliveryFee = areaPrice;
    } else {
      // Aucun quartier précisé : tarif du palier, comme avant.
      deliveryFee = zone.cost;
    }

    zoneName = resolveDeliveryDisplayName(zone.id, null, locality);
  }

  return NextResponse.json({
    subtotal: priced.data.subtotal,
    deliveryFee,
    total: priced.data.subtotal + deliveryFee,
    zoneName,
  });
}
