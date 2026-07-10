/**
 * Import photos WhatsApp + PNG studio → WebP catalogue (crop dessert) + affiche.
 * Usage : npm run images:gift
 * Source WhatsApp : C:\Users\DELL\Pictures\gift
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const giftDir =
  process.env.GIFT_SOURCE_DIR ??
  path.join(process.env.USERPROFILE ?? "", "Pictures", "gift");
const produitsDir = path.join(root, "public/images/produits");
const outDir = produitsDir;
const posterDir = path.join(outDir, "affiches");
const archiveDir = path.join(outDir, "_source-gift");

const BG = { r: 250, g: 247, b: 245, alpha: 1 };
const TRIM_THRESHOLD = 10;

/** Crop zone dessert — sans texte marketing (ratios 0–1). */
const FLYER_CROP = { top: 0.2, left: 0.07, width: 0.86, height: 0.5 };
const STUDIO_CROP = { top: 0.04, left: 0.08, width: 0.84, height: 0.72 };

/**
 * @type {Array<{
 *   slug?: string;
 *   name?: string;
 *   price?: number;
 *   keyword?: string;
 *   description?: string;
 *   source: string;
 *   sourceRoot?: "gift" | "produits";
 *   mode: "flyer" | "studio" | "local";
 *   catalogFile: string;
 *   posterFile?: string;
 *   archiveName: string;
 *   productCrop?: { top: number; left: number; width: number; height: number };
 *   syncDb?: boolean;
 * }>}
 */
const CATALOG_IMPORTS = [
  // ── Flyers WhatsApp (4 cœurs signature) ──
  {
    slug: "caramel-baileys",
    name: "Oreos Caramel Baileys",
    price: 5000,
    keyword: "Signature",
    description:
      "Cœur velours bleu, Oreo croquant, caramel beurre salé et touche Baileys.",
    source: "oreos-caramel-baileys.png",
    sourceRoot: "produits",
    mode: "local",
    catalogFile: "oreos-caramel-baileys.webp",
    posterFile: "oreos-caramel-baileys-poster.webp",
    archiveName: "oreos-caramel-baileys-source.png",
  },
  {
    slug: "tiramisu",
    name: "Tiramisu Caramel",
    price: 5000,
    keyword: "Onctueux",
    description:
      "Mascarpone onctueux, biscuit café imbibé et caramel doré en finition.",
    source: "WhatsApp Image 2026-07-02 at 11.20.45.jpeg",
    mode: "flyer",
    catalogFile: "tiramisu-caramel.webp",
    posterFile: "tiramisu-caramel-poster.webp",
    archiveName: "tiramisu-caramel-source.jpeg",
    productCrop: { top: 0.19, left: 0.06, width: 0.88, height: 0.52 },
  },
  {
    slug: "nutella-caramel",
    name: "Nutella Baileys Speculos",
    price: 7000,
    keyword: "Gourmand",
    description:
      "Nutella fondant, Baileys, speculoos croustillant — cœur beige généreux.",
    source: "WhatsApp Image 2026-07-02 at 11.20.45 (1).jpeg",
    mode: "flyer",
    catalogFile: "nutella-baileys-speculos.webp",
    posterFile: "nutella-baileys-speculos-poster.webp",
    archiveName: "nutella-baileys-speculos-source.jpeg",
    productCrop: { top: 0.2, left: 0.07, width: 0.86, height: 0.5 },
  },
  {
    slug: "mousse-chocolat",
    name: "Forêt Noire",
    price: 5000,
    keyword: "Intense",
    description:
      "Chocolat noir intense, cerises et crème légère — cylindre signature.",
    source: "WhatsApp Image 2026-07-02 at 11.20.46.jpeg",
    mode: "flyer",
    catalogFile: "foret-noire.webp",
    posterFile: "foret-noire-poster.webp",
    archiveName: "foret-noire-source.jpeg",
    productCrop: { top: 0.17, left: 0.05, width: 0.9, height: 0.56 },
  },
  // ── Studio WhatsApp (carte produit) ──
  {
    slug: "caramel-cappuccino",
    name: "Caramel Cappuccino",
    price: 5000,
    keyword: "Intense",
    description:
      "L'intensité du café, la douceur du caramel et une touche de speculoos.",
    source: "WhatsApp Image 2026-07-02 at 11.20.49.jpeg",
    mode: "studio",
    catalogFile: "caramel-cappuccino.webp",
    archiveName: "caramel-cappuccino-source.jpeg",
    productCrop: STUDIO_CROP,
  },
  {
    slug: "foret-blanche",
    name: "Forêt Blanche",
    price: 5000,
    keyword: "Délicat",
    description:
      "Chocolat blanc, cerises confites et crème légère à la vanille.",
    source: "WhatsApp Image 2026-07-02 at 11.20.50 (2).jpeg",
    mode: "studio",
    catalogFile: "foret-blanche.webp",
    archiveName: "foret-blanche-source.jpeg",
    productCrop: STUDIO_CROP,
  },
  {
    slug: "speculoos",
    name: "Speculoos",
    price: 5000,
    keyword: "Croquant",
    description: "L'élégance gourmande du speculoos dans chaque bouchée.",
    source: "WhatsApp Image 2026-07-02 at 11.20.51.jpeg",
    mode: "studio",
    catalogFile: "chocolat-cappuccino.webp",
    archiveName: "chocolat-cappuccino-source.jpeg",
    productCrop: STUDIO_CROP,
  },
  {
    slug: "mango-passion",
    name: "Mango Passion",
    price: 5000,
    keyword: "Solaire",
    description: "Mangue Alphonso, fruit de la passion et touche citron vert.",
    source: "mangue-passion.png",
    sourceRoot: "produits",
    mode: "local",
    catalogFile: "mangue-passion.webp",
    archiveName: "mangue-passion-source.png",
  },
  {
    slug: "goyave-vanille",
    name: "Goyave Vanille",
    price: 5000,
    keyword: "Floral",
    description: "Goyave rose, vanille de Madagascar et meringue dorée.",
    source: "goyave-vanille.png",
    sourceRoot: "produits",
    mode: "local",
    catalogFile: "goyave-vanille.webp",
    posterFile: "goyave-vanille-poster.webp",
    archiveName: "goyave-vanille-source.png",
  },
  {
    slug: "vanilla-caramel",
    name: "Vanilla Caramel",
    price: 5000,
    keyword: "Doux",
    description:
      "Cœur velours vanille, coulis caramel beurre salé et éclats de chocolat.",
    source: "caramel-cappuccino.png",
    sourceRoot: "produits",
    mode: "local",
    catalogFile: "vanilla-caramel.webp",
    archiveName: "vanilla-caramel-source.png",
  },
  // ── Landing / visuels complémentaires ──
  {
    source: "WhatsApp Image 2026-07-02 at 11.20.39 (1).jpeg",
    mode: "studio",
    catalogFile: "le-cafe.webp",
    archiveName: "le-cafe-source.jpeg",
    productCrop: STUDIO_CROP,
    syncDb: false,
  },
  {
    source: "WhatsApp Image 2026-07-02 at 11.20.51 (1).jpeg",
    mode: "studio",
    catalogFile: "chocolat-menthe.webp",
    archiveName: "chocolat-menthe-source.jpeg",
    productCrop: STUDIO_CROP,
    syncDb: false,
  },
];

function resolveInputPath(item) {
  const base = item.sourceRoot === "produits" ? produitsDir : giftDir;
  return path.join(base, item.source);
}

async function trimSafe(buffer) {
  try {
    return await sharp(buffer).trim({ threshold: TRIM_THRESHOLD }).toBuffer();
  } catch {
    return buffer;
  }
}

async function extractProductRegion(inputPath, crop) {
  const rotated = await sharp(inputPath).rotate().toBuffer();
  const meta = await sharp(rotated).metadata();
  const w = meta.width ?? 720;
  const h = meta.height ?? 1080;

  const left = Math.round(w * crop.left);
  const top = Math.round(h * crop.top);
  const width = Math.min(Math.round(w * crop.width), w - left);
  const height = Math.min(Math.round(h * crop.height), h - top);

  return sharp(rotated).extract({ left, top, width, height }).toBuffer();
}

async function writeCatalogWebp(buffer, outputPath) {
  await sharp(buffer)
    .resize(1000, 1250, {
      fit: "contain",
      position: "centre",
      background: BG,
    })
    .webp({ quality: 85, effort: 6, smartSubsample: true })
    .toFile(outputPath);
}

async function writePosterWebp(inputPath, outputPath) {
  let buffer = await sharp(inputPath).rotate().toBuffer();
  buffer = await trimSafe(buffer);

  await sharp(buffer)
    .resize({ width: 1080, withoutEnlargement: false })
    .webp({ quality: 88, effort: 6, smartSubsample: true })
    .toFile(outputPath);
}

function kb(filePath) {
  return Math.round(statSync(filePath).size / 1024);
}

async function processLocalItem(item, inputPath) {
  const catalogPath = path.join(outDir, item.catalogFile);
  const archivePath = path.join(archiveDir, item.archiveName);

  copyFileSync(inputPath, archivePath);

  let buffer = await sharp(inputPath).rotate().toBuffer();
  buffer = await trimSafe(buffer);
  await writeCatalogWebp(buffer, catalogPath);

  let posterKb = 0;
  if (item.posterFile) {
    const posterPath = path.join(posterDir, item.posterFile);
    await writePosterWebp(inputPath, posterPath);
    posterKb = kb(posterPath);
  }

  return { catalogKb: kb(catalogPath), posterKb };
}

async function processStudioItem(item, inputPath) {
  const catalogPath = path.join(outDir, item.catalogFile);
  const archivePath = path.join(archiveDir, item.archiveName);

  copyFileSync(inputPath, archivePath);

  const crop = item.productCrop ?? STUDIO_CROP;
  const productBuffer = await extractProductRegion(inputPath, crop);
  await writeCatalogWebp(productBuffer, catalogPath);

  let posterKb = 0;
  if (item.posterFile) {
    const posterPath = path.join(posterDir, item.posterFile);
    await writePosterWebp(inputPath, posterPath);
    posterKb = kb(posterPath);
  }

  return { catalogKb: kb(catalogPath), posterKb };
}

async function processFlyerItem(item, inputPath) {
  const catalogPath = path.join(outDir, item.catalogFile);
  const posterPath = path.join(posterDir, item.posterFile);
  const archivePath = path.join(archiveDir, item.archiveName);

  copyFileSync(inputPath, archivePath);

  const crop = item.productCrop ?? FLYER_CROP;
  const productBuffer = await extractProductRegion(inputPath, crop);
  await writeCatalogWebp(productBuffer, catalogPath);
  await writePosterWebp(inputPath, posterPath);

  return {
    catalogKb: kb(catalogPath),
    posterKb: kb(posterPath),
  };
}

async function processItem(item) {
  const inputPath = resolveInputPath(item);
  if (!existsSync(inputPath)) {
    throw new Error(`Source introuvable : ${inputPath}`);
  }

  let sizes;
  if (item.mode === "local") {
    sizes = await processLocalItem(item, inputPath);
    if (item.posterFile && sizes.posterKb === 0) {
      const posterPath = path.join(posterDir, item.posterFile);
      await writePosterWebp(inputPath, posterPath);
      sizes.posterKb = kb(posterPath);
    }
  } else if (item.mode === "studio") {
    sizes = await processStudioItem(item, inputPath);
  } else {
    sizes = await processFlyerItem(item, inputPath);
  }

  const catalogUrl = `/images/produits/${item.catalogFile}`;
  const posterUrl = item.posterFile
    ? `/images/produits/affiches/${item.posterFile}`
    : undefined;

  return {
    slug: item.slug,
    name: item.name,
    price: item.price,
    keyword: item.keyword,
    description: item.description,
    syncDb: item.syncDb !== false && Boolean(item.slug),
    catalogUrl,
    posterUrl,
    sourceKb: kb(inputPath),
    ...sizes,
  };
}

async function syncCatalog(results) {
  const prisma = new PrismaClient();
  try {
    for (const r of results) {
      if (!r.syncDb || !r.slug) continue;

      const imageUrls = r.posterUrl
        ? [r.catalogUrl, r.posterUrl]
        : [r.catalogUrl];

      const data = {
        imageUrl: r.catalogUrl,
        imageUrls,
      };
      if (r.name) data.name = r.name;
      if (r.price) data.price = r.price;
      if (r.keyword) data.keyword = r.keyword;
      if (r.description) data.description = r.description;

      const updated = await prisma.product.updateMany({
        where: { slug: r.slug },
        data,
      });
      if (updated.count === 0) {
        console.warn(`  ⚠ slug "${r.slug}" introuvable en base`);
      } else {
        console.log(`  ✓ DB ${r.slug} → ${r.name ?? r.slug}`);
      }
    }
  } catch (e) {
    console.warn(
      `\n  ⚠ Sync Prisma ignorée (${e instanceof Error ? e.message : "erreur réseau"})`,
    );
    console.warn("  Relancez npm run images:gift quand la DB est joignable.\n");
  } finally {
    await prisma.$disconnect();
  }
}

mkdirSync(outDir, { recursive: true });
mkdirSync(posterDir, { recursive: true });
mkdirSync(archiveDir, { recursive: true });

console.log("\n=== Import catalogue (WhatsApp + studio → WebP) ===\n");
console.log(`Source gift : ${giftDir}\n`);

const results = [];
let totalIn = 0;
let totalOut = 0;
let fileCount = 0;

for (const item of CATALOG_IMPORTS) {
  const label = item.name ?? item.catalogFile;
  const r = await processItem(item);
  results.push(r);
  totalIn += r.sourceKb;
  totalOut += r.catalogKb + (r.posterKb ?? 0);
  fileCount += r.posterKb ? 2 : 1;
  console.log(
    `${label}\n  source ${r.sourceKb} Ko → produit ${r.catalogKb} Ko` +
      (r.posterKb ? ` + affiche ${r.posterKb} Ko` : ""),
  );
  console.log(`  ${r.catalogUrl}`);
  if (r.posterUrl) console.log(`  ${r.posterUrl}`);
  console.log();
}

console.log("=== Sync Prisma ===\n");
try {
  await syncCatalog(results);
} catch {
  // syncCatalog gère déjà les erreurs réseau
}

console.log(
  `\nTotal : ${totalIn} Ko sources → ${totalOut} Ko WebP (${fileCount} fichiers)\n`,
);
console.log(`Archives : public/images/produits/_source-gift/\n`);
