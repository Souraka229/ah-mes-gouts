import { z } from "zod";

const phoneSchema = z
  .string()
  .min(8, "Numéro de téléphone invalide")
  .regex(/^[0-9+\s-]+$/, "Format de téléphone invalide");

export const clientInfoSchema = z.object({
  firstName: z.string().min(2, "Le prénom est requis"),
  lastName: z.string().min(2, "Le nom est requis"),
  phone: phoneSchema,
  address: z.string().min(5, "L'adresse est requise"),
  landmark: z.string().min(2, "Le repère est requis"),
  message: z.string().optional().default(""),
});

export const giftDetailsSchema = z.object({
  recipientName: z.string().min(2, "Le nom du destinataire est requis"),
  recipientPhone: phoneSchema,
  recipientAddress: z.string().min(5, "L'adresse de livraison est requise"),
  recipientLandmark: z.string().min(2, "Le repère est requis"),
  giftMessage: z
    .string()
    .max(280, "280 caractères maximum")
    .optional()
    .default(""),
  senderVisible: z.boolean(),
});

export const senderInfoSchema = z.object({
  firstName: z.string().min(2, "Votre prénom est requis"),
  lastName: z.string().min(2, "Votre nom est requis"),
  phone: phoneSchema,
});

export type ClientInfoFormValues = z.infer<typeof clientInfoSchema>;
export type GiftDetailsFormValues = z.infer<typeof giftDetailsSchema>;
