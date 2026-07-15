import { z } from "zod";

export const crmActivitySchema = z.object({
  deviceKey: z.string().min(16).max(80),
  type: z.enum([
    "product_view",
    "add_to_cart",
    "checkout_start",
    "order_placed",
  ]),
  productId: z.string().max(80).optional(),
  productSlug: z.string().max(120).optional(),
  productName: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const crmLinkSchema = z.object({
  deviceKey: z.string().min(16).max(80),
  phone: z.string().min(8).max(32),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
});

export const crmOtpRequestSchema = z.object({
  phone: z.string().min(8).max(32),
});

export const crmOtpVerifySchema = z.object({
  phone: z.string().min(8).max(32),
  code: z.string().min(4).max(8),
  deviceKey: z.string().min(16).max(80),
});
