#!/usr/bin/env node
/**
 * ENRICHISSEMENT DU CATALOGUE DE PRODUCTION — ADDITIF UNIQUEMENT.
 *
 * Ajoute les compositions de roses et les compléments chocolat, corrige
 * l'image de la carte cadeau et le prix d'entrée du nounours.
 *
 * GARANTIES :
 *  - aucun `delete`, aucun `deleteMany`, aucun wipe, aucun reseed ;
 *  - upsert par slug : un slug déjà présent est mis à jour, jamais dupliqué ;
 *  - un produit existant non listé ici n'est jamais touché ;
 *  - AVANT / APRÈS affiché pour chaque enregistrement.
 *
 * Usage :
 *   node scripts/enrich-catalogue-prod.mjs --dry   (lecture seule, simulation)
 *   node scripts/enrich-catalogue-prod.mjs         (écrit)
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DRY = process.argv.includes("--dry");
const ROOT = process.cwd();

for (const file of [".env.production.local", ".env"]) {
  const path = join(ROOT, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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

const prisma = new PrismaClient();

/** Photo de roses existante — même produit (des roses), jamais une autre famille. */
const ROSE_IMAGE = "/images/produits/bouquet-roses.webp";

const ROSES = [
  ["rose-unite", "Rose à l'unité", "Une rose fraîche, sans emballage.", 3500],
  [
    "bouquet-1-rose",
    "Bouquet 1 rose",
    "Une rose parfumée, gypsophile et emballage.",
    5000,
  ],
  [
    "bouquet-2-roses",
    "Bouquet 2 roses",
    "Deux roses parfumées et gypsophile.",
    10000,
  ],
  [
    "bouquet-3-roses",
    "Bouquet 3 roses",
    "Trois roses parfumées, gypsophile et carte.",
    12000,
  ],
  ...[
    [5, 20000],
    [7, 25000],
    [9, 33000],
    [10, 35000],
    [12, 42000],
    [15, 50000],
    [20, 70000],
  ].map(([n, p]) => [
    `bouquet-${n}-roses`,
    `Bouquet ${n} roses`,
    `${n} roses parfumées, gypsophile, carte et emballage. Sacoche offerte.`,
    p,
  ]),
].map(([slug, name, description, price]) => ({
  slug,
  name,
  description,
  price,
  category: "Fleurs",
  imageUrl: ROSE_IMAGE,
  keyword: slug === "rose-unite" ? "À l'unité" : "Roses fraîches",
}));

/**
 * Aucune photo de chocolat n'existe. On laisse `imageUrl` vide : l'interface
 * affiche l'emplacement neutre. Surtout pas la photo d'un autre produit.
 */
const CHOCOLATS = [
  {
    slug: "supplement-chocolats",
    name: "Quelques chocolats",
    description:
      "Une petite sélection de chocolats pour accompagner votre bouquet.",
    price: 3000,
    category: "Chocolats",
    imageUrl: "",
    keyword: "Duo",
  },
  {
    slug: "supplement-chocolats-paquet",
    name: "Paquet complet de chocolats",
    description:
      "Le paquet complet — une générosité qui se partage, pour un cadeau qui marque.",
    price: 10000,
    category: "Chocolats",
    imageUrl: "",
    keyword: "Duo",
  },
];

/** Corrections ciblées de données existantes (jamais de suppression). */
const PATCHES = [
  {
    slug: "carte-cadeau",
    reason:
      "affichait la photo de Goyave Vanille. On pointe vers produits/ et NON catalog/ : .vercelignore exclut public/images/catalog du déploiement.",
    data: { imageUrl: "/images/produits/carte-cadeau.webp" },
  },
  {
    slug: "speculoos",
    reason:
      "affichait la photo de Chocolat Cappuccino (autre produit). Utilise désormais sa propre image.",
    data: { imageUrl: "/images/produits/speculoos.webp" },
  },
  {
    slug: "nounours-beige",
    reason:
      "prix d'entrée : le palier 20 cm / 10 000 F n'existe plus, l'entrée est 25 cm / 15 000 F",
    data: { price: 15000 },
  },
];

function describe(row) {
  if (!row) return "(absent)";
  return `prix ${row.price} F  cat ${row.category}  img ${row.imageUrl || "(vide)"}  « ${row.name} »`;
}

async function upsertProduct(entry) {
  const existing = await prisma.product.findUnique({
    where: { slug: entry.slug },
    select: { id: true, slug: true, name: true, price: true, category: true, imageUrl: true },
  });

  console.log(`\n  ${entry.slug}`);
  console.log(`    AVANT : ${describe(existing)}`);

  if (DRY) {
    console.log(
      `    ACTION: ${existing ? "UPDATE (existant)" : "CREATE (nouveau)"} → prix ${entry.price} F  cat ${entry.category}`,
    );
    return existing ? "aurait mis à jour" : "aurait créé";
  }

  const data = {
    name: entry.name,
    description: entry.description,
    price: entry.price,
    category: entry.category,
    imageUrl: entry.imageUrl,
    imageUrls: entry.imageUrl ? [entry.imageUrl] : [],
    keyword: entry.keyword,
    // Catégories à stock non suivi : la valeur ne sert qu'à ne jamais bloquer.
    stockRemaining: 9999,
    stockMinimum: 0,
  };

  const saved = existing
    ? await prisma.product.update({ where: { slug: entry.slug }, data })
    : await prisma.product.create({
        data: { id: entry.slug, slug: entry.slug, ...data },
      });

  console.log(`    APRÈS : ${describe(saved)}`);
  return existing ? "mis à jour" : "créé";
}

async function applyPatch(patch) {
  const existing = await prisma.product.findUnique({
    where: { slug: patch.slug },
    select: { id: true, slug: true, name: true, price: true, category: true, imageUrl: true },
  });

  console.log(`\n  [PATCH] ${patch.slug}`);
  console.log(`    raison: ${patch.reason}`);
  console.log(`    AVANT : ${describe(existing)}`);

  if (!existing) {
    console.log("    ⚠ produit absent — AUCUNE création (patch ignoré)");
    return "absent";
  }

  if (DRY) {
    console.log(`    ACTION: UPDATE → ${JSON.stringify(patch.data)}`);
    return "aurait corrigé";
  }

  /**
   * `normalizeProductImages` fait primer `imageUrls[0]` sur `imageUrl` :
   * patcher le seul `imageUrl` laissait la galerie — donc l'affichage — sur
   * l'ancienne image. On aligne toujours les deux.
   */
  const data = { ...patch.data };
  if ("imageUrl" in data) {
    data.imageUrls = data.imageUrl ? [data.imageUrl] : [];
  }

  // On reprend l'état courant et on n'écrase que les champs listés.
  const saved = await prisma.product.update({
    where: { slug: patch.slug },
    data,
  });
  console.log(`    APRÈS : ${describe(saved)}`);
  return "corrigé";
}

async function main() {
  console.log("\n==================================================");
  console.log(
    DRY
      ? " ENRICHISSEMENT CATALOGUE — SIMULATION (aucune écriture)"
      : " ENRICHISSEMENT CATALOGUE — ÉCRITURE",
  );
  console.log("==================================================");

  const before = await prisma.product.count();
  console.log(`\nProduits en base AVANT : ${before}`);

  const results = [];

  console.log("\n--- COMPOSITIONS DE ROSES (11) ---");
  for (const entry of ROSES) {
    results.push([entry.slug, await upsertProduct(entry)]);
  }

  console.log("\n--- COMPLÉMENTS CHOCOLAT (2) ---");
  for (const entry of CHOCOLATS) {
    results.push([entry.slug, await upsertProduct(entry)]);
  }

  console.log("\n--- CORRECTIONS DE DONNÉES EXISTANTES ---");
  for (const patch of PATCHES) {
    results.push([patch.slug, await applyPatch(patch)]);
  }

  const after = await prisma.product.count();
  console.log("\n==================================================");
  console.log(`Produits en base APRÈS : ${after}`);
  console.log(
    `Créés : ${results.filter(([, r]) => r === "créé").length}  ` +
      `Mis à jour : ${results.filter(([, r]) => r === "mis à jour").length}  ` +
      `Corrigés : ${results.filter(([, r]) => r === "corrigé").length}`,
  );

  // Contrôle de sécurité : rien ne doit avoir disparu.
  if (after < before) {
    console.error(`\n⛔ ANOMALIE : ${before - after} produit(s) en moins. À investiguer.`);
    process.exitCode = 1;
  } else {
    console.log(`Aucune suppression : ${after >= before ? "CONFIRMÉ" : "ÉCHEC"}`);
  }
  console.log("==================================================\n");
}

main()
  .catch((error) => {
    console.error("\nERREUR :", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
