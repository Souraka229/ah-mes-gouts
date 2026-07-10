/**
 * Migre les URLs images/catalog → images/produits en base Postgres uniquement.
 * node scripts/migrate-site-images.mjs
 */
import { PrismaClient } from "@prisma/client";

const CATALOG_TO_PRODUITS = {
  "mango-passion.webp": "mangue-passion.webp",
  "goyave-vanille.webp": "goyave-vanille.webp",
  "caramel-cappuccino.webp": "caramel-cappuccino.webp",
  "caramel-baileys.webp": "oreos-caramel-baileys.webp",
  "nutella-caramel.webp": "nutella-caramel-baileys.webp",
  "vanilla-caramel.webp": "caramel-cappuccino.webp",
  "tiramisu.webp": "tiramisu-rose.webp",
  "foret-blanche.webp": "foret-blanche.webp",
  "speculoos.webp": "chocolat-cappuccino.webp",
  "mousse-chocolat.webp": "chocolat-menthe.webp",
  "carte-cadeau.webp": "goyave-vanille.webp",
};

function migrateUrl(url) {
  if (typeof url !== "string") return url;
  let next = url;
  for (const [catalogFile, produitFile] of Object.entries(CATALOG_TO_PRODUITS)) {
    next = next.replace(
      `/images/catalog/${catalogFile}`,
      `/images/produits/${produitFile}`,
    );
  }
  if (next.includes("/images/catalog/")) {
    next = next.replace("/images/catalog/", "/images/produits/");
  }
  return next;
}

function walk(value) {
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "imageUrl" && typeof v === "string") {
        out[k] = migrateUrl(v);
      } else {
        out[k] = walk(v);
      }
    }
    return out;
  }
  return value;
}

const prisma = new PrismaClient();

try {
  const row = await prisma.siteContentStore.findUnique({
    where: { id: "default" },
  });
  if (row?.data) {
    await prisma.siteContentStore.update({
      where: { id: "default" },
      data: { data: walk(row.data) },
    });
    console.log("✓ SiteContentStore");
  }

  const products = await prisma.product.findMany();
  let updated = 0;
  for (const product of products) {
    const imageUrl = migrateUrl(product.imageUrl);
    const imageUrls = (product.imageUrls ?? []).map(migrateUrl);
    if (imageUrl !== product.imageUrl || imageUrls.some((u, i) => u !== product.imageUrls[i])) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          imageUrl,
          imageUrls: imageUrls.length > 0 ? imageUrls : [imageUrl],
        },
      });
      updated++;
    }
  }
  console.log(`✓ Product (${updated} mis à jour)`);
} catch (e) {
  console.warn(`⚠ ${e.message}`);
} finally {
  await prisma.$disconnect();
}

console.log("\nMigration terminée (Postgres uniquement)\n");
