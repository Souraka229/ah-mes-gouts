#!/usr/bin/env node
/**
 * Importe les photos de la landing depuis un dossier source et les optimise
 * en WebP dans public/images/landing/.
 *
 * Usage : node scripts/import-landing-photos.mjs [dossier-source]
 * Par défaut : le dossier Téléchargements de l'utilisateur.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const SOURCE = process.argv[2] ?? path.join(os.homedir(), "Downloads");
const OUT = path.join(process.cwd(), "public", "images", "landing");

/** Nom de sortie → fichier source. Renommer ici pour changer un visuel. */
const PHOTOS = [
  ["hero-coeur-or", "image a mes gouts 1.jpg", 1400],
  ["gateau-nuit-doree", "gout et entrmetn1.jpg", 1000],
  ["entremets-fruits-rouges", "image a mes gouts.jpg", 1000],
  ["gateau-sur-mesure", "image à mes gouts 2.jpg", 1000],
  ["coffret-roses", "ah mes gouts 4.jpg", 1000],
];

mkdirSync(OUT, { recursive: true });

let imported = 0;

for (const [name, file, width] of PHOTOS) {
  const src = path.join(SOURCE, file);
  if (!existsSync(src)) {
    console.warn(`⚠ introuvable, ignoré : ${file}`);
    continue;
  }

  const buf = await sharp(readFileSync(src))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  writeFileSync(path.join(OUT, `${name}.webp`), buf);
  console.log(`${name.padEnd(26)} ${(buf.length / 1024).toFixed(0)} Ko`);
  imported += 1;
}

console.log(`\n${imported}/${PHOTOS.length} photos importées dans ${OUT}`);
