#!/usr/bin/env node
/**
 * SEED DES TAILLES NOUNOURS — ADDITIF UNIQUEMENT.
 *
 * Pose les 10 paliers officiels comme variantes des nounours déjà en base, et
 * renseigne leur libellé de sélecteur ainsi que leur sous-type.
 *
 * GARANTIES :
 *   - aucun `delete`, aucun `deleteMany`, aucun reseed ;
 *   - upsert par (productId, code) : un palier déjà présent est mis à jour,
 *     jamais dupliqué ;
 *   - aucun produit créé, aucun produit supprimé, aucun prix produit modifié ;
 *   - AVANT / APRÈS affiché pour chaque produit.
 *
 * Idempotent : rejouable autant de fois que nécessaire.
 *
 * Usage :
 *   node scripts/seed-nounours-variants.mjs --dry-run   (n'écrit rien)
 *   node scripts/seed-nounours-variants.mjs
 *
 * NOTE : la grille ci-dessous reflète `lib/constants/nounours-sizes.ts` au
 * moment du seed. Une fois en base, c'est **la base** qui fait foi — le code
 * n'est plus qu'une source d'amorçage.
 */

import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");

/** Grille officielle — 20 cm à 150 cm. */
const OFFICIAL_SIZES = [
  { cm: 20, price: 10_000 },
  { cm: 25, price: 15_000 },
  { cm: 30, price: 25_000 },
  { cm: 80, price: 35_000 },
  { cm: 90, price: 40_000 },
  { cm: 100, price: 45_000 },
  { cm: 120, price: 50_000 },
  { cm: 130, price: 70_000 },
  { cm: 140, price: 90_000 },
  { cm: 150, price: 100_000 },
];

/** Les trois types demandés. `nounours-beige` est volontairement exclu. */
const NOUNOURS = [
  { slug: "nounours-stitch", subtype: "stitch" },
  { slug: "nounours-teddy", subtype: "teddy" },
  { slug: "nounours-labubu", subtype: "labubu" },
];

const prisma = new PrismaClient();

function formatFcfa(value) {
  return `${value.toLocaleString("fr-FR")} F`;
}

async function seedProduct({ slug, subtype }) {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, name: true, price: true, variantLabel: true, subtype: true },
  });

  if (!product) {
    console.warn(`⚠  ${slug} : absent de la base — ignoré (aucune création).`);
    return { created: 0, updated: 0, skipped: true };
  }

  const existing = await prisma.productVariant.findMany({
    where: { productId: product.id },
    select: { code: true, price: true },
  });
  const existingByCode = new Map(existing.map((v) => [v.code, v.price]));

  console.log(`\n── ${product.name} (${slug})`);
  console.log(
    `   AVANT : ${existing.length} variante(s)` +
      (existing.length > 0
        ? ` — ${existing.map((v) => `${v.code}cm/${formatFcfa(v.price)}`).join(", ")}`
        : ""),
  );
  console.log(
    `   produit : prix ${formatFcfa(product.price)} | ` +
      `variantLabel ${product.variantLabel ?? "—"} | subtype ${product.subtype ?? "—"}`,
  );

  let created = 0;
  let updated = 0;

  for (const [index, size] of OFFICIAL_SIZES.entries()) {
    const code = String(size.cm);
    const label = `${size.cm} cm`;
    const previous = existingByCode.get(code);

    if (previous === undefined) created += 1;
    else if (previous !== size.price) updated += 1;

    if (DRY_RUN) continue;

    await prisma.productVariant.upsert({
      where: { productId_code: { productId: product.id, code } },
      update: { label, price: size.price, sortOrder: index },
      create: {
        productId: product.id,
        code,
        label,
        price: size.price,
        sortOrder: index,
        isActive: true,
      },
    });
  }

  if (!DRY_RUN) {
    // Métadonnées d'affichage — additives, aucun prix touché.
    await prisma.product.update({
      where: { id: product.id },
      data: { variantLabel: "Taille", subtype },
    });
  }

  const after = OFFICIAL_SIZES.map((s) => `${s.cm}cm/${formatFcfa(s.price)}`).join(", ");
  console.log(`   APRÈS : 10 variantes — ${after}`);
  console.log(`   → ${created} créée(s), ${updated} prix corrigé(s)`);

  return { created, updated, skipped: false };
}

async function main() {
  console.log(
    DRY_RUN
      ? "=== SEED TAILLES NOUNOURS — SIMULATION (aucune écriture) ==="
      : "=== SEED TAILLES NOUNOURS — ÉCRITURE ===",
  );

  const before = await prisma.productVariant.count();
  let totalCreated = 0;
  let totalUpdated = 0;
  const skipped = [];

  for (const entry of NOUNOURS) {
    const result = await seedProduct(entry);
    if (result.skipped) skipped.push(entry.slug);
    totalCreated += result.created;
    totalUpdated += result.updated;
  }

  const after = DRY_RUN ? before : await prisma.productVariant.count();

  console.log("\n=== RÉCAPITULATIF ===");
  console.log(`Variantes en base : ${before} → ${after}`);
  console.log(`Créées : ${totalCreated} | prix corrigés : ${totalUpdated}`);
  if (skipped.length > 0) console.log(`Produits absents (ignorés) : ${skipped.join(", ")}`);
  if (DRY_RUN) console.log("Simulation : rien n'a été écrit.");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("❌ Échec du seed :", error);
  await prisma.$disconnect();
  process.exit(1);
});
