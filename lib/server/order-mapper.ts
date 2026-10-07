import type {
  Order,
  OrderItem,
  OrderItemOption,
  OrderStatus as PrismaOrderStatus,
  PaymentMethod as PrismaPaymentMethod,
  ReceptionMode as PrismaReceptionMode,
} from "@prisma/client";

import type {
  OrderItemOptionSnapshot,
  OrderStatus,
  PaymentMethod,
  ReceptionMode,
  SavedOrder,
} from "@/types/order";

const STATUS_TO_PRISMA: Record<OrderStatus, PrismaOrderStatus> = {
  recue: "RECUE",
  paiement_confirme: "PAIEMENT_CONFIRME",
  preparation: "PREPARATION",
  prete: "PRETE",
  en_livraison: "EN_LIVRAISON",
  livree: "LIVREE",
  annulee: "ANNULEE",
};

const STATUS_FROM_PRISMA: Record<PrismaOrderStatus, OrderStatus> = {
  RECUE: "recue",
  PAIEMENT_CONFIRME: "paiement_confirme",
  PREPARATION: "preparation",
  PRETE: "prete",
  EN_LIVRAISON: "en_livraison",
  LIVREE: "livree",
  ANNULEE: "annulee",
};

const MODE_TO_PRISMA: Record<ReceptionMode, PrismaReceptionMode> = {
  delivery: "DELIVERY",
  pickup: "PICKUP",
  dinein: "DINEIN",
};

const MODE_FROM_PRISMA: Record<PrismaReceptionMode, ReceptionMode> = {
  DELIVERY: "delivery",
  PICKUP: "pickup",
  DINEIN: "dinein",
};

const PAYMENT_TO_PRISMA: Record<PaymentMethod, PrismaPaymentMethod> = {
  mtn_momo: "MTN_MOMO",
  moov_money: "MOOV_MONEY",
  celtiis_cash: "CELTIIS_CASH",
  card: "CARD",
};

const PAYMENT_FROM_PRISMA: Record<PrismaPaymentMethod, PaymentMethod> = {
  MTN_MOMO: "mtn_momo",
  MOOV_MONEY: "moov_money",
  CELTIIS_CASH: "celtiis_cash",
  CARD: "card",
};

export function toPrismaOrderStatus(status: OrderStatus): PrismaOrderStatus {
  return STATUS_TO_PRISMA[status];
}

export function fromPrismaOrderStatus(status: PrismaOrderStatus): OrderStatus {
  return STATUS_FROM_PRISMA[status];
}

export function toPrismaReceptionMode(mode: ReceptionMode): PrismaReceptionMode {
  return MODE_TO_PRISMA[mode];
}

export function fromPrismaReceptionMode(
  mode: PrismaReceptionMode,
): ReceptionMode {
  return MODE_FROM_PRISMA[mode];
}

export function toPrismaPaymentMethod(
  method: PaymentMethod,
): PrismaPaymentMethod {
  return PAYMENT_TO_PRISMA[method];
}

export function fromPrismaPaymentMethod(
  method: PrismaPaymentMethod,
): PaymentMethod {
  return PAYMENT_FROM_PRISMA[method];
}

type OrderWithItems = Order & {
  /** `options` est optionnel : toutes les requêtes ne le sélectionnent pas. */
  items: (OrderItem & { options?: OrderItemOption[] })[];
  driver?: { name: string } | null;
};

/**
 * Snapshot d'option, de la base vers le type applicatif.
 *
 * Tout est recopié : libellé, prix unitaire, règle de facturation, message et
 * occasion. C'est ce qui garantit qu'une commande de mars reste lisible et
 * facturée à l'identique même si le catalogue a changé depuis.
 */
function optionFromPrisma(row: OrderItemOption): OrderItemOptionSnapshot {
  return {
    optionId: row.optionId,
    groupName: row.groupNameSnapshot,
    optionName: row.optionNameSnapshot,
    pricingType: row.pricingType === "per_unit" ? "per_unit" : "fixed",
    unitPrice: row.unitPriceSnapshot,
    quantity: row.quantity,
    totalPrice: row.totalPrice,
    customMessage: row.customMessage,
    messageCategory: row.messageCategorySnapshot,
    customOccasion: row.customOccasion,
  };
}

export function toPrismaOrderCreateInput(order: SavedOrder) {
  const fulfillmentType = order.fulfillmentType ?? order.mode;

  return {
    id: order.id,
    createdAt: new Date(order.createdAt),
    status: toPrismaOrderStatus(order.status),
    mode: toPrismaReceptionMode(order.mode),
    zoneId: order.zoneId,
    zoneName: order.zoneName,
    deliveryZoneId: order.deliveryZoneId ?? order.zoneId,
    scheduledSlotStart: order.scheduledSlotStart
      ? new Date(order.scheduledSlotStart)
      : null,
    scheduledSlotEnd: order.scheduledSlotEnd
      ? new Date(order.scheduledSlotEnd)
      : null,
    fulfillmentType,
    deliveryFee: order.deliveryFee,
    subtotal: order.subtotal,
    total: order.total,
    paymentMethod: toPrismaPaymentMethod(order.paymentMethod),
    paymentReference: order.paymentReference ?? null,
    salesChannel: order.salesChannel === "whatsapp" ? "whatsapp" : "web",
    trackingToken: order.trackingToken ?? null,
    clientFirstName: order.client.firstName,
    clientLastName: order.client.lastName,
    clientPhone: order.client.phone,
    clientAddress: order.client.address || null,
    clientLandmark: order.client.landmark || null,
    clientMessage: order.client.message || null,
    isGift: order.isGift,
    recipientName: order.gift?.recipientName ?? null,
    recipientPhone: order.gift?.recipientPhone ?? null,
    recipientAddress: order.gift?.recipientAddress ?? null,
    recipientLandmark: order.gift?.recipientLandmark ?? null,
    giftMessage: order.gift?.giftMessage ?? null,
    senderVisible: order.gift?.senderVisible ?? true,
    items: {
      create: order.items.map((item) => ({
        slug: item.slug ?? null,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        supplements: item.supplements,
        // Snapshot : la commande reste lisible même si la variante change,
        // est désactivée, ou disparaît du catalogue.
        variantId: item.variantId ?? null,
        variantLabel: item.variantLabel ?? null,
        // Snapshot des compléments : même contrat que la variante. On écrit
        // `optionId` sans contrainte pour la traçabilité, mais tout ce qui est
        // facturé et affiché est figé ici.
        ...(item.options && item.options.length > 0
          ? {
              options: {
                create: item.options.map((option) => ({
                  optionId: option.optionId ?? null,
                  groupNameSnapshot: option.groupName,
                  optionNameSnapshot: option.optionName,
                  pricingType: option.pricingType,
                  unitPriceSnapshot: option.unitPrice,
                  quantity: option.quantity,
                  totalPrice: option.totalPrice,
                  customMessage: option.customMessage ?? null,
                  messageCategorySnapshot: option.messageCategory ?? null,
                  customOccasion: option.customOccasion ?? null,
                })),
              },
            }
          : {}),
      })),
    },
  };
}

export function fromPrismaOrder(row: OrderWithItems): SavedOrder {
  const mode = fromPrismaReceptionMode(row.mode);
  const fulfillmentType: ReceptionMode =
    row.fulfillmentType === "pickup"
      ? "pickup"
      : row.fulfillmentType === "dinein"
        ? "dinein"
        : row.fulfillmentType === "delivery"
          ? "delivery"
          : mode;

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    status: fromPrismaOrderStatus(row.status),
    mode,
    fulfillmentType,
    zoneId: row.zoneId,
    deliveryZoneId: row.deliveryZoneId,
    zoneName: row.zoneName,
    scheduledSlotStart: row.scheduledSlotStart?.toISOString() ?? null,
    scheduledSlotEnd: row.scheduledSlotEnd?.toISOString() ?? null,
    deliveryFee: row.deliveryFee,
    client: {
      firstName: row.clientFirstName,
      lastName: row.clientLastName,
      phone: row.clientPhone,
      address: row.clientAddress ?? "",
      landmark: row.clientLandmark ?? "",
      message: row.clientMessage ?? "",
    },
    isGift: row.isGift,
    gift: row.isGift
      ? {
          recipientName: row.recipientName ?? "",
          recipientPhone: row.recipientPhone ?? "",
          recipientAddress: row.recipientAddress ?? "",
          recipientLandmark: row.recipientLandmark ?? "",
          giftMessage: row.giftMessage ?? "",
          senderVisible: row.senderVisible,
        }
      : null,
    paymentMethod: fromPrismaPaymentMethod(row.paymentMethod),
    paymentReference: row.paymentReference,
    trackingToken: row.trackingToken,
    salesChannel:
      row.salesChannel === "whatsapp" ? "whatsapp" : ("web" as const),
    items: row.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      supplements: item.supplements,
      slug: item.slug ?? undefined,
      variantId: item.variantId ?? undefined,
      variantLabel: item.variantLabel ?? undefined,
      // Absent sur les commandes antérieures au système d'options : on n'ajoute
      // pas de tableau vide, pour que `undefined` dise « aucune option ».
      ...(item.options && item.options.length > 0
        ? { options: item.options.map(optionFromPrisma) }
        : {}),
    })),
    subtotal: row.subtotal,
    total: row.total,
    driverId: row.driverId,
    driverName: row.driver?.name ?? null,
    driverStartedAt: row.driverStartedAt?.toISOString() ?? null,
    driverDeliveredAt: row.driverDeliveredAt?.toISOString() ?? null,
  };
}
