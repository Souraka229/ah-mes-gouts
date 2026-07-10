import { CATALOG_IMAGE_BG } from "@/lib/product-image-prompts";

const UPSELL_PROMPT_SUFFIX = `centered composition, shot on a solid seamless background in warm cream white (${CATALOG_IMAGE_BG}), soft studio lighting from top-left, gentle natural shadow directly under the product only, no gradient, no vignette, no colored background, no props, no text, no logo, no price tag, no watermark, clean minimal product photography, shallow depth of field on the product itself but background stays perfectly flat and solid, square or 4:5 vertical crop, high resolution, editorial product photography style`;

function buildUpsellPrompt(subject: string): string {
  return `Product photography of ${subject}, ${UPSELL_PROMPT_SUFFIX}`;
}

export const UPSELL_IMAGE_BASE = "/images/produits";

export type UpsellImageEntry = {
  slug: string;
  filename: string;
  subject: string;
  prompt: string;
};

export const UPSELL_PRODUCT_IMAGES: UpsellImageEntry[] = [
  {
    slug: "nounours-beige",
    filename: "nounours-beige.webp",
    subject:
      "a soft beige teddy bear with a small ribbon around its neck, sitting upright",
    prompt: "",
  },
  {
    slug: "bouquet-roses",
    filename: "bouquet-roses.webp",
    subject:
      "a bouquet of pink and white roses wrapped in elegant kraft paper with a ribbon",
    prompt: "",
  },
  {
    slug: "carte-cadeau",
    filename: "carte-cadeau.webp",
    subject:
      "a small heart-shaped gift card with a wax seal, elegant stationery style",
    prompt: "",
  },
].map((item) => ({
  ...item,
  prompt: buildUpsellPrompt(item.subject),
}));

export function getUpsellImageUrl(slug: string): string {
  const entry = UPSELL_PRODUCT_IMAGES.find((p) => p.slug === slug);
  return entry
    ? `${UPSELL_IMAGE_BASE}/${entry.filename}`
    : `${UPSELL_IMAGE_BASE}/carte-cadeau.webp`;
}

export const UPSELL_GIFT_SLUGS = [
  "nounours-beige",
  "bouquet-roses",
  "carte-cadeau",
] as const;

export type UpsellGiftSlug = (typeof UPSELL_GIFT_SLUGS)[number];
