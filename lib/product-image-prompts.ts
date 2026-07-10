/** Fond catalogue = --color-bg (#FAF7F5) — doit matcher les images générées. */
export const CATALOG_IMAGE_BG = "#FAF7F5";

const PROMPT_SUFFIX = `centered composition, shot on a solid seamless background in warm cream white (${CATALOG_IMAGE_BG}), soft studio lighting from top-left, gentle natural shadow directly under the product only, no gradient, no vignette, no colored background, no props, no text, no logo, no price tag, no watermark, no phone number, clean minimal food photography, shallow depth of field on the product itself but background stays perfectly flat and solid, square or 4:5 vertical crop, high resolution, editorial dessert photography style`;

function buildPrompt(subject: string): string {
  return `Product photography of ${subject}, ${PROMPT_SUFFIX}`;
}

export type CatalogProductImage = {
  slug: string;
  filename: string;
  subject: string;
  prompt: string;
};

export const CATALOG_PRODUCT_IMAGES: CatalogProductImage[] = [
  {
    slug: "mango-passion",
    filename: "mango-passion.webp",
    subject:
      "a slice of mango passion fruit cake topped with a fresh strawberry and blackberry",
    prompt: "",
  },
  {
    slug: "goyave-vanille",
    filename: "goyave-vanille.webp",
    subject:
      "a pink guava vanilla entremet with a heart-shaped fondant decoration",
    prompt: "",
  },
  {
    slug: "caramel-cappuccino",
    filename: "caramel-cappuccino.webp",
    subject:
      "a caramel cappuccino entremet with coffee cream layers and speculoos crunch",
    prompt: "",
  },
  {
    slug: "caramel-baileys",
    filename: "caramel-baileys.webp",
    subject:
      "an Oreo caramel Baileys dessert with meringue swirl on top",
    prompt: "",
  },
  {
    slug: "vanilla-caramel",
    filename: "vanilla-caramel.webp",
    subject:
      "a vanilla caramel entremet with salted caramel drip and chocolate shards",
    prompt: "",
  },
  {
    slug: "tiramisu",
    filename: "tiramisu.webp",
    subject:
      "a tiramisu entremet with mascarpone layers and cocoa dust finish",
    prompt: "",
  },
  {
    slug: "foret-blanche",
    filename: "foret-blanche.webp",
    subject:
      "a foret blanche white chocolate entremet with candied cherry garnish",
    prompt: "",
  },
  {
    slug: "nutella-caramel",
    filename: "nutella-caramel.webp",
    subject:
      "a Nutella hazelnut caramel dessert with milk chocolate curls",
    prompt: "",
  },
  {
    slug: "speculoos",
    filename: "speculoos.webp",
    subject:
      "a chocolate Lotus biscuit dessert cup with caramel drizzle and marshmallow",
    prompt: "",
  },
  {
    slug: "mousse-chocolat",
    filename: "mousse-chocolat.webp",
    subject:
      "a dark chocolate mousse dessert with cherry compote and vanilla cream",
    prompt: "",
  },
  {
    slug: "carte-cadeau",
    filename: "carte-cadeau.webp",
    subject:
      "an elegant minimal gift card envelope with a subtle ribbon, completely blank with no writing",
    prompt: "",
  },
].map((item) => ({
  ...item,
  prompt: buildPrompt(item.subject),
}));

import { getProduitImagePath } from "@/lib/product-images";

export const CATALOG_IMAGE_BASE = "/images/produits";

export function getCatalogImagePath(slug: string): string | undefined {
  return getProduitImagePath(slug);
}
