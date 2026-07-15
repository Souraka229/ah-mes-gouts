import {
  GIFT_CARD_SLUG,
} from "@/lib/constants/products";
import { PRODUCT_SHAPE_BY_SLUG } from "@/lib/business-info";
import { getProductImageUrl } from "@/lib/product-images";
import type { Product } from "@/types/product";

type ProductSeed = Omit<Product, "updatedAt">;

function withShape(seed: ProductSeed): ProductSeed {
  const shape = PRODUCT_SHAPE_BY_SLUG[seed.slug];
  return shape ? { ...seed, shape } : seed;
}

const PRODUCT_SEEDS: ProductSeed[] = [
  withShape({
    id: "1",
    slug: "vanilla-caramel",
    name: "Vanilla Caramel",
    description:
      "Cœur velours vanille, coulis caramel beurre salé et éclats de chocolat.",
    price: 5000,
    imageUrl: getProductImageUrl("vanilla-caramel"),
    stockRemaining: 12,
    stockMinimum: 5,
    isNew: false,
    isPromotion: true,
    promotionPrice: 4500,
    isMenuDuJour: false,
    isPopular: true,
  }),
  withShape({
    id: "2",
    slug: "mango-passion",
    name: "Mango Passion",
    description:
      "Mangue Alphonso, fruit de la passion et touche citron vert.",
    price: 5000,
    imageUrl: getProductImageUrl("mango-passion"),
    stockRemaining: 8,
    stockMinimum: 5,
    isNew: true,
    isPromotion: false,
    isMenuDuJour: true,
    isPopular: true,
  }),
  withShape({
    id: "3",
    slug: "goyave-vanille",
    name: "Goyave Vanille",
    description:
      "Goyave rose, vanille de Madagascar et meringue dorée.",
    price: 5000,
    imageUrl: getProductImageUrl("goyave-vanille"),
    stockRemaining: 6,
    stockMinimum: 5,
    isNew: true,
    isPromotion: false,
    isMenuDuJour: true,
    isPopular: false,
  }),
  withShape({
    id: "4",
    slug: "caramel-cappuccino",
    name: "Caramel Cappuccino",
    description:
      "L'intensité du café, la douceur du caramel et une touche de speculoos.",
    price: 5000,
    imageUrl: getProductImageUrl("caramel-cappuccino"),
    stockRemaining: 10,
    stockMinimum: 5,
    isNew: false,
    isPromotion: false,
    isMenuDuJour: false,
    isPopular: true,
  }),
  withShape({
    id: "5",
    slug: "tiramisu",
    name: "Tiramisu Caramel",
    description:
      "Mascarpone onctueux, biscuit café imbibé et caramel doré en finition.",
    price: 5000,
    imageUrl: getProductImageUrl("tiramisu"),
    stockRemaining: 0,
    stockMinimum: 5,
    isNew: false,
    isPromotion: false,
    isMenuDuJour: false,
    isPopular: true,
  }),
  withShape({
    id: "6",
    slug: "foret-blanche",
    name: "Forêt Blanche",
    description:
      "Chocolat blanc, cerises confites et crème légère à la vanille.",
    price: 5000,
    imageUrl: getProductImageUrl("foret-blanche"),
    stockRemaining: 15,
    stockMinimum: 5,
    isNew: false,
    isPromotion: true,
    promotionPrice: 4200,
    isMenuDuJour: false,
    isPopular: true,
  }),
  withShape({
    id: "7",
    slug: "nutella-caramel",
    name: "Nutella Baileys Speculos",
    description:
      "Nutella fondant, Baileys, speculoos croustillant — cœur beige généreux.",
    price: 7000,
    imageUrl: getProductImageUrl("nutella-caramel"),
    stockRemaining: 9,
    stockMinimum: 5,
    isNew: false,
    isPromotion: false,
    isMenuDuJour: true,
    isPopular: true,
  }),
  withShape({
    id: "8",
    slug: "caramel-baileys",
    name: "Oreos Caramel Baileys",
    description:
      "Cœur velours bleu, Oreo croquant, caramel beurre salé et touche Baileys.",
    price: 5000,
    imageUrl: getProductImageUrl("caramel-baileys"),
    stockRemaining: 4,
    stockMinimum: 5,
    isNew: true,
    isPromotion: false,
    isMenuDuJour: true,
    isPopular: false,
  }),
  withShape({
    id: "9",
    slug: "speculoos",
    name: "Speculoos",
    description:
      "L'élégance gourmande du speculoos dans chaque bouchée.",
    price: 5000,
    imageUrl: getProductImageUrl("speculoos"),
    stockRemaining: 7,
    stockMinimum: 5,
    isNew: false,
    isPromotion: false,
    isMenuDuJour: false,
    isPopular: false,
  }),
  withShape({
    id: "10",
    slug: "mousse-chocolat",
    name: "Forêt Noire",
    description:
      "Chocolat noir intense, cerises et crème légère — cylindre signature.",
    price: 5000,
    imageUrl: getProductImageUrl("mousse-chocolat"),
    stockRemaining: 20,
    stockMinimum: 8,
    isNew: false,
    isPromotion: false,
    isMenuDuJour: false,
    isPopular: true,
  }),
  {
    id: "11",
    slug: "carte-cadeau",
    name: "Carte cadeau",
    description:
      "Un mot doux imprimé pour accompagner votre surprise gourmande.",
    price: 500,
    imageUrl: getProductImageUrl("carte-cadeau"),
    stockRemaining: 50,
    stockMinimum: 10,
    isNew: false,
    isPromotion: false,
    isMenuDuJour: false,
    isPopular: false,
    isGiftCard: true,
    giftCardMessage:
      "Quelqu'un pense à toi — profite de cette douceur avec tout mon amour.",
  },
  {
    id: "12",
    slug: "nounours-beige",
    name: "Nounours beige",
    description:
      "Peluche douce avec ruban — le cadeau parfait à côté de vos glaces.",
    price: 10000,
    imageUrl: getProductImageUrl("nounours-beige"),
    stockRemaining: 25,
    stockMinimum: 5,
    isNew: true,
    isPromotion: false,
    isMenuDuJour: false,
    isPopular: false,
  },
  {
    id: "13",
    slug: "bouquet-roses",
    name: "Bouquet de roses",
    description:
      "Roses roses et blanches, papier kraft et ruban élégant.",
    price: 8000,
    imageUrl: getProductImageUrl("bouquet-roses"),
    stockRemaining: 12,
    stockMinimum: 3,
    isNew: true,
    isPromotion: false,
    isMenuDuJour: false,
    isPopular: true,
  },
];

const BASE_UPDATED_AT = new Date("2026-06-28T10:00:00.000Z");

export const products: Product[] = PRODUCT_SEEDS.map((product, index) => ({
  ...product,
  updatedAt: new Date(
    BASE_UPDATED_AT.getTime() - index * 24 * 60 * 60 * 1000,
  ).toISOString(),
}));

export const menuDuJour = products.filter((p) => p.isMenuDuJour);

const MENU_DU_JOUR_KEYWORDS: Record<string, string> = {
  "mango-passion": "Solaire",
  "goyave-vanille": "Floral",
  "caramel-baileys": "Signature",
  "nutella-caramel": "Gourmand",
};

export type MenuShowcaseItem = {
  id: string;
  name: string;
  keyword: string;
  price: number;
  image: string;
  slug: string;
};

/** Quatre créations du menu du jour — nouveautés en stock, triées par fraîcheur. */
export function getMenuDuJourShowcase(): MenuShowcaseItem[] {
  return menuDuJour
    .filter(isProductAvailable)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 4)
    .map((product) => ({
      id: product.slug,
      name: product.name,
      keyword: MENU_DU_JOUR_KEYWORDS[product.slug] ?? "Du jour",
      price: getProductPrice(product),
      image: product.imageUrl,
      slug: product.slug,
    }));
}

export const popularProducts = products.filter((p) => p.isPopular);
export const promotionProducts = products.filter((p) => p.isPromotion);

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

const galleryExtras: Record<string, string[]> = {
  "vanilla-caramel": [
    getProductImageUrl("caramel-cappuccino"),
    getProductImageUrl("foret-blanche"),
  ],
  "mango-passion": [
    getProductImageUrl("goyave-vanille"),
    getProductImageUrl("caramel-baileys"),
  ],
};

export function getProductGallery(product: Product): string[] {
  const extras = galleryExtras[product.slug] ?? [
    getProductImageUrl("foret-blanche"),
    getProductImageUrl("tiramisu"),
  ];

  return Array.from(new Set([product.imageUrl, ...extras]));
}

export function getProductPrice(product: Product): number {
  if (product.isPromotion && product.promotionPrice !== undefined) {
    return product.promotionPrice;
  }
  return product.price;
}

export function isProductAvailable(product: Product): boolean {
  return product.stockRemaining > 0;
}

export function getGiftCardProduct(): Product | undefined {
  return products.find((p) => p.isGiftCard);
}

export function isGiftCardProduct(product: Product): boolean {
  return product.isGiftCard === true || product.slug === GIFT_CARD_SLUG;
}

export function getUpsellProducts(excludeProductIds: string[] = []): Product[] {
  const upsellSlugs = ["carte-cadeau", "nounours-beige", "bouquet-roses"];
  return products.filter(
    (product) =>
      upsellSlugs.includes(product.slug) &&
      isProductAvailable(product) &&
      !excludeProductIds.includes(product.id),
  );
}

/** Produits indexables : en stock uniquement (crawl budget → pages convertibles). */
export function getIndexableProducts(): Product[] {
  return products.filter(isProductAvailable);
}

export function getSimilarProducts(
  slug: string,
  limit = 4,
): Product[] {
  const current = getProductBySlug(slug);
  if (!current) return [];

  return products
    .filter(
      (product) =>
        product.slug !== slug && isProductAvailable(product),
    )
    .sort((a, b) => {
      const score = (p: Product) =>
        (p.isPopular ? 2 : 0) +
        (p.isMenuDuJour ? 1 : 0) +
        (current.isPromotion && p.isPromotion ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}

export function getPriceBounds(items: Product[]): [number, number] {
  const prices = items.map(getProductPrice);
  return [Math.min(...prices), Math.max(...prices)];
}

export function isGiftBandProduct(product: Product): boolean {
  return (
    isGiftCardProduct(product) ||
    product.slug === "nounours-beige" ||
    product.slug === "bouquet-roses"
  );
}

export function filterProducts(
  items: Product[],
  filters: {
    search: string;
    priceRange: [number, number];
    inStockOnly: boolean;
    newOnly: boolean;
    promotionsOnly: boolean;
    giftsOnly?: boolean;
  },
): Product[] {
  const query = filters.search.trim().toLowerCase();

  return items.filter((product) => {
    const price = getProductPrice(product);
    const matchesSearch =
      query.length === 0 ||
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);
    const matchesPrice =
      price >= filters.priceRange[0] && price <= filters.priceRange[1];
    const matchesStock =
      !filters.inStockOnly || isProductAvailable(product);
    const matchesNew = !filters.newOnly || product.isNew;
    const matchesPromo =
      !filters.promotionsOnly || product.isPromotion;
    const matchesGifts =
      !filters.giftsOnly || isGiftBandProduct(product);

    return (
      matchesSearch &&
      matchesPrice &&
      matchesStock &&
      matchesNew &&
      matchesPromo &&
      matchesGifts
    );
  });
}
