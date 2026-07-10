import type { Product } from "@/types/product";
import { getUpsellImageUrl } from "@/lib/upsell-images";

const PRODUCT_IMAGE_BASE = "/images/produits";
const POSTER_IMAGE_BASE = `${PRODUCT_IMAGE_BASE}/affiches`;

/** Visuels produits — WhatsApp rognés (VERSION A, sans texte). */
const PRODUCT_IMAGES: Record<string, string> = {
  "mango-passion": `${PRODUCT_IMAGE_BASE}/mangue-passion.webp`,
  "goyave-vanille": `${PRODUCT_IMAGE_BASE}/goyave-vanille.webp`,
  "caramel-cappuccino": `${PRODUCT_IMAGE_BASE}/caramel-cappuccino.webp`,
  "caramel-baileys": `${PRODUCT_IMAGE_BASE}/oreos-caramel-baileys.webp`,
  "vanilla-caramel": `${PRODUCT_IMAGE_BASE}/vanilla-caramel.webp`,
  tiramisu: `${PRODUCT_IMAGE_BASE}/tiramisu-caramel.webp`,
  "foret-blanche": `${PRODUCT_IMAGE_BASE}/foret-blanche.webp`,
  "nutella-caramel": `${PRODUCT_IMAGE_BASE}/nutella-baileys-speculos.webp`,
  speculoos: `${PRODUCT_IMAGE_BASE}/chocolat-cappuccino.webp`,
  "mousse-chocolat": `${PRODUCT_IMAGE_BASE}/foret-noire.webp`,
  "carte-cadeau": `${PRODUCT_IMAGE_BASE}/goyave-vanille.webp`,
};

/** Affiches marketing (VERSION B — nom + prix dans l'image). */
const POSTER_IMAGES: Record<string, string> = {
  "caramel-baileys": `${POSTER_IMAGE_BASE}/oreos-caramel-baileys-poster.webp`,
  tiramisu: `${POSTER_IMAGE_BASE}/tiramisu-caramel-poster.webp`,
  "nutella-caramel": `${POSTER_IMAGE_BASE}/nutella-baileys-speculos-poster.webp`,
  "mousse-chocolat": `${POSTER_IMAGE_BASE}/foret-noire-poster.webp`,
  "goyave-vanille": `${POSTER_IMAGE_BASE}/goyave-vanille-poster.webp`,
};

/** Visuels landing complémentaires (hors slug catalogue). */
export const LANDING_EXTRA_IMAGES = {
  leCafe: `${PRODUCT_IMAGE_BASE}/le-cafe.webp`,
  chocolatMenthe: `${PRODUCT_IMAGE_BASE}/chocolat-menthe.webp`,
} as const;

/** Galerie par défaut [produit, affiche] pour les imports Gift. */
export const GIFT_GALLERY_BY_SLUG: Record<string, string[]> = {
  "caramel-baileys": [
    PRODUCT_IMAGES["caramel-baileys"]!,
    POSTER_IMAGES["caramel-baileys"]!,
  ],
  tiramisu: [PRODUCT_IMAGES.tiramisu!, POSTER_IMAGES.tiramisu!],
  "nutella-caramel": [
    PRODUCT_IMAGES["nutella-caramel"]!,
    POSTER_IMAGES["nutella-caramel"]!,
  ],
  "mousse-chocolat": [
    PRODUCT_IMAGES["mousse-chocolat"]!,
    POSTER_IMAGES["mousse-chocolat"]!,
  ],
  "goyave-vanille": [
    PRODUCT_IMAGES["goyave-vanille"]!,
    POSTER_IMAGES["goyave-vanille"]!,
  ],
};

/** Métadonnées catalogue alignées sur les flyers (priorité lecture runtime). */
export const GIFT_CATALOG_OVERRIDE: Record<
  string,
  {
    name: string;
    price: number;
    keyword: string;
    description: string;
    imageUrl: string;
    imageUrls: string[];
  }
> = {
  "caramel-baileys": {
    name: "Oreos Caramel Baileys",
    price: 5000,
    keyword: "Signature",
    description:
      "Cœur velours bleu, Oreo croquant, caramel beurre salé et touche Baileys.",
    imageUrl: PRODUCT_IMAGES["caramel-baileys"]!,
    imageUrls: GIFT_GALLERY_BY_SLUG["caramel-baileys"]!,
  },
  tiramisu: {
    name: "Tiramisu Caramel",
    price: 5000,
    keyword: "Onctueux",
    description:
      "Mascarpone onctueux, biscuit café imbibé et caramel doré en finition.",
    imageUrl: PRODUCT_IMAGES.tiramisu!,
    imageUrls: GIFT_GALLERY_BY_SLUG.tiramisu!,
  },
  "nutella-caramel": {
    name: "Nutella Baileys Speculos",
    price: 7000,
    keyword: "Gourmand",
    description:
      "Nutella fondant, Baileys, speculoos croustillant — cœur beige généreux.",
    imageUrl: PRODUCT_IMAGES["nutella-caramel"]!,
    imageUrls: GIFT_GALLERY_BY_SLUG["nutella-caramel"]!,
  },
  "mousse-chocolat": {
    name: "Forêt Noire",
    price: 5000,
    keyword: "Intense",
    description:
      "Chocolat noir intense, cerises et crème légère — cylindre signature.",
    imageUrl: PRODUCT_IMAGES["mousse-chocolat"]!,
    imageUrls: GIFT_GALLERY_BY_SLUG["mousse-chocolat"]!,
  },
};

export const DEFAULT_PRODUCT_IMAGE = PRODUCT_IMAGES["mango-passion"]!;

export const DEFAULT_OG_IMAGE_PATH = DEFAULT_PRODUCT_IMAGE;

export const LANDING_POSTER_IMAGES = {
  tiramisuPoster: POSTER_IMAGES.tiramisu!,
  oreosPoster: POSTER_IMAGES["caramel-baileys"]!,
  nutellaPoster: POSTER_IMAGES["nutella-caramel"]!,
  foretNoirePoster: POSTER_IMAGES["mousse-chocolat"]!,
} as const;

export function getProductPosterUrl(slug: string): string | undefined {
  return POSTER_IMAGES[slug];
}

export function getProductImageUrl(slug: string, fallback?: string): string {
  return (
    PRODUCT_IMAGES[slug] ??
    getUpsellImageUrl(slug) ??
    fallback ??
    DEFAULT_PRODUCT_IMAGE
  );
}

export function getProduitImagePath(slug: string): string | undefined {
  return PRODUCT_IMAGES[slug];
}

const MAX_GALLERY_IMAGES = 3;

export function normalizeProductImages(input: {
  imageUrl?: string;
  imageUrls?: string[];
}): { imageUrl: string; imageUrls: string[] } {
  const fromArray = (input.imageUrls ?? []).filter(Boolean).slice(0, MAX_GALLERY_IMAGES);
  const primary = fromArray[0] ?? input.imageUrl?.trim() ?? "";
  const imageUrls = fromArray.length > 0 ? fromArray : primary ? [primary] : [];
  return {
    imageUrl: imageUrls[0] ?? "",
    imageUrls,
  };
}

export function getProductGalleryImages(
  product: Pick<Product, "imageUrl" | "imageUrls" | "slug">,
): string[] {
  const normalized = normalizeProductImages(product);
  if (normalized.imageUrls.length > 1) return normalized.imageUrls;
  const giftDefault = GIFT_GALLERY_BY_SLUG[product.slug ?? ""];
  if (giftDefault?.length) return giftDefault.slice(0, MAX_GALLERY_IMAGES);
  return normalized.imageUrls;
}

export function setGallerySlot(
  current: string[],
  index: number,
  url: string | null,
): string[] {
  const next = [...current.slice(0, MAX_GALLERY_IMAGES)];
  while (next.length < MAX_GALLERY_IMAGES) next.push("");
  if (url) {
    next[index] = url;
  } else {
    next[index] = "";
  }
  return next.filter(Boolean).slice(0, MAX_GALLERY_IMAGES);
}

export const PRODUCT_GALLERY_MAX = MAX_GALLERY_IMAGES;
