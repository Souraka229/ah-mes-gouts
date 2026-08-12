import { NextResponse } from "next/server";

import {
  getShopDateKey,
  getTomorrowShopDateKey,
  shopDateTimeToUtc,
} from "@/lib/business-date";
import { DELIVERY_WAVES } from "@/lib/delivery/constants";
import { formatSlotDateShort } from "@/lib/delivery/slots";
import { getPrisma } from "@/lib/prisma";
import { getPendingPaymentCutoff } from "@/lib/orders/payment-expiration";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  buildSlotKey,
  getMaxOrdersPerSlot,
} from "@/lib/server/slot-bookings";

export const dynamic = "force-dynamic";

type WaveView = {
  id: string;
  slotKey: string;
  label: string;
  startIso: string;
  endIso: string;
  used: number;
  capacity: number;
  isFull: boolean;
  /** Commandes payées de la vague, prêtes à être réparties entre livreurs. */
  orders: {
    id: string;
    clientName: string;
    zoneName: string | null;
    status: string;
    driverName: string | null;
  }[];
};

/**
 * Remplissage des vagues de livraison — back-office uniquement.
 *
 * La capacité (35) et le nombre de commandes par vague ne sont jamais exposés
 * à la cliente : elle voit seulement si une vague est encore ouverte. Ici,
 * l'équipe suit le remplissage et compose ses tournées.
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const day = new URL(request.url).searchParams.get("day");
  const dateKey =
    day === "tomorrow" ? getTomorrowShopDateKey() : getShopDateKey();

  const prisma = getPrisma();
  const capacity = await getMaxOrdersPerSlot("delivery");

  const waves: WaveView[] = await Promise.all(
    DELIVERY_WAVES.map(async (wave) => {
      const start = shopDateTimeToUtc(dateKey, wave.start);
      const end = shopDateTimeToUtc(dateKey, wave.end);

      const rows = await prisma.order.findMany({
        where: {
          scheduledSlotStart: start,
          fulfillmentType: "delivery",
          OR: [
            { status: { notIn: ["RECUE", "ANNULEE"] } },
            { status: "RECUE", createdAt: { gt: getPendingPaymentCutoff() } },
          ],
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          clientFirstName: true,
          clientLastName: true,
          zoneName: true,
          status: true,
          isGift: true,
          recipientName: true,
          driver: { select: { name: true } },
        },
      });

      return {
        id: wave.id,
        slotKey: buildSlotKey("delivery", start.toISOString()),
        label: `${wave.label} · ${wave.start.replace(":", "h")} – ${wave.end.replace(":", "h")}`,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        used: rows.length,
        capacity,
        isFull: rows.length >= capacity,
        orders: rows.map((row) => ({
          id: row.id,
          clientName:
            row.isGift && row.recipientName
              ? row.recipientName
              : `${row.clientFirstName} ${row.clientLastName}`.trim(),
          zoneName: row.zoneName,
          status: row.status,
          driverName: row.driver?.name ?? null,
        })),
      };
    }),
  );

  return NextResponse.json({
    dateKey,
    dateLabel: formatSlotDateShort(shopDateTimeToUtc(dateKey, "12:00").toISOString()),
    capacity,
    totalOrders: waves.reduce((sum, wave) => sum + wave.used, 0),
    waves,
  });
}
