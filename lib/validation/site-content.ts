import { z } from "zod";

const imageUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (v) =>
      v.startsWith("/") ||
      v.startsWith("https://res.cloudinary.com/") ||
      v.startsWith("https://"),
    "URL d'image invalide",
  );

const hrefSchema = z
  .string()
  .min(1)
  .max(512)
  .refine(
    (v) => v.startsWith("/") || v.startsWith("https://") || v.startsWith("#"),
    "Lien invalide",
  );

export const heroContentSchema = z.object({
  titleLine1: z.string().min(1).max(40),
  titleLine2: z.string().min(1).max(40),
  sublinePrefix: z.string().min(1).max(80),
  sublineHighlight: z.string().min(1).max(40),
  imageUrl: imageUrlSchema,
  ctaLabel: z.string().min(1).max(24),
  ctaHref: hrefSchema,
  menuBadgeLabel: z.string().min(1).max(48),
});

export const giftTeaserContentSchema = z.object({
  title: z.string().min(1).max(80),
  itemSlugs: z.array(z.string().min(1).max(64)).min(1).max(6),
});

export const productGridContentSchema = z.object({
  eyebrow: z.string().min(1).max(40),
  titleLine1: z.string().min(1).max(60),
  titleLine2: z.string().min(1).max(60),
  packsSectionTitle: z.string().min(1).max(60),
});

export const storytellingContentSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(600),
  imageUrl: imageUrlSchema,
});

export const typoBandContentSchema = z.object({
  variant: z.enum(["scroll", "rotate"]),
  primaryText: z.string().min(1).max(120),
  rotateMessages: z.array(z.string().min(1).max(120)).min(1).max(5),
});

export const signatureMomentContentSchema = z.object({
  text: z.string().min(1).max(160),
});

export const footerContentSchema = z.object({
  phone: z.string().min(6).max(24),
  instagramHandle: z.string().min(1).max(48),
});

export const sectionContentSchemaByKey = {
  hero: heroContentSchema,
  gift_teaser: giftTeaserContentSchema,
  product_grid: productGridContentSchema,
  storytelling: storytellingContentSchema,
  typo_band: typoBandContentSchema,
  signature_moment: signatureMomentContentSchema,
  footer: footerContentSchema,
} as const;

export const siteSettingsSchema = z.object({
  siteName: z.string().min(1).max(80),
  logoUrl: z.string().max(2048),
  faviconUrl: z.string().max(2048),
  brandColors: z.object({
    bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  notificationTemplates: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      label: z.string().min(1).max(80),
      body: z.string().min(1).max(1000),
    }),
  ),
});

export function validateSectionContent(
  sectionKey: keyof typeof sectionContentSchemaByKey,
  content: unknown,
) {
  return sectionContentSchemaByKey[sectionKey].safeParse(content);
}
