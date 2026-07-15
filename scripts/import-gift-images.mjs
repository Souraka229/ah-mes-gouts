/**
 * Importe & optimise C:\Users\DELL\Pictures\gift → public/images/produits/gift/
 * + manifest JSON pour seed admin.
 *
 * Usage : node scripts/import-gift-images.mjs
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const SRC = path.join(process.env.USERPROFILE ?? "", "Pictures", "gift");
const OUT = path.join(root, "public", "images", "produits", "gift");
const OUT_POSTERS = path.join(OUT, "affiches");
const OUT_OPS = path.join(root, "public", "images", "ops", "livraison");
const MANIFEST = path.join(root, "data", "gift-import-manifest.json");
const BG = { r: 250, g: 247, b: 245, alpha: 1 };

/** Classification manuelle des 33 fichiers WhatsApp */
const ENTRIES = [
  { file: "WhatsApp Image 2026-07-02 at 11.20.37.jpeg", type: "delivery", slug: "zone-d", name: "Zone D", price: 700 },
  { file: "WhatsApp Image 2026-07-02 at 11.20.38 (1).jpeg", type: "delivery", slug: "zone-e", name: "Zone E", price: 500 },
  { file: "WhatsApp Image 2026-07-02 at 11.20.38 (2).jpeg", type: "delivery", slug: "zone-a", name: "Zone A", price: 1500 },
  { file: "WhatsApp Image 2026-07-02 at 11.20.38.jpeg", type: "delivery", slug: "zone-c", name: "Zone C", price: 800 },
  { file: "WhatsApp Image 2026-07-02 at 11.20.39.jpeg", type: "delivery", slug: "zone-b", name: "Zone B", price: 1000 },
  { file: "WhatsApp Image 2026-07-02 at 11.20.41.jpeg", type: "logo", slug: "etiquette-amg", name: "Étiquette Ah Mes Goûts" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.39 (1).jpeg", type: "product", slug: "le-cafe", name: "Le Café", price: 5000, description: "Entremets café, glaçage caramel et grain de café chocolat.", keyword: "Signature" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.40.jpeg", type: "product", slug: "la-mangue", name: "La Mangue", price: 5000, description: "Entremets mangue bicolore surmonté d'une mangue fraîche.", keyword: "Solaire" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.41 (1).jpeg", type: "product", slug: "tiramisu-caramel-baileys", name: "Tiramisu Caramel Baileys", price: 7000, description: "Tiramisu individuel, macaron et finition dorée.", keyword: "Premium" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.41 (2).jpeg", type: "product", slug: "fraise-vanille", name: "Fraise Vanille", price: 5000, description: "Entremets rose, crème, fraise fraîche et macaron.", keyword: "Fruité" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.42 (1).jpeg", type: "product", slug: "fraisier", name: "Fraisier", price: 3000, description: "Mousse cream cheese, crémeux fraise, compotée et génoise.", keyword: "Classique" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.42 (2).jpeg", type: "product", slug: "goyave-vanille", name: "Goyave Vanille", price: 3000, description: "Mousse vanille, insert crémeux goyave.", keyword: "Floral" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.42.jpeg", type: "product", slug: "cheesecake-framboise", name: "Cheesecake Framboise", price: 7000, description: "Base biscuitée, crème fromage, coulis framboise.", keyword: "Gourmand" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.43 (1).jpeg", type: "product", slug: "caramel-cappuccino-baileys", name: "Caramel Cappuccino Baileys", price: 5000, description: "Cœur velours, meringue, macaron et chocolats.", keyword: "Signature" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.43 (2).jpeg", type: "product", slug: "nutella-kinder-speculos", name: "Nutella Kinder Speculos", price: 7000, description: "Mousse Nutella, insert croustillant Kinder & Speculos.", keyword: "Gourmand" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.43 (3).jpeg", type: "product", slug: "tiramisu-caramel-cappuccino", name: "Tiramisu Caramel Cappuccino", price: 7000, description: "Tiramisu coque caramel, macaron et chocolat doré.", keyword: "Premium" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.43.jpeg", type: "product", slug: "foret-noire", name: "Forêt Noire", price: 7000, description: "Mousse chocolat et vanille, insert compotée de cerise.", keyword: "Intense" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.44.jpeg", type: "product", slug: "la-corbeille-a-fruits", name: "La Corbeille à Fruits", price: 5000, description: "Vanille – fruits rouges, panier rose garni.", keyword: "Fruité" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.45 (1).jpeg", type: "product", slug: "nutella-baileys-speculos", name: "Nutella Baileys Speculos", price: 7000, description: "L'élégance gourmande dans chaque bouchée.", keyword: "Gourmand" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.45.jpeg", type: "product", slug: "tiramisu-caramel", name: "Tiramisu Caramel", price: 5000, description: "L'intensité du café, la douceur du caramel.", keyword: "Onctueux" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.46.jpeg", type: "product", slug: "foret-noire", name: "Forêt Noire", price: 5000, description: "Mousse chocolat, insert cerise et crémeux vanille.", keyword: "Intense" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.47 (1).jpeg", type: "product", slug: "mangue-passion", name: "Mangue Passion", price: 5000, description: "Carré jaune velours, fruits frais.", keyword: "Solaire" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.47.jpeg", type: "product", slug: "nutella-caramel-baileys", name: "Nutella Caramel Baileys", price: 7000, description: "Cœur velours, fraise et chocolat.", keyword: "Gourmand" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.48 (1).jpeg", type: "product", slug: "fraisier", name: "Fraisier", price: 3000, description: "Mousse cream cheese, crémeux et compotée de fraise.", keyword: "Classique" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.48.jpeg", type: "product", slug: "goyave-vanille", name: "Goyave Vanille", price: 3000, description: "Mousse vanille, insert crémeux goyave.", keyword: "Floral" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.49 (1).jpeg", type: "product", slug: "caramel-cappuccino-baileys", name: "Caramel Cappuccino Baileys", price: 5000, description: "Cœur rouge, fraise et chocolat.", keyword: "Signature" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.49.jpeg", type: "product", slug: "caramel-cappuccino", name: "Caramel Cappuccino", price: 5000, description: "Cylindre caramel, KitKat, Lotus et guimauve.", keyword: "Café" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.50 (1).jpeg", type: "product", slug: "chocolat-baileys", name: "Chocolat Baileys", price: 5000, description: "Cœur velours, fraise et chocolat.", keyword: "Intense" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.50 (2).jpeg", type: "product", slug: "foret-blanche", name: "Forêt Blanche", price: 5000, description: "Carré crème, cœur rouge et fruits rouges.", keyword: "Doux" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.50.jpeg", type: "product", slug: "tiramisu", name: "Tiramisu", price: 5000, description: "Cœur rose, meringue, macaron et fraise.", keyword: "Onctueux" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.51 (1).jpeg", type: "product", slug: "chocolat-menthe", name: "Chocolat Menthe", price: 5000, description: "Cœur vert, fraise et macaron.", keyword: "Frais" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.51 (2).jpeg", type: "product", slug: "foret-noire", name: "Forêt Noire", price: 5000, description: "Carré noir velours, fraise et framboises.", keyword: "Intense" },
  { file: "WhatsApp Image 2026-07-02 at 11.20.51.jpeg", type: "product", slug: "chocolat-cappuccino", name: "Chocolat Cappuccino", price: 5000, description: "Cylindre chocolat caramel, KitKat et Lotus.", keyword: "Café" },
];

async function trimSafe(buffer) {
  try {
    return await sharp(buffer).trim({ threshold: 16 }).toBuffer();
  } catch {
    return buffer;
  }
}

async function toCatalogWebp(inputPath, outputPath) {
  let buffer = await sharp(inputPath).rotate().toBuffer();
  buffer = await trimSafe(buffer);
  await sharp(buffer)
    .resize(1000, 1250, { fit: "contain", position: "centre", background: BG })
    .webp({ quality: 88, effort: 6 })
    .toFile(outputPath);
}

async function toPosterWebp(inputPath, outputPath) {
  let buffer = await sharp(inputPath).rotate().toBuffer();
  await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 90, effort: 6 })
    .toFile(outputPath);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function main() {
  if (!existsSync(SRC)) {
    console.error("Dossier introuvable:", SRC);
    process.exit(1);
  }

  ensureDir(OUT);
  ensureDir(OUT_POSTERS);
  ensureDir(OUT_OPS);
  ensureDir(path.dirname(MANIFEST));

  /** @type {Map<string, object>} */
  const productsBySlug = new Map();
  const delivery = [];
  let processed = 0;

  for (const entry of ENTRIES) {
    const srcPath = path.join(SRC, entry.file);
    if (!existsSync(srcPath)) {
      console.warn("Manquant:", entry.file);
      continue;
    }

    if (entry.type === "delivery") {
      const outName = `${entry.slug}.webp`;
      const outPath = path.join(OUT_OPS, outName);
      await toPosterWebp(srcPath, outPath);
      delivery.push({
        ...entry,
        imageUrl: `/images/ops/livraison/${outName}`,
      });
      processed++;
      console.log("zone →", outName);
      continue;
    }

    if (entry.type === "logo") {
      const outPath = path.join(root, "public", "images", "brand", "etiquette-amg.webp");
      ensureDir(path.dirname(outPath));
      await toPosterWebp(srcPath, outPath);
      processed++;
      console.log("logo → etiquette-amg.webp");
      continue;
    }

    // product
    const catalogName = `${entry.slug}.webp`;
    const posterName = `${entry.slug}-affiche.webp`;
    // unique file per source to avoid overwrite when same slug
    const stamp = entry.file
      .replace(/WhatsApp Image 2026-07-02 at /, "")
      .replace(/\.jpeg$/i, "")
      .replace(/[^\d().]+/g, "")
      .replace(/[()]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const uniqueCatalog = `${entry.slug}-${stamp || processed}.webp`;
    const uniquePoster = `${entry.slug}-${stamp || processed}-affiche.webp`;

    const catalogPath = path.join(OUT, uniqueCatalog);
    const posterPath = path.join(OUT_POSTERS, uniquePoster);
    await toCatalogWebp(srcPath, catalogPath);
    await toPosterWebp(srcPath, posterPath);

    const catalogUrl = `/images/produits/gift/${uniqueCatalog}`;
    const posterUrl = `/images/produits/gift/affiches/${uniquePoster}`;

    const existing = productsBySlug.get(entry.slug);
    if (existing) {
      const urls = [...(existing.imageUrls ?? [])];
      if (!urls.includes(catalogUrl)) urls.push(catalogUrl);
      if (!urls.includes(posterUrl) && urls.length < 3) urls.push(posterUrl);
      existing.imageUrls = urls.slice(0, 3);
      existing.imageUrl = existing.imageUrls[0];
      if ((entry.price ?? 0) > (existing.price ?? 0)) existing.price = entry.price;
      if (entry.description && entry.description.length > (existing.description?.length ?? 0)) {
        existing.description = entry.description;
      }
    } else {
      productsBySlug.set(entry.slug, {
        slug: entry.slug,
        name: entry.name,
        price: entry.price ?? 5000,
        description: entry.description ?? "",
        keyword: entry.keyword ?? "Signature",
        category: "Entremets",
        imageUrl: catalogUrl,
        imageUrls: [catalogUrl, posterUrl].slice(0, 3),
        stockRemaining: 10,
        stockMinimum: 5,
      });
    }

    processed++;
    console.log("produit →", uniqueCatalog);
  }

  const products = [...productsBySlug.values()];
  const manifest = {
    importedAt: new Date().toISOString(),
    source: SRC,
    products,
    delivery,
    counts: {
      products: products.length,
      delivery: delivery.length,
      filesProcessed: processed,
    },
  };

  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), "utf8");
  console.log("\nOK", manifest.counts);
  console.log("Manifest:", MANIFEST);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
