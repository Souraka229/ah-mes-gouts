/**
 * Rogne, optimise et convertit les photos produit en WebP.
 * — mode catalog : rognage léger + max 1000px (garde l'étiquette nom sur la carte)
 * — mode poster : conserve nom + prix intégrés (affiches marketing)
 *
 * Usage : node scripts/optimize-produits-images.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcDir = path.join(root, "public/images/produits");
const backupDir = path.join(srcDir, "_source-png");
const upsellDir = path.join(root, "public/images/generated/upsell");

/** Fond site — padding catalogue si besoin */
const BG = { r: 250, g: 247, b: 245, alpha: 1 };

/** Rogne les bords uniformes sans couper le produit ni l'étiquette */
const TRIM_THRESHOLD = 14;

const FILE_CONFIG = {
  "mangue-passion.png": { mode: "catalog" },
  "goyave-vanille.png": { mode: "poster" },
  "caramel-cappuccino.png": { mode: "catalog" },
  "oreos-caramel-baileys.png": { mode: "catalog" },
  "nutella-caramel-baileys.png": { mode: "catalog" },
  "le-cafe.png": { mode: "catalog" },
  "foret-blanche.png": { mode: "catalog" },
  "tiramisu-rose.png": { mode: "catalog" },
  "tiramisu-poster.png": { mode: "poster" },
  "chocolat-cappuccino.png": { mode: "catalog" },
  "chocolat-menthe.png": { mode: "catalog" },
  "logo-amg.png": { mode: "logo" },
};

async function trimSafe(buffer) {
  try {
    return await sharp(buffer)
      .trim({ threshold: TRIM_THRESHOLD })
      .toBuffer();
  } catch {
    return buffer;
  }
}

async function processCatalog(inputPath, outputPath) {
  let buffer = await sharp(inputPath).rotate().toBuffer();
  buffer = await trimSafe(buffer);

  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 1000;
  const h = meta.height ?? 1250;

  // Cadre 4:5 — produit centré, étiquette nom en bas préservée
  const targetW = 1000;
  const targetH = 1250;

  await sharp(buffer)
    .resize(targetW, targetH, {
      fit: "contain",
      position: "centre",
      background: BG,
    })
    .webp({ quality: 85, effort: 6, smartSubsample: true })
    .toFile(outputPath);

  const outStat = statSync(outputPath);
  return { w, h, outKb: Math.round(outStat.size / 1024) };
}

async function processPoster(inputPath, outputPath) {
  let buffer = await sharp(inputPath).rotate().toBuffer();
  buffer = await trimSafe(buffer);

  await sharp(buffer)
    .resize({ width: 1080, withoutEnlargement: false })
    .webp({ quality: 88, effort: 6, smartSubsample: true })
    .toFile(outputPath);

  const outStat = statSync(outputPath);
  return { outKb: Math.round(outStat.size / 1024) };
}

async function processLogo(inputPath, outputPath) {
  await sharp(inputPath)
    .resize({ height: 320, withoutEnlargement: true })
    .webp({ quality: 90, effort: 6, alphaQuality: 100 })
    .toFile(outputPath);

  const outStat = statSync(outputPath);
  return { outKb: Math.round(outStat.size / 1024) };
}

async function processUpsell(name) {
  const input = path.join(upsellDir, name);
  if (!existsSync(input)) return;
  const output = input.replace(/\.png$/, ".webp");
  await sharp(input)
    .resize(800, 800, { fit: "contain", background: BG })
    .webp({ quality: 85, effort: 6 })
    .toFile(output);
  const kb = Math.round(statSync(output).size / 1024);
  console.log(`  ✓ upsell/${path.basename(output)} (${kb} Ko)`);
}

mkdirSync(backupDir, { recursive: true });

console.log("\n=== Optimisation produits → WebP ===\n");

const pngs = readdirSync(srcDir).filter(
  (f) => f.endsWith(".png") && !f.startsWith("_"),
);

let totalIn = 0;
let totalOut = 0;

for (const file of pngs) {
  const inputPath = path.join(srcDir, file);
  const config = FILE_CONFIG[file] ?? { mode: "catalog" };
  const outputPath = path.join(srcDir, file.replace(/\.png$/i, ".webp"));

  const inStat = statSync(inputPath);
  totalIn += inStat.size;

  if (!existsSync(path.join(backupDir, file))) {
    copyFileSync(inputPath, path.join(backupDir, file));
  }

  let result;
  if (config.mode === "poster") {
    result = await processPoster(inputPath, outputPath);
  } else if (config.mode === "logo") {
    result = await processLogo(inputPath, outputPath);
  } else {
    result = await processCatalog(inputPath, outputPath);
  }

  const outStat = statSync(outputPath);
  totalOut += outStat.size;
  const saved = Math.round((1 - outStat.size / inStat.size) * 100);

  console.log(
    `✓ ${file.replace(".png", ".webp")} [${config.mode}] ${Math.round(inStat.size / 1024)} Ko → ${result.outKb} Ko (−${saved}%)`,
  );
}

console.log("\n=== Upsell cadeaux ===\n");
for (const name of [
  "nounours-beige.png",
  "bouquet-roses.png",
  "carte-cadeau.png",
]) {
  await processUpsell(name);
}

console.log(
  `\nTotal : ${Math.round(totalIn / 1024)} Ko → ${Math.round(totalOut / 1024)} Ko (−${Math.round((1 - totalOut / totalIn) * 100)}%)\n`,
);
console.log(`Originaux PNG sauvegardés dans : public/images/produits/_source-png/\n`);
