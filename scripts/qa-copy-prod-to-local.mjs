/**
 * Copie la production vers la base QA locale — LECTURE SEULE côté production.
 *
 *   node scripts/qa-copy-prod-to-local.mjs
 *
 * Sert à faire un QA réaliste (mêmes produits, mêmes lieux, mêmes commandes)
 * sans jamais écrire chez le client. L'ordre d'insertion est déduit des
 * dépendances déclarées dans le schéma Prisma, pas deviné.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { existsSync, readFileSync } from "fs";

const QA_URL = "postgresql://qa:qa@localhost:5433/glace_qa?schema=public";

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

loadEnvFile(".env");

const prod = new PrismaClient();
const qa = new PrismaClient({ datasourceUrl: QA_URL });

/**
 * Ordre d'insertion : une table ne peut être remplie qu'après celles dont elle
 * dépend (clés étrangères).
 */
function orderModels() {
  const models = Prisma.dmmf.datamodel.models;
  const byName = new Map(models.map((m) => [m.name, m]));
  const done = new Set();
  const ordered = [];

  const visit = (model, guard = new Set()) => {
    if (done.has(model.name) || guard.has(model.name)) return;
    guard.add(model.name);

    for (const field of model.fields) {
      if (field.kind !== "object") continue;
      // Relation portée par l'autre côté : pas de contrainte ici.
      if (!field.relationFromFields || field.relationFromFields.length === 0) continue;
      const target = byName.get(field.type);
      if (target) visit(target, guard);
    }

    done.add(model.name);
    ordered.push(model);
  };

  for (const model of models) visit(model);
  return ordered;
}

async function main() {
  console.log("\n=== COPIE PRODUCTION → QA LOCALE ===\n");

  let total = 0;
  for (const model of orderModels()) {
    const delegate = prod[model.name.charAt(0).toLowerCase() + model.name.slice(1)];
    const qaDelegate = qa[model.name.charAt(0).toLowerCase() + model.name.slice(1)];

    if (!delegate?.findMany || !qaDelegate?.createMany) {
      console.log(`    ${model.name}: ignoré (pas de delegate)`);
      continue;
    }

    let rows;
    try {
      rows = await delegate.findMany();
    } catch (error) {
      console.log(`    ${model.name}: lecture impossible (${error.message.split("\n")[0]})`);
      continue;
    }

    if (rows.length === 0) {
      console.log(`    ${model.name}: 0 ligne`);
      continue;
    }

    // `[]` par défaut pour les colonnes tableau non renseignées.
    const normalized = rows.map((row) => {
      const copy = { ...row };
      for (const field of model.fields) {
        if (field.isList && copy[field.name] === null) copy[field.name] = [];
      }
      return copy;
    });

    try {
      await qaDelegate.createMany({ data: normalized, skipDuplicates: true });
      total += normalized.length;
      console.log(`    ${model.name}: ${normalized.length} ligne(s) copiée(s)`);
    } catch (error) {
      console.log(`    ${model.name}: ÉCHEC (${error.message.split("\n").slice(-2).join(" ")})`);
    }
  }

  console.log(`\n${total} ligne(s) copiée(s) en QA.\n`);
  await prod.$disconnect();
  await qa.$disconnect();
}

main().catch(async (error) => {
  console.error("Copie impossible :", error.message);
  await prod.$disconnect();
  await qa.$disconnect();
  process.exit(1);
});
