import { normalizeBeninPhone } from "@/lib/crm/phone";
import { getPrisma } from "@/lib/prisma";

export type PaySessionState =
  | "idle"
  | "choose_method"
  | "ask_pay_phone"
  | "confirm"
  | "waiting_operator";

export type PaySessionData = {
  state: PaySessionState;
  orderId?: string;
  method?: string;
  payPhone?: string;
  reference?: string;
  amount?: number;
};

const SESSION_TTL_MS = 45 * 60_000;

function phoneKey(raw: string): string | null {
  return normalizeBeninPhone(raw);
}

function defaultExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_MS);
}

export async function getPaySession(
  chatPhone: string,
): Promise<PaySessionData | null> {
  const key = phoneKey(chatPhone);
  if (!key) return null;
  try {
    const prisma = getPrisma();
    const row = await prisma.whatsAppPaySession.findUnique({
      where: { phoneKey: key },
    });
    if (!row) return null;
    if (row.expiresAt < new Date()) {
      await prisma.whatsAppPaySession.delete({ where: { phoneKey: key } });
      return null;
    }
    return {
      state: row.state as PaySessionState,
      orderId: row.orderId ?? undefined,
      method: row.method ?? undefined,
      payPhone: row.payPhone ?? undefined,
      reference: row.reference ?? undefined,
      amount: row.amount ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function savePaySession(
  chatPhone: string,
  data: PaySessionData,
): Promise<void> {
  const key = phoneKey(chatPhone);
  if (!key) return;
  try {
    const prisma = getPrisma();
    await prisma.whatsAppPaySession.upsert({
      where: { phoneKey: key },
      create: {
        phoneKey: key,
        state: data.state,
        orderId: data.orderId,
        method: data.method,
        payPhone: data.payPhone,
        reference: data.reference,
        amount: data.amount,
        expiresAt: defaultExpiry(),
      },
      update: {
        state: data.state,
        orderId: data.orderId,
        method: data.method,
        payPhone: data.payPhone,
        reference: data.reference,
        amount: data.amount,
        expiresAt: defaultExpiry(),
      },
    });
  } catch (err) {
    console.warn("[whatsapp/pay-session]", err);
  }
}

export async function clearPaySession(chatPhone: string): Promise<void> {
  const key = phoneKey(chatPhone);
  if (!key) return;
  try {
    await getPrisma().whatsAppPaySession.deleteMany({ where: { phoneKey: key } });
  } catch {
    /* ignore */
  }
}

export async function getSavedPayPhone(chatPhone: string): Promise<string | null> {
  const key = phoneKey(chatPhone);
  if (!key) return null;
  try {
    const row = await getPrisma().whatsAppSavedPayPhone.findUnique({
      where: { phoneKey: key },
      select: { payPhone: true },
    });
    return row?.payPhone ?? null;
  } catch {
    return null;
  }
}

export async function rememberPayPhone(
  chatPhone: string,
  payPhone: string,
): Promise<void> {
  const key = phoneKey(chatPhone);
  const normalized = normalizeBeninPhone(payPhone);
  if (!key || !normalized) return;
  try {
    await getPrisma().whatsAppSavedPayPhone.upsert({
      where: { phoneKey: key },
      create: { phoneKey: key, payPhone: normalized },
      update: { payPhone: normalized },
    });
  } catch (err) {
    console.warn("[whatsapp/saved-pay-phone]", err);
  }
}
