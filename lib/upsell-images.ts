import { CATALOG_IMAGE_BG } from "@/lib/product-image-prompts";

const UPSELL_PROMPT_SUFFIX = `centered composition, shot on a solid seamless background in warm cream white (${CATALOG_IMAGE_BG}), soft studio lighting from top-left, gentle natural shadow directly under the product only, no gradient, no vignette, no colored background, no props, no text, no logo, no price tag, no watermark, clean minimal product photography, shallow depth of field on the product itself but background stays perfectly flat and solid, square or 4:5 vertical crop, high resolution, editorial product photography style`;

function buildUpsellPrompt(subject: string): string {
  return `Product photography of ${subject}, ${UPSELL_PROMPT_SUFFIX}`;
}

export type UpsellImageEntry = {
  slug: string;
  /**
   * Chemin complet, pas un nom de fichier : les visuels cadeaux ne vivent pas
   * tous dans le même dossier. La carte cadeau est dans `catalog/`, le
   * nounours et le bouquet dans `produits/`. Un `base` commun renvoyait vers
   * un fichier inexistant et cassait l'image.
   */
  path: string;
  subject: string;
  prompt: string;
};

export const UPSELL_PRODUCT_IMAGES: UpsellImageEntry[] = [
  {
    slug: "nounours",
    path: "/images/produits/nounours-beige.webp",
    subject:
      "a soft beige teddy bear with a small ribbon around its neck, sitting upright",
    prompt: "",
  },
  {
    slug: "bouquet-roses",
    path: "/images/produits/bouquet-roses.webp",
    subject:
      "a bouquet of pink and white roses wrapped in elegant kraft paper with a ribbon",
    prompt: "",
  },
  {
    slug: "carte-cadeau",
    path: "/images/catalog/carte-cadeau.webp",
    subject:
      "a small heart-shaped gift card with a wax seal, elegant stationery style",
    prompt: "",
  },
].map((item) => ({
  ...item,
  prompt: buildUpsellPrompt(item.subject),
}));

/**
 * Visuel d'un produit cadeau, ou `undefined` si le slug n'en est pas un.
 *
 * Volontairement `undefined` plutôt qu'un repli : l'appelant enchaîne ses
 * propres replis, et renvoyer ici une carte cadeau pour n'importe quel slug
 * inconnu rendait son dernier repli inatteignable — un nouvel entremets sans
 * visuel se retrouvait affiché avec une carte cadeau.
 */
export function getUpsellImageUrl(slug: string): string | undefined {
  return UPSELL_PRODUCT_IMAGES.find((p) => p.slug === slug)?.path;
}

export const UPSELL_GIFT_SLUGS = [
  "nounours",
  "bouquet-roses",
  "carte-cadeau",
] as const;

export type UpsellGiftSlug = (typeof UPSELL_GIFT_SLUGS)[number];
