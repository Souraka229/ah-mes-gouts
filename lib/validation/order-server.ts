import { z } from "zod";

import {
  clientInfoSchema,
  giftDetailsSchema,
  senderInfoSchema,
} from "@/lib/validation/checkout";

const phoneSchema = z
  .string()
  .min(8, "Numéro de téléphone invalide")
  .regex(/^[0-9+\s-]+$/, "Format de téléphone invalide");

const pickupClientSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom est requis"),
  lastName: z.string().trim().min(2, "Le nom est requis"),
  phone: phoneSchema,
  address: z.string().optional().default(""),
  landmark: z.string().optional().default(""),
  message: z.string().optional().default(""),
});

const giftPickupSchema = giftDetailsSchema
  .omit({ recipientAddress: true, recipientLandmark: true })
  .extend({
    recipientAddress: z.string().optional().default(""),
    recipientLandmark: z.string().optional().default(""),
  });

export function validateOrderClientPayload(input: {
  mode: "delivery" | "pickup" | "dinein";
  client: unknown;
  isGift?: boolean;
  gift?: unknown;
}):
  | { ok: true }
  | { ok: false; error: string } {
  const isGift = input.isGift === true;

  if (isGift) {
    const sender = senderInfoSchema.safeParse(input.client);
    if (!sender.success) {
      return { ok: false, error: "Coordonnées expéditeur invalides." };
    }

    const giftSchema =
      input.mode === "delivery" ? giftDetailsSchema : giftPickupSchema;
    const gift = giftSchema.safeParse(input.gift ?? {});
    if (!gift.success) {
      return { ok: false, error: "Informations cadeau invalides." };
    }

    return { ok: true };
  }

  if (input.mode === "delivery") {
    const client = clientInfoSchema.safeParse(input.client);
    if (!client.success) {
      return { ok: false, error: "Adresse et coordonnées requises." };
    }
    return { ok: true };
  }

  const client = pickupClientSchema.safeParse(input.client);
  if (!client.success) {
    return { ok: false, error: "Nom et téléphone requis." };
  }

  return { ok: true };
}

export const orderPaymentMethodSchema = z.enum([
  "mtn_momo",
  "moov_money",
  "celtiis_cash",
  "card",
]);
