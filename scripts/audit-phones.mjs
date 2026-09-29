/**
 * Audit des numéros de téléphone — LECTURE SEULE.
 *
 * À lancer AVANT toute migration :
 *   node scripts/audit-phones.mjs
 *
 * Il ne modifie rien. Il classe chaque valeur stockée, détecte les doublons
 * qui apparaîtraient après normalisation, et signale les valeurs que la
 * nouvelle fonction refuse — celles-là devront être revues à la main, jamais
 * corrigées en silence.
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";

import { normalizePhone } from "../lib/phone.ts";

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
loadEnvFile(".env.local");

const prisma = new PrismaClient();

/** Champs susceptibles de porter un numéro, relevés dans le schéma réel. */
const SOURCES = [
  { label: "Order.clientPhone", load: () => prisma.order.findMany({ select: { id: true, clientPhone: true } }), field: "clientPhone" },
  { label: "Order.recipientPhone", load: () => prisma.order.findMany({ select: { id: true, recipientPhone: true } }), field: "recipientPhone" },
  { label: "Customer.phone", load: () => prisma.customer.findMany({ select: { id: true, phone: true } }), field: "phone" },
  { label: "Driver.phone", load: () => prisma.driver.findMany({ select: { id: true, phone: true } }), field: "phone" },
];

function classify(raw) {
  if (raw === null || raw === undefined) return { bucket: "NULL" };
  const trimmed = String(raw).trim();
  if (!trimmed) return { bucket: "VIDE" };

  const result = normalizePhone(trimmed);
  if (!result.valid) {
    return { bucket: result.code, detail: result.message };
  }

  const already = trimmed === result.e164;
  return {
    bucket: already ? "DÉJÀ CANONIQUE" : "À CONVERTIR",
    canonical: result.e164,
    legacy: result.legacyInput,
    source: result.sourceFormat,
  };
}

async function main() {
  console.log("\n=== AUDIT DES NUMÉROS DE TÉLÉPHONE (lecture seule) ===\n");

  const recap = [];
  const conversions = [];
  const anomalies = [];

  for (const source of SOURCES) {
    const rows = await source.load();
    const counts = {};
    const byCanonical = new Map();

    for (const row of rows) {
      const value = row[source.field];
      const verdict = classify(value);

      counts[verdict.bucket] = (counts[verdict.bucket] ?? 0) + 1;

      if (verdict.canonical) {
        const key = verdict.canonical;
        if (!byCanonical.has(key)) byCanonical.set(key, []);
        byCanonical.get(key).push(String(value));
      }

      if (verdict.bucket === "À CONVERTIR") {
        conversions.push({
          table: source.label,
          id: row.id,
          avant: String(value),
          apres: verdict.canonical,
          ancienFormat: verdict.legacy,
        });
      }

      if (
        verdict.bucket !== "À CONVERTIR" &&
        verdict.bucket !== "DÉJÀ CANONIQUE" &&
        verdict.bucket !== "NULL" &&
        verdict.bucket !== "VIDE"
      ) {
        anomalies.push({ table: source.label, id: row.id, valeur: String(value), motif: verdict.bucket });
      }
    }

    // Doublons : plusieurs écritures pour un même abonné DANS la même table.
    const collisions = [...byCanonical.entries()].filter(
      ([, values]) => new Set(values).size > 1,
    );

    console.log(`--- ${source.label} : ${rows.length} ligne(s) ---`);
    for (const [bucket, n] of Object.entries(counts).sort()) {
      console.log(`    ${bucket.padEnd(18)} ${n}`);
    }
    if (collisions.length > 0) {
      console.log(`    ⚠ ${collisions.length} abonné(s) écrit(s) de plusieurs façons :`);
      for (const [canonical, values] of collisions) {
        console.log(`        ${canonical}  ←  ${JSON.stringify([...new Set(values)])}`);
      }
    } else {
      console.log("    ✔ aucune écriture multiple d'un même abonné");
    }
    console.log("");

    recap.push({ table: source.label, total: rows.length, counts });
  }

  console.log("=== CONVERSIONS PRÉVUES ===");
  if (conversions.length === 0) {
    console.log("    Aucune valeur à convertir.");
  } else {
    for (const c of conversions) {
      console.log(
        `    ${c.table} ${c.id} : "${c.avant}" → "${c.apres}"${c.ancienFormat ? "  (ancien format 8 chiffres)" : ""}`,
      );
    }
  }

  console.log("\n=== ANOMALIES (à revoir à la main, jamais corrigées en silence) ===");
  if (anomalies.length === 0) {
    console.log("    Aucune.");
  } else {
    for (const a of anomalies) {
      console.log(`    ${a.table} ${a.id} : "${a.valeur}" — ${a.motif}`);
    }
  }

  console.log("\n=== DOUBLONS CLIENTS APRÈS NORMALISATION ===");
  const customers = await prisma.customer.findMany({ select: { id: true, phone: true } });
  const seen = new Map();
  for (const c of customers) {
    const result = normalizePhone(c.phone);
    if (!result.valid) continue;
    if (!seen.has(result.e164)) seen.set(result.e164, []);
    seen.get(result.e164).push(c.id);
  }
  const dupes = [...seen.entries()].filter(([, ids]) => ids.length > 1);
  if (dupes.length === 0) {
    console.log("    Aucun doublon : chaque abonné a une seule fiche client.");
  } else {
    for (const [canonical, ids] of dupes) {
      console.log(`    ${canonical} : ${ids.length} fiches → ${ids.join(", ")}`);
    }
  }

  console.log(
    `\nRÉSUMÉ : ${conversions.length} conversion(s), ${anomalies.length} anomalie(s), ${dupes.length} doublon(s) client.\n`,
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Audit impossible :", error.message);
  await prisma.$disconnect();
  process.exit(1);
});
