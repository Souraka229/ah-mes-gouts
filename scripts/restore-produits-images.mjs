/** Restaure public/images/produits/ depuis les uploads Cursor — node scripts/restore-produits-images.mjs */
import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dest = path.join(root, "public/images/produits");

const wsImages = path.join(
  process.env.APPDATA ?? "",
  "Cursor/User/workspaceStorage/640f548cd37fdeafd98cb1170f15a93f/images",
);
const publicImages = path.join(root, "public/images");
const prefix =
  "c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_640f548cd37fdeafd98cb1170f15a93f_images_";

/** source basename (sans préfixe Cursor) → nom fichier produit */
const MAP = {
  "image-726ff3eb-21ab-41b2-988f-384f298cf477.png": "nutella-caramel-baileys.png",
  "image-6c2da9be-1884-49ac-aaaf-cfa5d585b38c.png": "oreos-caramel-baileys.png",
  "image-58b7b8c8-02b4-426f-803a-00723da674ea.png": "le-cafe.png",
  "WhatsApp Image 2026-06-30 at 20.18.32-e215d392-60af-4084-b653-fe8835be1585.png":
    "mangue-passion.png",
  "WhatsApp Image 2026-06-30 at 20.18.32 (1)-20942afc-a9e3-4407-bc46-d4f3aa169564.png":
    "goyave-vanille.png",
  "WhatsApp Image 2026-06-30 at 20.18.32 (2)-3fcc72a7-e2f9-43c4-a9ae-b2527466c142.png":
    "caramel-cappuccino.png",
  "WhatsApp Image 2026-06-30 at 20.18.33-8f42d076-dd3c-409d-ab17-b0b48d82ca3f.png":
    "tiramisu-rose.png",
  "WhatsApp Image 2026-06-30 at 20.18.33 (1)-9c17590c-6b7e-4094-85b2-ff5037a3f64e.png":
    "foret-blanche.png",
  "WhatsApp Image 2026-06-30 at 20.18.33 (2)-206a3da8-e884-4e5e-b22a-65babeebc094.png":
    "chocolat-cappuccino.png",
  "WhatsApp Image 2026-06-30 at 20.18.33 (3)-08c9793a-66ab-4c9d-8531-9736550ef2c4.png":
    "chocolat-menthe.png",
  "WhatsApp Image 2026-06-30 at 20.15.12-83db1765-3dfe-4edf-bff6-209c1d48f970.png":
    "tiramisu-poster.png",
  "LOGO_AMG1-d6fd6c81-7fff-4483-96eb-1caab5b3098f.png": "logo-amg.png",
};

function resolveSource(basename) {
  const candidates = [
    path.join(wsImages, basename),
    path.join(publicImages, `${prefix}${basename.replace(/ /g, "_")}`),
    path.join(publicImages, `${prefix}${basename}`),
  ];

  for (const alt of [
    basename.replace(/ /g, "_"),
    basename.replace(/ \(/g, "__").replace(/\)/g, "_"),
    basename.replace(/ \(/g, " (").replace(/\)/g, ")"),
  ]) {
    candidates.push(path.join(publicImages, `${prefix}${alt}`));
    candidates.push(path.join(wsImages, alt));
  }

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

mkdirSync(dest, { recursive: true });

let ok = 0;
let missing = 0;

for (const [basename, target] of Object.entries(MAP)) {
  const src = resolveSource(basename);
  const out = path.join(dest, target);
  if (!src) {
    console.warn(`⚠ manquant : ${basename}`);
    missing++;
    continue;
  }
  copyFileSync(src, out);
  console.log(`✓ ${target}`);
  ok++;
}

console.log(`\n${ok} images restaurées dans public/images/produits/ (${missing} manquantes)`);
