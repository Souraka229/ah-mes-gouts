#!/usr/bin/env node
/**
 * VIN / SPIRITUEUX — CATÉGORIE DU CATALOGUE. ADDITIF UNIQUEMENT.
 *
 * ─── POURQUOI CE SCRIPT EXISTE ──────────────────────────────────────────────
 *
 * « Vin / Spiritueux » avait d'abord été posé en **groupe d'options** rattaché
 * à 23 produits, conformément au brief initial (« ce ne sont PAS des catégories
 * principales que le client doit parcourir »).
 *
 * Le fondateur a tranché autrement le 30/09/2026 : il veut une **catégorie du
 * catalogue**, avec sa section dans la boutique et ses bouteilles achetables
 * seules. Ce script crée donc les bouteilles comme produits, et **désactive**
 * le groupe d'options devenu redondant — deux façons d'acheter le même vin
 * étant exactement le doublon qui lui a été signalé sur le champagne.
 *
 * ─── GARANTIES ──────────────────────────────────────────────────────────────
 *   - aucun `delete`, aucun `deleteMany`, aucun TRUNCATE ;
 *   - création par `upsert` sur le slug : rejouable sans doublon ;
 *   - aucun prix, aucun nom, aucune image d'un produit existant n'est modifié ;
 *   - la désactivation du groupe d'options est **réversible d'un clic** au
 *     back-office et n'efface rien.
 *
 * Usage :
 *   node scripts/seed-vin-spiritueux.mjs --dry-run
 *   node scripts/seed-vin-spiritueux.mjs
 */

import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");

/** Libellé exact voulu — ni « Vin / Champagne », ni « Vins & Spiritueux ». */
const CATEGORY = "Vin / Spiritueux";

/**
 * Les deux bouteilles. Prix dans la fourchette annoncée (6 000 à 9 000 F).
 *
 * `imageUrl` est laissé vide : les visuels sont à renseigner depuis
 * l'administration, comme pour les autres produits.
 */
const WINES = [
  {
    id: "vin-rouge",
    slug: "vin-rouge",
    name: "Vin rouge",
    description: "Bouteille de vin rouge, à emporter ou à joindre à votre création.",
    price: 6000,
  },
  {
    id: "vin-blanc",
    slug: "vin-blanc",
    name: "Vin blanc",
    description: "Bouteille de vin blanc, à emporter ou à joindre à votre création.",
    price: 9000,
  },
];

/** Groupe d'options devenu redondant avec la catégorie. */
const OPTION_GROUP_SLUG = "vin-spiritueux";

const prisma = new PrismaClient();

function formatFcfa(value) {
  return `${value.toLocaleString("fr-FR")} F`;
}

async function seedWine(wine) {
  const existing = await prisma.product.findUnique({
    where: { slug: wine.slug },
    select: { id: true, name: true, price: true, category: true, imageUrl: true },
  });

  if (existing) {
    console.log(
      `   ${wine.slug} : déjà présent — « ${existing.name} » ${formatFcfa(existing.price)} ` +
        `(catégorie ${existing.category}) — INCHANGÉ.`,
    );
    return { created: false };
  }

  console.log(
    `   ${wine.slug} : à créer — « ${wine.name} » ${formatFcfa(wine.price)} en catégorie « ${CATEGORY} »`,
  );

  if (DRY_RUN) return { created: true };

  await prisma.product.create({
    data: {
      id: wine.id,
      slug: wine.slug,
      name: wine.name,
      description: wine.description,
      price: wine.price,
      // Vide : l'emplacement d'image reste à remplir depuis l'administration.
      imageUrl: "",
      category: CATEGORY,
      // Catégorie à stock illimité : la valeur n'est qu'un garde-fou.
      stockRemaining: 999,
      stockMinimum: 0,
      visibility: "published",
      isMenuDuJour: false,
    },
    select: { id: true },
  });

  return { created: true };
}

async function deactivateOptionGroup() {
  const group = await prisma.optionGroup.findUnique({
    where: { slug: OPTION_GROUP_SLUG },
    select: { id: true, name: true, isActive: true },
  });

  if (!group) {
    console.log(`   Aucun groupe d'options « ${OPTION_GROUP_SLUG} » — rien à faire.`);
    return;
  }

  if (!group.isActive) {
    console.log(`   Groupe « ${group.name} » déjà désactivé — inchangé.`);
    return;
  }

  console.log(
    `   Groupe d'options « ${group.name} » : ACTIF → désactivé ` +
      "(le vin est désormais une catégorie du catalogue).",
  );

  if (DRY_RUN) return;

  await prisma.optionGroup.update({
    where: { id: group.id },
    data: { isActive: false },
  });
}

async function main() {
  console.log(
    DRY_RUN
      ? "=== VIN / SPIRITUEUX (CATÉGORIE) — SIMULATION ==="
      : "=== VIN / SPIRITUEUX (CATÉGORIE) — ÉCRITURE ===",
  );

  const before = await prisma.product.count();

  console.log("\n── Bouteilles");
  let created = 0;
  for (const wine of WINES) {
    const result = await seedWine(wine);
    if (result.created) created += 1;
  }

  console.log("\n── Groupe d'options redondant");
  await deactivateOptionGroup();

  const after = DRY_RUN ? before + created : await prisma.product.count();
  const orders = await prisma.order.count();

  console.log("\n=== RÉCAPITULATIF ===");
  console.log(`Produits : ${before} → ${after}  (+${created})`);
  console.log(`Commandes : ${orders}  ✅ intactes`);
  console.log(`Images : laissées vides — à renseigner depuis l'administration.`);
  if (DRY_RUN) console.log("\nSimulation : rien n'a été écrit.");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("❌ Échec :", error);
  await prisma.$disconnect();
  process.exit(1);
});
