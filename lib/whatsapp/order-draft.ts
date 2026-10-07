import { normalizeBeninPhone } from "@/lib/crm/phone";
import { getPrisma } from "@/lib/prisma";

export type CartLine = {
  slug: string;
  name: string;
  quantity: number;
};

type StoredCartPayload = {
  lines: CartLine[];
  deliveryZoneId?: string;
  deliveryLocality?: string;
  slotPage?: number;
  address?: string;
  landmark?: string;
  pendingAddressReuse?: string;
  pendingLandmarkReuse?: string;
};

function parseStoredCart(raw: unknown): StoredCartPayload {
  if (Array.isArray(raw)) {
    return { lines: raw as CartLine[] };
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as StoredCartPayload).lines)) {
    return raw as StoredCartPayload;
  }
  return { lines: [] };
}

function buildStoredCart(data: OrderDraftData): StoredCartPayload {
  return {
    lines: data.cart,
    deliveryZoneId: data.deliveryZoneId,
    deliveryLocality: data.deliveryLocality,
    slotPage: data.slotPage,
    address: data.address,
    landmark: data.landmark,
    pendingAddressReuse: data.pendingAddressReuse,
    pendingLandmarkReuse: data.pendingLandmarkReuse,
  };
}

export type OrderDraftState =
  | "menu"
  | "choose_mode"
  | "delivery_locality"
  | "choose_slot"
  | "ask_name"
  | "ask_address"
  | "ask_landmark"
  | "confirm_create"
  /** @deprecated Ancien flux — migré vers choose_mode à la lecture */
  | "confirm";

export type OrderDraftData = {
  state: OrderDraftState;
  cart: CartLine[];
  mode?: "pickup" | "dinein" | "delivery";
  deliveryZoneId?: string;
  deliveryLocality?: string;
  slotStart?: string;
  slotEnd?: string;
  slotPage?: number;
  firstName?: string;
  lastName?: string;
  address?: string;
  landmark?: string;
  pendingAddressReuse?: string;
  pendingLandmarkReuse?: string;
  paymentMethod?: string;
  orderId?: string;
};

const TTL_MS = 45 * 60_000;

function phoneKey(raw: string): string | null {
  return normalizeBeninPhone(raw);
}

export async function getOrderDraft(
  chatPhone: string,
): Promise<OrderDraftData | null> {
  const key = phoneKey(chatPhone);
  if (!key) return null;
  try {
    const row = await getPrisma().whatsAppOrderDraft.findUnique({
      where: { phoneKey: key },
    });
    if (!row || row.expiresAt < new Date()) {
      if (row) {
        await getPrisma().whatsAppOrderDraft.delete({ where: { phoneKey: key } });
      }
      return null;
    }
    let state = row.state as OrderDraftState;
    if (state === "confirm") {
      state = "choose_mode";
    }
    const stored = parseStoredCart(row.cartJson);
    return {
      state,
      cart: stored.lines,
      mode: (row.mode as OrderDraftData["mode"]) ?? undefined,
      deliveryZoneId: stored.deliveryZoneId,
      deliveryLocality: stored.deliveryLocality,
      slotStart: row.slotStart ?? undefined,
      slotEnd: row.slotEnd ?? undefined,
      slotPage: stored.slotPage,
      firstName: row.firstName ?? undefined,
      lastName: row.lastName ?? undefined,
      address: stored.address,
      landmark: stored.landmark,
      pendingAddressReuse: stored.pendingAddressReuse,
      pendingLandmarkReuse: stored.pendingLandmarkReuse,
      paymentMethod: row.paymentMethod ?? undefined,
      orderId: row.orderId ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function saveOrderDraft(
  chatPhone: string,
  data: OrderDraftData,
): Promise<void> {
  const key = phoneKey(chatPhone);
  if (!key) return;
  const prisma = getPrisma();
  await prisma.whatsAppOrderDraft.upsert({
    where: { phoneKey: key },
    create: {
      phoneKey: key,
      state: data.state,
      cartJson: buildStoredCart(data),
      mode: data.mode ?? null,
      slotStart: data.slotStart ?? null,
      slotEnd: data.slotEnd ?? null,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      paymentMethod: data.paymentMethod ?? null,
      orderId: data.orderId ?? null,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
    update: {
      state: data.state,
      cartJson: buildStoredCart(data),
      mode: data.mode ?? null,
      slotStart: data.slotStart ?? null,
      slotEnd: data.slotEnd ?? null,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      paymentMethod: data.paymentMethod ?? null,
      orderId: data.orderId ?? null,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
}

export async function clearOrderDraft(chatPhone: string): Promise<void> {
  const key = phoneKey(chatPhone);
  if (!key) return;
  try {
    await getPrisma().whatsAppOrderDraft.deleteMany({ where: { phoneKey: key } });
  } catch {
    /* ignore */
  }
}
