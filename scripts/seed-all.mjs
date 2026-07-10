/**
 * Seed Postgres uniquement (plus d'écriture data/*.json).
 * Usage : npm run seed
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

console.log("Seed Prisma — npm run seed:db\n");
execSync("node scripts/seed-db.mjs", { cwd: root, stdio: "inherit" });
