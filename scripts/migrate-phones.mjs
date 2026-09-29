/**
 * Migration des numéros vers la forme canonique `+229…`.
 *
 *   node scripts/migrate-phones.mjs                    → simulation (n'écrit RIEN)
 *   node scripts/migrate-phones.mjs --apply            → écrit, après sauvegarde
 *   node scripts/migrate-phones.mjs --apply --skip-conflicts
 *        → migre tout SAUF les fiches en conflit d'unicité, qui sont listées.
 *          Réservé aux cas où le conflit est un doublon de contact sans
 *          conséquence (aucune commande rattachée) : on ne fusionne ni ne
 *          supprime rien, on laisse la fiche telle quelle.
 *
 * Garde-fous :
 *  - une sauvegarde horodatée des lignes concernées est écrite AVANT toute
 *    modification, dans `backups/` ;
 *  - toute valeur que `normalizePhone` refuse est laissée INTACTE et signalée :
 *    on ne corrige jamais une donnée ambiguë en silence ;
 *  - si deux lignes d'une même table devaient converger vers la même valeur
 *    sous contrainte d'unicité, la migration s'arrête sans rien écrire.
 *
 * Lancer `node scripts/audit-phones.mjs` d'abord, pour relire le rapport.
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

import { normalizePhone } from "../lib/phone.ts";

const APPLY = process.argv.includes("--apply");
const SKIP_CONFLICTS = process.argv.includes("--skip-conflicts");

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

const SOURCES = [
  {
    table: "Order",
    field: "clientPhone",
    load: () => prisma.order.findMany({ select: { id: true, clientPhone: true } }),
    write: (id, value) =>
      prisma.order.update({ where: { id }, data: { clientPhone: value } }),
    unique: false,
  },
  {
    table: "Order",
    field: "recipientPhone",
    load: () =>
      prisma.order.findMany({ select: { id: true, recipientPhone: true } }),
    write: (id, value) =>
      prisma.order.update({ where: { id }, data: { recipientPhone: value } }),
    unique: false,
  },
  {
    table: "Customer",
    field: "phone",
    load: () => prisma.customer.findMany({ select: { id: true, phone: true } }),
    write: (id, value) =>
      prisma.customer.update({ where: { id }, data: { phone: value } }),
    // `Customer.phone` est @unique : une convergence est bloquante.
    unique: true,
  },
  {
    table: "Driver",
    field: "phone",
    load: () => prisma.driver.findMany({ select: { id: true, phone: true } }),
    write: (id, value) =>
      prisma.driver.update({ where: { id }, data: { phone: value } }),
    unique: true,
  },
];

async function main() {
  console.log(
    APPLY
      ? "\n=== MIGRATION DES NUMÉROS — ÉCRITURE ===\n"
      : "\n=== MIGRATION DES NUMÉROS — SIMULATION (aucune écriture) ===\n",
  );

  /** id → { ancien, nouveau } par source. */
  const plan = [];
  const untouched = [];
  /**
   * Valeurs déjà stockées, par table.champ → (valeur → ids qui la portent).
   *
   * Indispensable : une conversion peut entrer en collision avec une valeur
   * qui existe DÉJÀ sans avoir besoin d'être convertie. Comparer les seules
   * conversions entre elles ne suffit pas — c'est le cas du livreur dont le
   * numéro est enregistré deux fois, une fois par écriture.
   */
  const stored = new Map();

  for (const source of SOURCES) {
    const rows = await source.load();

    const byValue = new Map();
    for (const row of rows) {
      const value = row[source.field];
      if (value === null || value === undefined) continue;
      const key = String(value);
      if (!byValue.has(key)) byValue.set(key, []);
      byValue.get(key).push(row.id);
    }
    stored.set(`${source.table}.${source.field}`, byValue);

    for (const row of rows) {
      const raw = row[source.field];
      if (raw === null || raw === undefined || String(raw).trim() === "") continue;

      const result = normalizePhone(String(raw));
      if (!result.valid) {
        untouched.push({
          table: source.table,
          field: source.field,
          id: row.id,
          valeur: String(raw),
          motif: result.code,
        });
        continue;
      }

      if (String(raw) === result.e164) continue;

      plan.push({
        source,
        table: source.table,
        field: source.field,
        id: row.id,
        avant: String(raw),
        apres: result.e164,
      });
    }
  }

  // Contrôle de collision AVANT d'écrire quoi que ce soit.
  const collisions = [];
  const conflictedKeys = new Set();
  const changeKey = (change) => `${change.table}.${change.field}:${change.id}`;

  for (const source of SOURCES.filter((item) => item.unique)) {
    const changesByTarget = new Map();
    for (const change of plan.filter((item) => item.source === source)) {
      if (!changesByTarget.has(change.apres)) changesByTarget.set(change.apres, []);
      changesByTarget.get(change.apres).push(change);
    }

    // (a) Toutes les conversions qui convergent sont conflictuelles, pas
    // seulement la deuxième rencontrée.
    for (const changes of changesByTarget.values()) {
      if (changes.length < 2) continue;
      for (const change of changes) {
        conflictedKeys.add(changeKey(change));
        collisions.push({
          ...change,
          autreId: changes
            .filter((other) => other.id !== change.id)
            .map((other) => other.id)
            .join(", "),
          motif: "deux fiches convergent",
        });
      }
    }

    // (b) La cible est déjà portée par une autre ligne. Si cette ligne est
    // elle-même dans le plan, on l'exclut aussi pour ne toucher aucun côté
    // du conflit en mode --skip-conflicts.
    const byValue = stored.get(`${source.table}.${source.field}`);
    for (const change of plan.filter((item) => item.source === source)) {
      const holders = (byValue?.get(change.apres) ?? []).filter(
        (id) => id !== change.id,
      );
      if (holders.length === 0) continue;

      conflictedKeys.add(changeKey(change));
      const holderChanges = plan.filter(
        (item) => item.source === source && holders.includes(item.id),
      );
      for (const holderChange of holderChanges) {
        conflictedKeys.add(changeKey(holderChange));
      }
      collisions.push({
        ...change,
        autreId: holders.join(", "),
        motif: "valeur déjà portée par une autre fiche",
      });
    }
  }

  const skipped = plan.filter((change) => conflictedKeys.has(changeKey(change)));
  const changesToApply = plan.filter(
    (change) => !conflictedKeys.has(changeKey(change)),
  );

  console.log(
    `${changesToApply.length} valeur(s) à convertir${skipped.length > 0 ? `, ${skipped.length} ignorée(s) en raison des conflits` : ""}.`,
  );

  for (const change of changesToApply) {
    console.log(
      `    ${change.table}.${change.field} ${change.id} : "${change.avant}" → "${change.apres}"`,
    );
  }

  if (skipped.length > 0 && SKIP_CONFLICTS) {
    console.log("\nValeur(s) ignorée(s) — conflit(s) laissé(s) intact(s) :");
    for (const change of skipped) {
      console.log(
        `    ${change.table}.${change.field} ${change.id} : "${change.avant}" → "${change.apres}"`,
      );
    }
  }

  if (untouched.length > 0) {
    console.log(`\n${untouched.length} valeur(s) NON touchée(s) — à revoir à la main :`);
    for (const item of untouched) {
      console.log(`    ${item.table}.${item.field} ${item.id} : "${item.valeur}" (${item.motif})`);
    }
  }

  if (collisions.length > 0 && !SKIP_CONFLICTS) {
    console.error(
      `\nARRÊT : ${collisions.length} collision(s) sous contrainte d'unicité. Rien n'a été écrit.`,
    );
    for (const c of collisions) {
      console.error(
        `    ${c.table}.${c.field} : ${c.id} (« ${c.avant} ») → ${c.apres} — ${c.autreId} [${c.motif}]`,
      );
    }
    console.error(
      "    Fusionnez ces fiches à la main (elles portent peut-être des commandes distinctes).",
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  if (collisions.length > 0) {
    console.warn(
      `\nATTENTION : ${skipped.length} valeur(s) sont exclue(s) de cette migration. Les conflits ci-dessous restent à résoudre :`,
    );
    for (const c of collisions) {
      console.warn(
        `    ${c.table}.${c.field} : ${c.id} (« ${c.avant} ») → ${c.apres} — ${c.autreId} [${c.motif}]`,
      );
    }
  }

  if (!APPLY) {
    console.log("\nSimulation terminée. Relancez avec --apply pour écrire.\n");
    await prisma.$disconnect();
    return;
  }

  if (changesToApply.length === 0) {
    console.log("\nRien à migrer.\n");
    await prisma.$disconnect();
    return;
  }

  // Sauvegarde AVANT écriture : sans elle, pas de retour arrière possible.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync("backups", { recursive: true });
  const backupPath = `backups/phones-${stamp}.json`;
  writeFileSync(
    backupPath,
    JSON.stringify(
      changesToApply.map(({ table, field, id, avant }) => ({ table, field, id, avant })),
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nSauvegarde écrite : ${backupPath}`);

  let done = 0;
  for (const change of changesToApply) {
    try {
      await change.source.write(change.id, change.apres);
      done += 1;
    } catch (error) {
      console.error(
        `    ÉCHEC ${change.table}.${change.field} ${change.id} : ${error.message}`,
      );
    }
  }

  console.log(`\n${done}/${changesToApply.length} valeur(s) migrée(s).`);
  console.log(`Retour arrière : rejouer ${backupPath} (champ « avant »).\n`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Migration impossible :", error.message);
  await prisma.$disconnect();
  process.exit(1);
});
