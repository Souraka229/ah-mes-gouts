import { createHash, randomInt, timingSafeEqual } from "crypto";

import type { CustomerActivityType, Prisma } from "@prisma/client";

import { normalizeBeninPhone } from "@/lib/crm/phone";
import { getPrisma } from "@/lib/prisma";

const OTP_TTL_MS = 10 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MIN_INTERVAL_MS = 60_000;

const ACTIVITY_MAP: Record<string, CustomerActivityType> = {
  product_view: "PRODUCT_VIEW",
  add_to_cart: "ADD_TO_CART",
  checkout_start: "CHECKOUT_START",
  order_placed: "ORDER_PLACED",
};

function otpPepper(): string {
  return (
    process.env.CRM_OTP_PEPPER?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    "amg-crm-dev-pepper"
  );
}

export function hashOtpCode(code: string): string {
  return createHash("sha256")
    .update(`${otpPepper()}:${code}`)
    .digest("hex");
}

function safeEqualHash(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function ensureDevice(deviceKey: string) {
  const prisma = getPrisma();
  const key = deviceKey.trim();
  if (key.length < 16 || key.length > 80) {
    throw new Error("Identifiant appareil invalide");
  }

  return prisma.customerDevice.upsert({
    where: { deviceKey: key },
    create: { deviceKey: key },
    update: { lastSeenAt: new Date() },
  });
}

export async function upsertCustomerFromPhone(input: {
  phone: string;
  firstName?: string;
  lastName?: string;
}) {
  const phone = normalizeBeninPhone(input.phone);
  if (!phone) throw new Error("Numéro de téléphone invalide");

  const prisma = getPrisma();
  const existing = await prisma.customer.findUnique({ where: { phone } });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        firstName: input.firstName?.trim() || existing.firstName,
        lastName: input.lastName?.trim() || existing.lastName,
      },
    });
  }

  return prisma.customer.create({
    data: {
      phone,
      firstName: input.firstName?.trim() ?? "",
      lastName: input.lastName?.trim() ?? "",
    },
  });
}

/** Lie un appareil à un client (téléphone = pivot). */
export async function linkDeviceToCustomer(input: {
  deviceKey: string;
  phone: string;
  firstName?: string;
  lastName?: string;
}) {
  const device = await ensureDevice(input.deviceKey);
  const customer = await upsertCustomerFromPhone(input);
  const prisma = getPrisma();

  await prisma.customerDevice.update({
    where: { id: device.id },
    data: { customerId: customer.id, lastSeenAt: new Date() },
  });

  // Rattache les activités orphelines de cet appareil
  await prisma.customerActivity.updateMany({
    where: { deviceId: device.id, customerId: null },
    data: { customerId: customer.id },
  });

  return { device, customer };
}

export async function recordActivity(input: {
  deviceKey: string;
  type: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  metadata?: Record<string, unknown>;
}) {
  const type = ACTIVITY_MAP[input.type];
  if (!type) throw new Error("Type d'activité inconnu");

  const device = await ensureDevice(input.deviceKey);
  const prisma = getPrisma();

  return prisma.customerActivity.create({
    data: {
      deviceId: device.id,
      customerId: device.customerId,
      type,
      productId: input.productId,
      productSlug: input.productSlug,
      productName: input.productName,
      metadata:
        input.metadata === undefined
          ? undefined
          : (input.metadata as Prisma.InputJsonValue),
    },
  });
}

/**
 * Après commande : crée/met à jour le Customer, lie l'appareil,
 * rattache Order.customerId, met à jour les agrégats (FCFA entiers).
 */
export async function attachOrderToCustomer(input: {
  orderId: string;
  phone: string;
  firstName: string;
  lastName: string;
  total: number;
  createdAt: Date;
  deviceKey?: string | null;
}): Promise<string | null> {
  try {
    const phone = normalizeBeninPhone(input.phone);
    if (!phone) return null;

    const prisma = getPrisma();
    let customer = await prisma.customer.findUnique({ where: { phone } });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phone,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          firstOrderAt: input.createdAt,
          lastOrderAt: input.createdAt,
          ordersCount: 1,
          totalSpent: input.total,
        },
      });
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName: input.firstName.trim() || customer.firstName,
          lastName: input.lastName.trim() || customer.lastName,
          firstOrderAt: customer.firstOrderAt ?? input.createdAt,
          lastOrderAt: input.createdAt,
          ordersCount: { increment: 1 },
          totalSpent: { increment: input.total },
        },
      });
    }

    await prisma.order.update({
      where: { id: input.orderId },
      data: { customerId: customer.id },
    });

    if (input.deviceKey?.trim()) {
      await linkDeviceToCustomer({
        deviceKey: input.deviceKey,
        phone: input.phone,
        firstName: input.firstName,
        lastName: input.lastName,
      });
      await recordActivity({
        deviceKey: input.deviceKey,
        type: "order_placed",
        metadata: { orderId: input.orderId, total: input.total },
      }).catch(() => null);
    }

    return customer.id;
  } catch (err) {
    console.error("[crm] attachOrderToCustomer:", err);
    return null;
  }
}

export async function requestCustomerOtp(phoneRaw: string): Promise<{
  ok: true;
  expiresAt: string;
  /** Uniquement en dev — jamais en prod. */
  devCode?: string;
}> {
  const phone = normalizeBeninPhone(phoneRaw);
  if (!phone) throw new Error("Numéro de téléphone invalide");

  const prisma = getPrisma();
  const recent = await prisma.customerOtp.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (
    recent &&
    Date.now() - recent.createdAt.getTime() < OTP_MIN_INTERVAL_MS
  ) {
    throw new Error("Attendez une minute avant de redemander un code.");
  }

  const code = String(randomInt(100_000, 999_999));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.customerOtp.create({
    data: {
      phone,
      codeHash: hashOtpCode(code),
      expiresAt,
    },
  });

  // Canal SMS/WhatsApp à brancher — stub log pour l'instant
  await deliverOtp(phone, code);

  const isDev =
    process.env.NODE_ENV === "development" ||
    process.env.CRM_OTP_DEV_RETURN === "true";

  return {
    ok: true,
    expiresAt: expiresAt.toISOString(),
    ...(isDev ? { devCode: code } : {}),
  };
}

async function deliverOtp(phone: string, code: string): Promise<void> {
  const webhook = process.env.CRM_OTP_WEBHOOK_URL?.trim();
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        message: `Gift & ENTREMETS — votre code : ${code} (valide 10 min)`,
        channel: "whatsapp",
      }),
    }).catch((err) => console.error("[crm] OTP webhook:", err));
    return;
  }

  console.info(`[crm:otp] phone=${phone} code=${code}`);
}

export async function verifyCustomerOtp(input: {
  phone: string;
  code: string;
  deviceKey: string;
}): Promise<{ customerId: string; phone: string }> {
  const phone = normalizeBeninPhone(input.phone);
  if (!phone) throw new Error("Numéro de téléphone invalide");

  const code = input.code.replace(/\D/g, "");
  if (code.length !== 6) throw new Error("Code invalide");

  const prisma = getPrisma();
  const otp = await prisma.customerOtp.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.expiresAt.getTime() < Date.now()) {
    throw new Error("Code expiré. Demandez-en un nouveau.");
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new Error("Trop de tentatives. Demandez un nouveau code.");
  }

  const match = safeEqualHash(otp.codeHash, hashOtpCode(code));
  if (!match) {
    await prisma.customerOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("Code incorrect");
  }

  await prisma.customerOtp.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  // Upsert client même s'il n'a jamais commandé via ce téléphone en CRM
  // (commandes historiques via clientPhone brut)
  const customer = await upsertCustomerFromPhone({ phone });

  await linkDeviceToCustomer({
    deviceKey: input.deviceKey,
    phone,
  });

  // Backfill : rattacher commandes historiques dont le téléphone normalise pareil
  const unbound = await prisma.order.findMany({
    where: { customerId: null },
    select: { id: true, clientPhone: true },
    take: 500,
  });
  const ids = unbound
    .filter((o) => normalizeBeninPhone(o.clientPhone) === phone)
    .map((o) => o.id);
  if (ids.length > 0) {
    await prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { customerId: customer.id },
    });
  }

  return { customerId: customer.id, phone };
}

export async function getOrdersForDevice(deviceKey: string) {
  const prisma = getPrisma();
  const device = await prisma.customerDevice.findUnique({
    where: { deviceKey: deviceKey.trim() },
  });

  if (!device?.customerId) return { linked: false as const, orders: [] };

  const rows = await prisma.order.findMany({
    where: { customerId: device.customerId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return { linked: true as const, customerId: device.customerId, orders: rows };
}
