import { randomUUID } from "crypto";



import { products as seedProducts } from "@/lib/mock-data";

import { normalizeProductImages, GIFT_CATALOG_OVERRIDE } from "@/lib/product-images";

import { getPrisma } from "@/lib/prisma";

import type { Product } from "@/types/product";



export type AdminCatalogProduct = Product & {

  category: string;

};



declare global {

  var __amgAdminCatalog: AdminCatalogProduct[] | undefined;

}



function seedCatalog(): AdminCatalogProduct[] {

  return seedProducts.map((product) => ({

    ...product,

    imageUrl: product.imageUrl,

    imageUrls: product.imageUrls ?? [product.imageUrl],

    category:

      product.isGiftCard ||

      product.slug === "nounours-beige" ||

      product.slug === "bouquet-roses"

        ? "Cadeaux"

        : "Entremets",

  }));

}



function toCatalogProduct(row: {

  id: string;

  slug: string;

  name: string;

  description: string;

  price: number;

  imageUrl: string;

  imageUrls: string[];

  keyword: string | null;

  stockRemaining: number;

  stockMinimum: number;

  isNew: boolean;

  isPromotion: boolean;

  promotionPrice: number | null;

  isMenuDuJour: boolean;

  isPopular: boolean;

  isGiftCard: boolean;

  giftCardMessage: string | null;

  category: string;

  updatedAt: Date;

}): AdminCatalogProduct {
  const gift = GIFT_CATALOG_OVERRIDE[row.slug];
  const images = normalizeProductImages({
    imageUrl: gift?.imageUrl ?? row.imageUrl,
    imageUrls: gift?.imageUrls ?? row.imageUrls,
  });

  return {
    id: row.id,
    slug: row.slug,
    name: gift?.name ?? row.name,
    description: gift?.description ?? row.description,
    price: gift?.price ?? row.price,
    imageUrl: images.imageUrl,
    imageUrls: images.imageUrls,
    keyword: gift?.keyword ?? row.keyword ?? undefined,

    stockRemaining: row.stockRemaining,

    stockMinimum: row.stockMinimum,

    isNew: row.isNew,

    isPromotion: row.isPromotion,

    promotionPrice: row.promotionPrice ?? undefined,

    isMenuDuJour: row.isMenuDuJour,

    isPopular: row.isPopular,

    isGiftCard: row.isGiftCard || undefined,

    giftCardMessage: row.giftCardMessage ?? undefined,

    category: row.category,

    updatedAt: row.updatedAt.toISOString(),

  };

}



function toProductRow(product: AdminCatalogProduct) {

  const images = normalizeProductImages({

    imageUrl: product.imageUrl,

    imageUrls: product.imageUrls,

  });



  return {

    id: product.id,

    slug: product.slug,

    name: product.name,

    description: product.description,

    price: product.price,

    imageUrl: images.imageUrl,

    imageUrls: images.imageUrls,

    keyword: product.keyword?.trim() || null,

    stockRemaining: product.stockRemaining,

    stockMinimum: product.stockMinimum,

    isNew: product.isNew,

    isPromotion: product.isPromotion,

    promotionPrice: product.promotionPrice ?? null,

    isMenuDuJour: product.isMenuDuJour,

    isPopular: product.isPopular,

    isGiftCard: product.isGiftCard ?? false,

    giftCardMessage: product.giftCardMessage ?? null,

    category: product.category,

    updatedAt: new Date(product.updatedAt),

  };

}



async function readCatalogFromDb(): Promise<AdminCatalogProduct[] | null> {

  const prisma = getPrisma();

  const rows = await prisma.product.findMany({ orderBy: { name: "asc" } });

  if (rows.length === 0) return null;

  return rows.map(toCatalogProduct);

}



async function writeCatalogToDb(catalog: AdminCatalogProduct[]): Promise<void> {

  const prisma = getPrisma();

  await prisma.$transaction([

    prisma.product.deleteMany(),

    prisma.product.createMany({ data: catalog.map(toProductRow) }),

  ]);

}



function applyGiftOverrides(catalog: AdminCatalogProduct[]): AdminCatalogProduct[] {

  return catalog.map((product) => {

    const gift = GIFT_CATALOG_OVERRIDE[product.slug];

    if (!gift) return product;

    const images = normalizeProductImages({

      imageUrl: gift.imageUrl,

      imageUrls: gift.imageUrls,

    });

    return {

      ...product,

      name: gift.name,

      description: gift.description,

      price: gift.price,

      keyword: gift.keyword,

      imageUrl: images.imageUrl,

      imageUrls: images.imageUrls,

      isPromotion: false,

      promotionPrice: undefined,

    };

  });

}



export async function getAdminCatalog(): Promise<AdminCatalogProduct[]> {

  if (globalThis.__amgAdminCatalog) {

    return applyGiftOverrides(globalThis.__amgAdminCatalog);

  }

  const fromDb = await readCatalogFromDb();

  const catalog = fromDb ?? seedCatalog();

  if (!fromDb) await writeCatalogToDb(catalog);

  globalThis.__amgAdminCatalog = catalog;

  return applyGiftOverrides(catalog);

}



export async function saveAdminCatalog(

  catalog: AdminCatalogProduct[],

): Promise<void> {

  globalThis.__amgAdminCatalog = catalog;

  await writeCatalogToDb(catalog);

}



export async function findCatalogProduct(

  ref: string,

): Promise<AdminCatalogProduct | undefined> {

  const catalog = await getAdminCatalog();

  const q = ref.trim().toLowerCase();

  return catalog.find(

    (p) =>

      p.id === ref ||

      p.slug === q ||

      p.name.toLowerCase() === q ||

      p.name.toLowerCase().includes(q),

  );

}



function slugify(name: string): string {

  return name

    .toLowerCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/^-|-$/g, "");

}



export type CatalogProductPatch = Partial<

  Pick<

    AdminCatalogProduct,

    | "name"

    | "price"

    | "description"

    | "category"

    | "isPromotion"

    | "promotionPrice"

    | "imageUrl"

    | "imageUrls"

    | "keyword"

    | "stockRemaining"

    | "stockMinimum"

  >

>;



export async function createCatalogProduct(input: {

  name: string;

  price: number;

  category: string;

  description?: string;

  stock?: number;

  supplements?: string[];

}): Promise<AdminCatalogProduct> {

  const imageUrl = "/images/produits/mangue-passion.webp";

  const product: AdminCatalogProduct = {

    id: randomUUID(),

    slug: slugify(input.name),

    name: input.name,

    description: input.description ?? "",

    price: input.price,

    imageUrl,

    imageUrls: [imageUrl],

    stockRemaining: input.stock ?? 10,

    stockMinimum: 5,

    isNew: true,

    isPromotion: false,

    isMenuDuJour: false,

    isPopular: false,

    updatedAt: new Date().toISOString(),

    category: input.category,

  };



  const prisma = getPrisma();

  await prisma.product.create({ data: toProductRow(product) });

  globalThis.__amgAdminCatalog = undefined;

  return product;

}



export async function updateCatalogProduct(

  ref: string,

  patch: CatalogProductPatch,

): Promise<AdminCatalogProduct> {

  const catalog = await getAdminCatalog();

  const index = catalog.findIndex(

    (p) =>

      p.id === ref ||

      p.slug === ref ||

      p.name.toLowerCase() === ref.toLowerCase(),

  );

  if (index < 0) throw new Error(`Produit introuvable : ${ref}`);



  const current = catalog[index]!;

  const merged = { ...current, ...patch };

  const images = normalizeProductImages({

    imageUrl: merged.imageUrl,

    imageUrls: merged.imageUrls,

  });



  const updated: AdminCatalogProduct = {

    ...merged,

    imageUrl: images.imageUrl,

    imageUrls: images.imageUrls,

    price: Math.round(merged.price),

    promotionPrice:

      merged.promotionPrice !== undefined && merged.promotionPrice !== null

        ? Math.round(merged.promotionPrice)

        : undefined,

    isPromotion:

      merged.isPromotion &&

      merged.promotionPrice !== undefined &&

      merged.promotionPrice > 0,

    updatedAt: new Date().toISOString(),

  };



  const prisma = getPrisma();

  await prisma.product.update({

    where: { id: updated.id },

    data: toProductRow(updated),

  });

  globalThis.__amgAdminCatalog = undefined;

  return updated;

}



export async function updateCatalogStock(

  ref: string,

  stock: number,

): Promise<AdminCatalogProduct> {

  return updateCatalogProduct(ref, { stockRemaining: stock });

}


