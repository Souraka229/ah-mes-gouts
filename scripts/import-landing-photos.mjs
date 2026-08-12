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
  ["hero-coeur-or", "image a mes gouts 1.jpg"],
  ["gateau-nuit-doree", "gout et entrmetn1.jpg"],
  ["entremets-fruits-rouges", "image a mes gouts.jpg"],
  ["gateau-sur-mesure", "image à mes gouts 2.jpg"],
  ["coffret-roses", "ah mes gouts 4.jpg"],
];

/**
 * Largeur en dessous de laquelle une photo sera visiblement floue sur un
 * grand écran retina. Le hero s'affiche autour de 1075 px CSS, soit 2150 px
 * réels : en dessous de 1200 px de source, le navigateur agrandit.
 */
const MIN_WIDTH_FOR_HERO = 1200;

mkdirSync(OUT, { recursive: true });

let imported = 0;
const tooSmall = [];

for (const [name, file] of PHOTOS) {
  const src = path.join(SOURCE, file);
  if (!existsSync(src)) {
    console.warn(`⚠ introuvable, ignoré : ${file}`);
    continue;
  }

  const input = sharp(readFileSync(src));
  const meta = await input.metadata();

  // On garde la résolution native : agrandir n'ajoute aucun détail et gonfle
  // le poids. Un léger accentuage compense la douceur du ré-encodage WebP.
  const buf = await input
    .sharpen({ sigma: 0.6 })
    .webp({ quality: 86, effort: 5 })
    .toBuffer();

  writeFileSync(path.join(OUT, `${name}.webp`), buf);

  const flag = (meta.width ?? 0) < MIN_WIDTH_FOR_HERO ? "  ⚠ basse résolution" : "";
  console.log(
    `${name.padEnd(26)} ${String(meta.width).padStart(5)}×${String(meta.height).padEnd(5)} ${(buf.length / 1024).toFixed(0).padStart(4)} Ko${flag}`,
  );

  if ((meta.width ?? 0) < MIN_WIDTH_FOR_HERO) tooSmall.push(name);
  imported += 1;
}

console.log(`\n${imported}/${PHOTOS.length} photos importées dans ${OUT}`);

if (tooSmall.length > 0) {
  console.warn(
    `\n⚠ ${tooSmall.length} photo(s) sous ${MIN_WIDTH_FOR_HERO} px de large :\n` +
      `  ${tooSmall.join(", ")}\n` +
      `  Elles seront agrandies par le navigateur sur grand écran, donc floues.\n` +
      `  Aucun réglage ne corrige ça : il faut réexporter les originaux en\n` +
      `  1600 px minimum (Instagram compresse à 1080, préférez les fichiers\n` +
      `  d'origine du photographe).`,
  );
}
