/**
 * Ping silencieux de la base — à brancher sur n'importe quel planificateur
 * externe (cron d'un serveur, Planificateur de tâches Windows, autre CI…).
 *
 * Ouvre une connexion Prisma, exécute `SELECT 1`, se déconnecte. Aucune
 * écriture, aucune sortie sauf en cas d'échec — ou avec --verbose.
 *
 * Usage :
 *   npm run db:keep-alive
 *   node scripts/db-keep-alive.mjs --verbose
 *   node scripts/run-with-prod-env.mjs node scripts/db-keep-alive.mjs   (base prod)
 *
 * Sort 0 si la base répond, 1 sinon.
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERBOSE = process.argv.includes("--verbose");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

// L'environnement du planificateur prime ; les fichiers .env comblent les trous.
loadEnvFile(join(__dirname, "../.env"));
loadEnvFile(join(__dirname, "../.env.local"));
loadEnvFile(join(__dirname, "../.env.production.local"));

if (!process.env.DATABASE_URL) {
  console.error("db-keep-alive: DATABASE_URL absente.");
  process.exit(1);
}

const prisma = new PrismaClient();
const startedAt = Date.now();

try {
  await prisma.$queryRaw`SELECT 1`;
  if (VERBOSE) {
    console.log(`db-keep-alive: OK en ${Date.now() - startedAt} ms`);
  }
  await prisma.$disconnect();
  process.exit(0);
} catch (error) {
  console.error(
    `db-keep-alive: échec — ${error instanceof Error ? error.message : error}`,
  );
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
}
