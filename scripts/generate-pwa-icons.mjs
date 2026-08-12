#!/usr/bin/env node
/**
 * Génère les icônes PWA depuis le design system.
 *
 * Il n'existe pas encore de logo Gift & ENTREMETS : le seul fichier de marque
 * du dépôt est celui d'Ah Mes Goûts. Ces icônes sont donc construites à partir
 * des tokens (noir #17181B, crème #FAF7F5, bleu #0077B3) et du monogramme
 * « G&E ». Le jour où le vrai logo arrive, remplacer `buildMark()` et relancer :
 *
 *   node scripts/generate-pwa-icons.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "pwa");

const INK = "#17181B";
const CREAM = "#FAF7F5";
const BLUE = "#0077B3";

/**
 * Monogramme sur fond sombre.
 * @param size          côté du carré
 * @param safeRatio     marge intérieure — 0.8 pour les icônes « maskable »,
 *                      dont les bords sont rognés par le lanceur Android.
 */
function buildMark(size, { safeRatio = 1, rounded = false } = {}) {
  const s = size;
  const cx = s / 2;
  // Le monogramme occupe la zone sûre : au-delà, Android rogne.
  const fontSize = s * 0.34 * safeRatio;
  const radius = rounded ? s * 0.22 : 0;
  const sparkle = s * 0.055 * safeRatio;
  const sx = cx + s * 0.245 * safeRatio;
  const sy = s * 0.29;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${radius}" fill="${INK}"/>
  <text x="${cx}" y="${s * 0.545}" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="${fontSize}" fill="${CREAM}" letter-spacing="${s * 0.005}">G&amp;E</text>
  <text x="${cx}" y="${s * 0.735}" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${s * 0.082 * safeRatio}" fill="${CREAM}" opacity="0.72"
        letter-spacing="${s * 0.018}">ENTREMETS</text>
  <path d="M ${sx} ${sy - sparkle} L ${sx + sparkle * 0.32} ${sy - sparkle * 0.32} L ${sx + sparkle} ${sy} L ${sx + sparkle * 0.32} ${sy + sparkle * 0.32} L ${sx} ${sy + sparkle} L ${sx - sparkle * 0.32} ${sy + sparkle * 0.32} L ${sx - sparkle} ${sy} L ${sx - sparkle * 0.32} ${sy - sparkle * 0.32} Z"
        fill="${BLUE}"/>
</svg>`);
}

const TARGETS = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-192.png", size: 192, safeRatio: 0.8 },
  { file: "icon-maskable-512.png", size: 512, safeRatio: 0.8 },
  { file: "apple-touch-icon.png", size: 180, rounded: false },
];

mkdirSync(OUT, { recursive: true });

for (const target of TARGETS) {
  const svg = buildMark(target.size, {
    safeRatio: target.safeRatio ?? 1,
    rounded: target.rounded ?? false,
  });
  const png = await sharp(svg).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(path.join(OUT, target.file), png);
  console.log(`${target.file.padEnd(28)} ${target.size}px  ${png.length} octets`);
}

// Version vectorielle, utile pour le favicon et les écrans haute densité.
writeFileSync(path.join(OUT, "icon.svg"), buildMark(512));
console.log("icon.svg".padEnd(28) + "vectoriel");
