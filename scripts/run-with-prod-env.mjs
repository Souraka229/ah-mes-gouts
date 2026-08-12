#!/usr/bin/env node
/**
 * Exécute une commande avec les variables de .env.production.local chargées,
 * sans jamais les afficher. Usage :
 *   node scripts/run-with-prod-env.mjs npx prisma migrate status
 *
 * Utile pour les opérations Prisma visant la base de production, que
 * `next build` charge automatiquement mais pas la CLI Prisma.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const ENV_FILE = process.env.ENV_FILE || ".env.production.local";

function parseEnv(content) {
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const [, , command, ...args] = process.argv;
if (!command) {
  console.error("Usage : node scripts/run-with-prod-env.mjs <commande> [args…]");
  process.exit(1);
}

let parsed;
try {
  parsed = parseEnv(readFileSync(ENV_FILE, "utf8"));
} catch {
  console.error(`Impossible de lire ${ENV_FILE}.`);
  process.exit(1);
}

const required = ["DATABASE_URL", "DIRECT_URL"];
const missing = required.filter((key) => !parsed[key]);
if (missing.length > 0) {
  console.error(`Variables manquantes dans ${ENV_FILE} : ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`→ ${command} ${args.join(" ")}  (env : ${ENV_FILE})`);

const child = spawn(command, args, {
  env: { ...process.env, ...parsed },
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 1));
