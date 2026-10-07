import { getWhatsAppCustomerContext } from "./customer-context";

export type WhatsAppCustomerTier = "site_habitue" | "assiste";

export type TierResult = {
  tier: WhatsAppCustomerTier;
  firstName: string | null;
  ordersCount: number;
};

/** @deprecated Préférer getWhatsAppCustomerContext — même cache, plus de données. */
export async function getWhatsAppCustomerTier(
  rawPhone: string,
): Promise<TierResult> {
  const ctx = await getWhatsAppCustomerContext(rawPhone);
  return {
    tier: ctx.tier,
    firstName: ctx.firstName,
    ordersCount: ctx.ordersCount,
  };
}

