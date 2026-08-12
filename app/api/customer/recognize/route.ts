import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeBeninPhone } from "@/lib/crm/phone";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { DEVICE_COOKIE } from "@/lib/server/device-cookie";

export const dynamic = "force-dynamic";

const schema = z.object({ phone: z.string().min(8).max(32) });

/**
 * Reconnaissance client — couche 2 de la mémoire sans inscription.
 *
 * Le téléphone est déjà un champ obligatoire du checkout : le reconnaître ne
 * coûte aucune friction supplémentaire. Mais il ne prouve rien en soi, sinon
 * n'importe qui saisirait un numéro pour lire l'adresse de sa propriétaire —
 * c'était exactement le trou de /api/crm/link.
 *
 * D'où deux niveaux :
 *  - appareil inconnu → prénom et nombre de commandes seulement. Un prénom ne
 *    fuit rien, une adresse si. Cela donne 90 % de la sensation de
 *    reconnaissance sans risque.
 *  - appareil déjà lié à ce client (cookie ge_did) → pré-remplissage complet.
 */
export async function POST(request: Request) {
  // Cette route révèle si un numéro est client : elle doit rester serrée.
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `customer:recognize:${ip}`,
    10,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ known: false });
  }

  const phone = normalizeBeninPhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ known: false });
  }

  const prisma = getPrisma();

  try {
    const customer = await prisma.customer.findUnique({
      where: { phone },
      select: { id: true, firstName: true, ordersCount: true },
    });

    if (!customer) {
      return NextResponse.json({ known: false });
    }

    const deviceKey = (await cookies()).get(DEVICE_COOKIE)?.value;
    const trusted = deviceKey
      ? await prisma.customerDevice.findFirst({
          where: { deviceKey, customerId: customer.id },
          select: { id: true },
        })
      : null;

    if (!trusted) {
      return NextResponse.json({
        known: true,
        trusted: false,
        firstName: customer.firstName,
        ordersCount: customer.ordersCount,
      });
    }

    const lastOrder = await prisma.order.findFirst({
      where: { customerId: customer.id, status: { not: "ANNULEE" } },
      orderBy: { createdAt: "desc" },
      select: {
        clientFirstName: true,
        clientLastName: true,
        clientAddress: true,
        clientLandmark: true,
        zoneId: true,
        zoneName: true,
        mode: true,
      },
    });

    return NextResponse.json({
      known: true,
      trusted: true,
      firstName: customer.firstName,
      ordersCount: customer.ordersCount,
      prefill: lastOrder,
    });
  } catch (error) {
    console.error("[customer/recognize]", error);
    // Ne jamais bloquer le checkout parce que la reconnaissance a échoué.
    return NextResponse.json({ known: false });
  }
}
