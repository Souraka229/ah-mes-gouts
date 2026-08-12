#!/usr/bin/env node
/**
 * Génère les favicons depuis le monogramme de marque.
 *
 * Next.js App Router prend automatiquement en charge, à la racine de `app/` :
 *   favicon.ico      onglet navigateur (multi-tailles, y compris 16 px)
 *   icon.png         icône moderne haute définition
 *   apple-icon.png   écran d'accueil iOS
 *
 * L'ancien `app/icon.png` était en réalité un JPEG renommé — certains
 * navigateurs le refusent.
 *
 * À 16 px, le monogramme complet « G&E / ENTREMETS » devient une tache : les
 * petites tailles ne gardent que l'esperluette, qui reste lisible et
 * identifiable.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const INK = "#17181B";
const CREAM = "#FAF7F5";
const BLUE = "#0077B3";

const APP = path.join(process.cwd(), "app");
const PWA = path.join(process.cwd(), "public", "pwa");

/** Monogramme complet — lisible à partir de 64 px. */
function fullMark(size, { safeRatio = 1, rounded = false } = {}) {
  const cx = size / 2;
  const radius = rounded ? size * 0.22 : 0;
  const sparkle = size * 0.055 * safeRatio;
  const sx = cx + size * 0.245 * safeRatio;
  const sy = size * 0.29;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>
  <text x="${cx}" y="${size * 0.545}" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="${size * 0.34 * safeRatio}" fill="${CREAM}">G&amp;E</text>
  <text x="${cx}" y="${size * 0.735}" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${size * 0.082 * safeRatio}" fill="${CREAM}" opacity="0.72"
        letter-spacing="${size * 0.018}">ENTREMETS</text>
  <path d="M ${sx} ${sy - sparkle} L ${sx + sparkle * 0.32} ${sy - sparkle * 0.32} L ${sx + sparkle} ${sy} L ${sx + sparkle * 0.32} ${sy + sparkle * 0.32} L ${sx} ${sy + sparkle} L ${sx - sparkle * 0.32} ${sy + sparkle * 0.32} L ${sx - sparkle} ${sy} L ${sx - sparkle * 0.32} ${sy - sparkle * 0.32} Z"
        fill="${BLUE}"/>
</svg>`);
}

/** Esperluette seule — pour 16, 32 et 48 px, où le reste devient illisible. */
function compactMark(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${INK}"/>
  <text x="${size / 2}" y="${size * 0.56}" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="${size * 0.74}" fill="${CREAM}">&amp;</text>
</svg>`);
}

const png = (svg) => sharp(svg).png({ compressionLevel: 9 }).toBuffer();

// ── favicon.ico : 16, 32 et 48 px dans un seul fichier ──────────────────────
const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(
  icoSizes.map(async (size) => ({
    size,
    data: await sharp(compactMark(size)).png().toBuffer(),
  })),
);

/** Encode un ICO à partir de PNG déjà rendus (l'ICO accepte le PNG depuis Vista). */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // réservé
  header.writeUInt16LE(1, 2); // type 1 = icône
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  const payloads = [];
  let offset = 6 + images.length * 16;

  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // réservé
    entry.writeUInt16LE(1, 4); // plans
    entry.writeUInt16LE(32, 6); // bits par pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    payloads.push(data);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...payloads]);
}

writeFileSync(path.join(APP, "favicon.ico"), buildIco(icoImages));
console.log(`favicon.ico          ${icoSizes.join(", ")} px`);

// ── Icônes modernes ─────────────────────────────────────────────────────────
const TARGETS = [
  [path.join(APP, "icon.png"), fullMark(512), "icon.png"],
  [path.join(APP, "apple-icon.png"), fullMark(180), "apple-icon.png"],
  [path.join(PWA, "icon-192.png"), fullMark(192), "pwa/icon-192.png"],
  [path.join(PWA, "icon-512.png"), fullMark(512), "pwa/icon-512.png"],
  [
    path.join(PWA, "icon-maskable-192.png"),
    fullMark(192, { safeRatio: 0.8 }),
    "pwa/icon-maskable-192.png",
  ],
  [
    path.join(PWA, "icon-maskable-512.png"),
    fullMark(512, { safeRatio: 0.8 }),
    "pwa/icon-maskable-512.png",
  ],
  [
    path.join(PWA, "apple-touch-icon.png"),
    fullMark(180),
    "pwa/apple-touch-icon.png",
  ],
];

for (const [dest, svg, label] of TARGETS) {
  const buf = await png(svg);
  writeFileSync(dest, buf);
  console.log(`${label.padEnd(28)} ${(buf.length / 1024).toFixed(0)} Ko`);
}

writeFileSync(path.join(PWA, "icon.svg"), fullMark(512));
console.log("pwa/icon.svg                 vectoriel");
