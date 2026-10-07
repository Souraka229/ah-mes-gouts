import { phoneSearchVariants } from "@/lib/crm/phone";
import { fromPrismaReceptionMode } from "@/lib/server/order-mapper";
import { getPrisma } from "@/lib/prisma";
import type { ReceptionMode } from "@/types/order";

import type { WhatsAppCustomerTier } from "./customer-tier";

export type LastDeliveryProfile = {
  mode: ReceptionMode;
  firstName: string;
  lastName: string;
  address: string;
  landmark: string;
  zoneName: string | null;
  deliveryZoneId: string | null;
};

export type WhatsAppCustomerContext = {
  tier: WhatsAppCustomerTier;
  firstName: string | null;
  lastName: string | null;
  ordersCount: number;
  /** Dernière commande payée — préremplissage livraison WhatsApp. */
  lastPaidOrder: LastDeliveryProfile | null;
};

const cache = new Map<string, { at: number; value: WhatsAppCustomerContext }>();
const TTL_MS = 120_000;

/**
 * Une requête CRM + une requête dernière commande payée (téléphone),
 * au lieu de multiplier les allers-retours dans order-flow / process-message.
 */
export async function getWhatsAppCustomerContext(
  rawPhone: string,
): Promise<WhatsAppCustomerContext> {
  const cacheKey = rawPhone.replace(/\D/g, "").slice(-8) || rawPhone;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.value;
  }

  const prisma = getPrisma();
  const variants = phoneSearchVariants(rawPhone);

  const [customer, lastOrder] = await Promise.all([
    prisma.customer.findFirst({
      where: { phone: { in: variants } },
      select: {
        firstName: true,
        lastName: true,
        ordersCount: true,
        orders: {
          where: {
            status: { not: "ANNULEE" },
            paymentReference: { not: null },
          },
          take: 1,
          select: { id: true },
        },
      },
    }),
    prisma.order.findFirst({
      where: {
        clientPhone: { in: variants },
        status: { not: "ANNULEE" },
        paymentReference: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: {
        mode: true,
        clientFirstName: true,
        clientLastName: true,
        clientAddress: true,
        clientLandmark: true,
        zoneName: true,
        deliveryZoneId: true,
        zoneId: true,
      },
    }),
  ]);

  const tier: WhatsAppCustomerTier =
    customer && customer.orders.length > 0 ? "site_habitue" : "assiste";

  let lastPaidOrder: LastDeliveryProfile | null = null;
  if (lastOrder) {
    lastPaidOrder = {
      mode: fromPrismaReceptionMode(lastOrder.mode),
      firstName: lastOrder.clientFirstName,
      lastName: lastOrder.clientLastName,
      address: lastOrder.clientAddress?.trim() ?? "",
      landmark: lastOrder.clientLandmark?.trim() ?? "",
      zoneName: lastOrder.zoneName,
      deliveryZoneId: lastOrder.deliveryZoneId ?? lastOrder.zoneId,
    };
  }

  const value: WhatsAppCustomerContext = {
    tier,
    firstName:
      customer?.firstName?.trim() ||
      lastOrder?.clientFirstName?.trim() ||
      null,
    lastName:
      customer?.lastName?.trim() || lastOrder?.clientLastName?.trim() || null,
    ordersCount: customer?.ordersCount ?? 0,
    lastPaidOrder,
  };

  cache.set(cacheKey, { at: Date.now(), value });
  return value;
}
