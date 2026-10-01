#!/usr/bin/env node
/**
 * Génère les icônes des trois applications — boutique, back-office, livreur.
 *
 * Chacune s'installe séparément : sans jeu d'icônes distinct, les trois apps
 * sont indiscernables sur un écran d'accueil. La boutique garde l'encre, le
 * back-office prend l'accent rouge de la marque, le portail livreur le bleu
 * déjà utilisé par son manifeste.
 *
 * Usage : node scripts/generate-pwa-icons.mjs
 *
 * `sharp` vient avec Next.js (dépendance de l'optimiseur d'images) : aucune
 * dépendance supplémentaire à installer.
 *
 * Les icônes racine de `app/` (favicon.ico, icon.png, apple-icon.png) sont
 * propres à la boutique : Next les sert automatiquement, et le back-office
 * comme le portail livreur déclarent les leurs dans leur layout respectif.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const INK = "#17181B";
const CREAM = "#FAF7F5";
const RED = "#D62828";
const BLUE = "#0077B3";

const APP = path.join(process.cwd(), "app");
const PWA = path.join(process.cwd(), "public", "pwa");

/**
 * Monogramme complet — lisible à partir de 64 px.
 *
 * `subtitle` est ce qui distingue les trois applis une fois installées ;
 * `sparkle` en est le rappel coloré.
 */
function fullMark(
  size,
  { subtitle = "ENTREMETS", background = INK, sparkle = BLUE, safeRatio = 1, rounded = false } = {},
) {
  const cx = size / 2;
  const radius = rounded ? size * 0.22 : 0;
  const star = size * 0.055 * safeRatio;
  const sx = cx + size * 0.245 * safeRatio;
  const sy = size * 0.29;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>
  <text x="${cx}" y="${size * 0.545}" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="${size * 0.34 * safeRatio}" fill="${CREAM}">G&amp;E</text>
  <text x="${cx}" y="${size * 0.735}" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${size * 0.082 * safeRatio}" fill="${CREAM}" opacity="0.72"
        letter-spacing="${size * 0.018}">${subtitle}</text>
  <path d="M ${sx} ${sy - star} L ${sx + star * 0.32} ${sy - star * 0.32} L ${sx + star} ${sy} L ${sx + star * 0.32} ${sy + star * 0.32} L ${sx} ${sy + star} L ${sx - star * 0.32} ${sy + star * 0.32} L ${sx - star} ${sy} L ${sx - star * 0.32} ${sy - star * 0.32} Z"
        fill="${sparkle}"/>
</svg>`);
}

/** Esperluette seule — pour 16, 32 et 48 px, où le reste devient illisible. */
function compactMark(size, { background = INK } = {}) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <text x="${size / 2}" y="${size * 0.56}" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="${size * 0.74}" fill="${CREAM}">&amp;</text>
</svg>`);
}

const png = (svg) => sharp(svg).png({ compressionLevel: 9 }).toBuffer();

async function write(dest, svg, label) {
  const buf = await png(svg);
  writeFileSync(dest, buf);
  console.log(`${label.padEnd(32)} ${(buf.length / 1024).toFixed(0)} Ko`);
}

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

/**
 * Les trois identités. La boutique est la seule à posséder des icônes racine
 * `app/` : c'est elle qu'on voit dans l'onglet du navigateur.
 */
const APPS = [
  {
    key: "shop",
    // La boutique garde les noms sans préfixe : son manifeste et les
    // installations déjà existantes pointent dessus.
    prefix: "icon",
    subtitle: "ENTREMETS",
    background: INK,
    sparkle: BLUE,
    rootIcons: true,
  },
  {
    key: "admin",
    prefix: "admin-icon",
    subtitle: "ADMIN",
    background: RED,
    sparkle: CREAM,
    rootIcons: false,
  },
  {
    key: "driver",
    prefix: "driver-icon",
    subtitle: "LIVREUR",
    background: BLUE,
    sparkle: CREAM,
    rootIcons: false,
  },
];

for (const app of APPS) {
  const style = {
    subtitle: app.subtitle,
    background: app.background,
    sparkle: app.sparkle,
  };
  console.log(`\n── ${app.key} ──────────────────────────────`);

  const svgName = `${app.prefix}.svg`;
  writeFileSync(path.join(PWA, svgName), fullMark(512, style));
  console.log(`${`pwa/${svgName}`.padEnd(32)} vectoriel`);

  await write(
    path.join(PWA, `${app.prefix}-192.png`),
    fullMark(192, style),
    `pwa/${app.prefix}-192.png`,
  );
  await write(
    path.join(PWA, `${app.prefix}-512.png`),
    fullMark(512, style),
    `pwa/${app.prefix}-512.png`,
  );
  await write(
    path.join(PWA, `${app.prefix}-maskable-192.png`),
    fullMark(192, { ...style, safeRatio: 0.8 }),
    `pwa/${app.prefix}-maskable-192.png`,
  );
  await write(
    path.join(PWA, `${app.prefix}-maskable-512.png`),
    fullMark(512, { ...style, safeRatio: 0.8 }),
    `pwa/${app.prefix}-maskable-512.png`,
  );

  // `apple-touch-icon.png` sans préfixe est le nom attendu par iOS pour la
  // boutique ; les deux autres apps déclarent la leur dans leur layout.
  const appleName =
    app.key === "shop" ? "apple-touch-icon.png" : `${app.prefix}-apple-touch-icon.png`;
  await write(path.join(PWA, appleName), fullMark(180, style), `pwa/${appleName}`);

  if (app.rootIcons) {
    console.log("  (icônes racine de la boutique)");
    await write(path.join(APP, "icon.png"), fullMark(512, style), "app/icon.png");
    await write(
      path.join(APP, "apple-icon.png"),
      fullMark(180, style),
      "app/apple-icon.png",
    );

    const icoSizes = [16, 32, 48];
    const icoImages = await Promise.all(
      icoSizes.map(async (size) => ({
        size,
        data: await sharp(compactMark(size, { background: app.background }))
          .png()
          .toBuffer(),
      })),
    );
    writeFileSync(path.join(APP, "favicon.ico"), buildIco(icoImages));
    console.log(`${"app/favicon.ico".padEnd(32)} ${icoSizes.join(", ")} px`);
  }
}

console.log("\n✓ Icônes générées.\n");
