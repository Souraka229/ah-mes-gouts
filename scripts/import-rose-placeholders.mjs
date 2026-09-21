#!/usr/bin/env node
/**
 * VISUELS INDICATIFS DES COMPOSITIONS DE ROSES — ADDITIF UNIQUEMENT.
 *
 * Neuf fiches fleurs partageaient toutes la même photo (`bouquet-roses.webp`) :
 * la fiche « 1 rose » et la fiche « 20 roses » affichaient exactement le même
 * visuel. Ce script donne à chacune la sienne, du plus petit au plus grand.
 *
 * GARANTIES :
 *   - aucun `delete`, aucun `deleteMany`, aucune fiche créée ni supprimée ;
 *   - seuls `imageUrl` et `imageUrls` des slugs listés sont touchés ;
 *   - un slug absent de la base est signalé et ignoré, jamais créé ;
 *   - les 3 vraies photos d'atelier (7, 9 et 12 roses) ne sont PAS touchées ;
 *   - idempotent : rejouable, écrase seulement les fichiers qu'il produit.
 *
 * POURQUOI `placeholders/` ET NON `produits/` :
 *   `/images/placeholders/` est la source unique de vérité de
 *   `isReferenceVisual` (`lib/product-images.ts`) et déclenche le badge
 *   « Visuel indicatif — Photos non contractuelles ». Ces photos viennent
 *   d'une banque d'images : ce ne sont pas les bouquets de la boutique, et
 *   l'interface doit le dire.
 *
 * Usage :
 *   node scripts/import-rose-placeholders.mjs --dry-run   (n'écrit rien)
 *   node scripts/import-rose-placeholders.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const OUT_DIR = path.join(root, "public", "images", "placeholders", "roses");

/** Format maison : carré 800×800 WebP, comme les photos d'atelier. */
const SIZE = 800;
const WEBP_QUALITY = 82;

/**
 * Une photo distincte par fiche, choisie pour coller au libellé — sans jamais
 * prétendre reproduire exactement le nombre de roses annoncé.
 */
const SOURCES = [
  {
    slug: "rose-unite",
    pexelsId: "6616436",
    note: "Une rose, tige nue — « 1 rose fraîche, sans emballage »",
  },
  {
    slug: "bouquet-1-rose",
    pexelsId: "12252125",
    note: "Une rose emballée dans un cornet — « 1 rose, gypsophile, emballage »",
  },
  {
    slug: "bouquet-2-roses",
    pexelsId: "29741224",
    note: "Petit bouquet serré, gypsophile et nœud",
  },
  {
    slug: "bouquet-3-roses",
    pexelsId: "6616438",
    note: "Trois roses",
  },
  {
    slug: "bouquet-5-roses",
    pexelsId: "31069852",
    note: "Bouquet lié, boutons serrés",
  },
  {
    slug: "bouquet-10-roses",
    pexelsId: "34051908",
    note: "Roses en nombre, feuillage",
  },
  {
    slug: "bouquet-15-roses",
    pexelsId: "34051913",
    note: "Bouquet dense, roses serrées",
  },
  {
    slug: "bouquet-20-roses",
    pexelsId: "35400909",
    note: "Grande composition, masse de roses",
  },
];

const DRY_RUN = process.argv.includes("--dry-run");

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

const prisma = new PrismaClient();

/** URL publique de la photo — la licence Pexels autorise l'usage commercial. */
function sourceUrl(pexelsId) {
  return `https://images.pexels.com/photos/${pexelsId}/pexels-photo-${pexelsId}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
}

async function fetchImage(pexelsId) {
  const res = await fetch(sourceUrl(pexelsId), {
    headers: { "User-Agent": "Mozilla/5.0 Chrome/120" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`téléchargement refusé (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log(
    DRY_RUN
      ? "=== VISUELS ROSES — SIMULATION (aucune écriture) ==="
      : "=== VISUELS ROSES — ÉCRITURE ===",
  );

  if (!DRY_RUN && !existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const report = [];
  let written = 0;
  let updated = 0;
  let skipped = 0;

  for (const source of SOURCES) {
    const publicUrl = `/images/placeholders/roses/${source.slug}.webp`;
    const filePath = path.join(OUT_DIR, `${source.slug}.webp`);
    const line = { ...source, publicUrl, status: "" };

    // La fiche doit exister : on ne crée jamais un produit ici.
    const product = await prisma.product.findUnique({
      where: { slug: source.slug },
      select: { id: true, name: true, imageUrl: true },
    });

    if (!product) {
      line.status = "absent de la base — ignoré";
      skipped += 1;
      report.push(line);
      console.log(`⚠  ${source.slug} : absent de la base — ignoré (aucune création).`);
      continue;
    }

    try {
      const raw = await fetchImage(source.pexelsId);
      const webp = await sharp(raw)
        .rotate()
        .resize(SIZE, SIZE, { fit: "cover", position: "attention" })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      if (DRY_RUN) {
        line.status = `simulé (${Math.round(webp.length / 1024)} Ko)`;
      } else {
        writeFileSync(filePath, webp);
        written += 1;

        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: publicUrl, imageUrls: [publicUrl] },
        });
        updated += 1;
        line.status = `${Math.round(webp.length / 1024)} Ko`;
      }

      console.log(
        `✅ ${source.slug.padEnd(20)} ${product.imageUrl || "(vide)"} → ${publicUrl}`,
      );
    } catch (error) {
      line.status = `échec : ${error.message}`;
      skipped += 1;
      console.log(`❌ ${source.slug} : ${error.message}`);
    }

    report.push(line);
  }

  console.log("\n=== RÉCAPITULATIF ===");
  console.log(`Fichiers écrits : ${written} | fiches mises à jour : ${updated} | ignorées : ${skipped}`);
  console.log(
    DRY_RUN
      ? "Simulation : rien n'a été écrit."
      : `Dossier : ${path.relative(root, OUT_DIR)}`,
  );

  if (!DRY_RUN) {
    const manifestPath = path.join(root, "data", "rose-placeholders-manifest.json");
    const manifestDir = path.dirname(manifestPath);
    if (!existsSync(manifestDir)) mkdirSync(manifestDir, { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify(
        report.map((r) => ({
          slug: r.slug,
          fichier: r.publicUrl,
          source: `https://www.pexels.com/photo/${r.pexelsId}/`,
          licence: "Pexels License — usage commercial autorisé",
          note: r.note,
        })),
        null,
        2,
      ),
    );
    console.log(`Manifeste : ${path.relative(root, manifestPath)}`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("❌ Échec :", error);
  await prisma.$disconnect();
  process.exit(1);
});
