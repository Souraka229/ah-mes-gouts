import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";

import { inferCategoryFromSlug } from "@/lib/admin/categories";
import { products as seedProducts } from "@/lib/mock-data";
import { normalizeProductImages, GIFT_CATALOG_OVERRIDE } from "@/lib/product-images";
import { getPrisma } from "@/lib/prisma";
import { getVariantsByProductIds } from "@/lib/server/variant-repository";
import type { Product } from "@/types/product";



export type AdminCatalogProduct = Product & {

  category: string;

};



// Pas de cache mémoire process (globalThis) ici volontairement : sur Vercel,
// chaque instance aurait sa propre copie et pourrait servir des données
// obsolètes après une modification admin. La lecture DB directe est assez
// rapide vu le volume (catalogue = quelques dizaines de produits). Le cache
// public (storefront) reste correctement géré via unstable_cache + tags
// dans lib/server/shop-catalog.ts.



/** Écriture auto interdite sur Vercel / prod — évite la réinjection démo après vidage. */
function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
  );
}

/** Visibilités admises — toute valeur inconnue retombe sur « publié ». */
export const PRODUCT_VISIBILITIES = ["draft", "published", "hidden"] as const;
export type ProductVisibilityValue = (typeof PRODUCT_VISIBILITIES)[number];

export function normalizeVisibility(value: string | null | undefined): ProductVisibilityValue {
  return PRODUCT_VISIBILITIES.includes(value as ProductVisibilityValue)
    ? (value as ProductVisibilityValue)
    : "published";
}

function seedCatalog(): AdminCatalogProduct[] {

  return seedProducts.map((product) => ({

    ...product,

    imageUrl: product.imageUrl,

    imageUrls: product.imageUrls ?? [product.imageUrl],

    category: inferCategoryFromSlug(product.slug),

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

  visibility: string;

  variantLabel: string | null;

  subtype: string | null;

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

    visibility: normalizeVisibility(row.visibility),

    variantLabel: row.variantLabel ?? undefined,

    subtype: row.subtype ?? undefined,

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

    visibility: normalizeVisibility(product.visibility),

    variantLabel: product.variantLabel?.trim() || null,

    subtype: product.subtype?.trim() || null,

    updatedAt: new Date(product.updatedAt),

  };

}



async function readCatalogFromDb(): Promise<AdminCatalogProduct[] | null> {
  try {
    const prisma = getPrisma();
    const rows = await prisma.product.findMany({ orderBy: { name: "asc" } });
    if (rows.length === 0) return null;
    return rows.map(toCatalogProduct);
  } catch {
    return null;
  }
}

async function writeCatalogToDb(catalog: AdminCatalogProduct[]): Promise<void> {
  if (isProductionRuntime() && catalog.length > 1) {
    console.warn(
      "[catalog] writeCatalogToDb bulk bloqué en production — utilisez l'admin ou seed:db",
    );
    return;
  }
  try {
    const prisma = getPrisma();

    /**
     * Garde-fou : cette écriture fait `deleteMany()` sur "Product", et
     * "ProductVariant" est en `onDelete: Cascade`. Un seul appel détruirait
     * donc **toutes les variantes de tous les produits** — tailles, prix,
     * ordre — sans confirmation. Aucun appelant aujourd'hui : on refuse plutôt
     * que de laisser ce piège armé.
     */
    const variantCount = await prisma.productVariant.count();
    if (variantCount > 0) {
      console.warn(
        `[catalog] écriture bulk refusée : ${variantCount} variante(s) en base seraient effacées en cascade.`,
      );
      return;
    }

    await prisma.$transaction([
      prisma.product.deleteMany(),
      prisma.product.createMany({ data: catalog.map(toProductRow) }),
    ]);
  } catch {
    // Mode dégradé sans Postgres
  }
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



/**
 * Attache les variantes de chaque produit — une seule requête pour tout le
 * catalogue (`in (...)`), jamais une par produit.
 *
 * Sans elles, la liste admin n'affichait que le prix d'entrée : un nounours
 * vendu de 10 000 à 100 000 F ressemblait à un article à 10 000 F, et
 * l'administrateur n'avait aucun moyen de voir ni corriger les paliers.
 *
 * `ProductVariantView` porte `productId` en plus : inutile ici, on le retire
 * pour ne pas alourdir la charge utile de l'API admin.
 */
async function withVariants(
  catalog: AdminCatalogProduct[],
): Promise<AdminCatalogProduct[]> {
  if (catalog.length === 0) return catalog;

  const byProduct = await getVariantsByProductIds(catalog.map((p) => p.id));
  if (byProduct.size === 0) return catalog;

  return catalog.map((product) => {
    const variants = byProduct.get(product.id);
    if (!variants?.length) return product;
    return {
      ...product,
      // `productId` sert de clé de regroupement, il n'a rien à faire dans la
      // charge utile renvoyée à l'admin.
      variants: variants.map((variant) => ({
        id: variant.id,
        code: variant.code,
        label: variant.label,
        price: variant.price,
        sortOrder: variant.sortOrder,
        isActive: variant.isActive,
        stockRemaining: variant.stockRemaining,
      })),
    };
  });
}

export async function getAdminCatalog(): Promise<AdminCatalogProduct[]> {
  const fromDb = await readCatalogFromDb();
  if (fromDb) return withVariants(applyGiftOverrides(fromDb));
  // Base vide = catalogue vide (prod + build Vercel). Dev local : fallback mémoire sans écriture.
  if (!isProductionRuntime()) {
    return withVariants(applyGiftOverrides(seedCatalog()));
  }
  return [];
}



export async function saveAdminCatalog(
  catalog: AdminCatalogProduct[],
): Promise<void> {
  await writeCatalogToDb(catalog);
  revalidateTag("catalog");
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

    | "visibility"

    | "variantLabel"

    | "subtype"

  >

>;



export async function createCatalogProduct(input: {
  name: string;
  price: number;
  category: string;
  description?: string;
  stock?: number;
  stockMinimum?: number;
  keyword?: string;
  imageUrl?: string;
  imageUrls?: string[];
  slug?: string;
  visibility?: ProductVisibilityValue;
  variantLabel?: string;
  subtype?: string;
}): Promise<AdminCatalogProduct> {
  const catalog = await getAdminCatalog();
  const baseSlug = (input.slug?.trim() || slugify(input.name)) || "produit";
  let slug = baseSlug;
  let n = 2;
  while (catalog.some((p) => p.slug === slug)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }

  const images = normalizeProductImages({
    imageUrl: input.imageUrl,
    imageUrls: input.imageUrls,
  });
  // Aucune image fournie : emplacement neutre, jamais celle d'un autre produit.
  // (Le repli sur mango-passion.webp attribuait la photo d'un entremets à un
  // produit qui n'en avait pas — contraire à la règle « jamais la photo d'un
  // autre produit », cf. components/shop/product-image-placeholder.tsx)
  const imageUrl = images.imageUrl || "";
  const imageUrls = images.imageUrls;

  const product: AdminCatalogProduct = {
    id: randomUUID(),
    slug,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    price: Math.round(input.price),
    imageUrl,
    imageUrls,
    keyword: input.keyword?.trim() || undefined,
    stockRemaining: input.stock ?? 10,
    stockMinimum: input.stockMinimum ?? 5,
    isNew: true,
    isPromotion: false,
    isMenuDuJour: false,
    isPopular: false,
    updatedAt: new Date().toISOString(),
    category: input.category,
    visibility: input.visibility ?? "published",
    variantLabel: input.variantLabel?.trim() || undefined,
    subtype: input.subtype?.trim() || undefined,
  };

  const prisma = getPrisma();
  await prisma.product.create({ data: toProductRow(product) });
  revalidateTag("catalog");
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

  revalidateTag("catalog");

  return updated;

}



export async function updateCatalogStock(

  ref: string,

  stock: number,

): Promise<AdminCatalogProduct> {

  return updateCatalogProduct(ref, { stockRemaining: stock });

}


