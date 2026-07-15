#!/usr/bin/env node
/**
 * Vérifications pré-déploiement (lecture seule).
 * Usage : npm run deploy:check
 */
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

loadEnvFile(join(root, ".env"));
loadEnvFile(join(root, ".env.local"));

const REQUIRED_PROD = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "ADMIN_ACCESS_TOKENS",
  "CRON_SECRET",
  "CRM_OTP_PEPPER",
];

const RECOMMENDED = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_UPLOAD_PRESET",
];

const FORBIDDEN_IN_PROD = ["ADMIN_DEV_OPEN", "CRM_OTP_DEV_RETURN"];

const checks = [];

for (const key of REQUIRED_PROD) {
  const ok = Boolean(process.env[key]?.trim());
  checks.push({ key, ok, level: "required" });
}

for (const key of RECOMMENDED) {
  const ok = Boolean(process.env[key]?.trim());
  checks.push({ key, ok, level: "recommended" });
}

for (const key of FORBIDDEN_IN_PROD) {
  const bad = process.env[key] === "true";
  checks.push({ key, ok: !bad, level: bad ? "forbidden" : "ok" });
}

let migratePending = null;
try {
  const out = execSync("npx prisma migrate status", {
    cwd: root,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  migratePending = out.includes("not yet been applied");
} catch (e) {
  const out = e.stdout?.toString() ?? e.stderr?.toString() ?? e.message;
  migratePending = out.includes("not yet been applied") ? true : "error";
}

const vercelLinked = existsSync(join(root, ".vercel", "project.json"));
const requiredFail = checks.filter((c) => c.level === "required" && !c.ok);
const forbiddenFail = checks.filter((c) => c.level === "forbidden" && !c.ok);

console.log("\n=== Gift & ENTREMETS — deploy:check ===\n");

console.log("Variables obligatoires (Vercel Production) :");
for (const c of checks.filter((x) => x.level === "required")) {
  console.log(`  ${c.ok ? "✓" : "✗"} ${c.key}`);
}

console.log("\nRecommandées :");
for (const c of checks.filter((x) => x.level === "recommended")) {
  console.log(`  ${c.ok ? "✓" : "○"} ${c.key}`);
}

console.log("\nInterdites en prod :");
for (const c of checks.filter((x) => x.level === "forbidden" || x.level === "ok")) {
  if (c.level === "forbidden") console.log(`  ✗ ${c.key}=true — DÉSACTIVER`);
  else console.log(`  ✓ ${c.key} absent ou false`);
}

console.log(`\nProjet Vercel lié (.vercel/) : ${vercelLinked ? "oui" : "non — vercel link"}`);
console.log(
  `Migrations Prisma en attente : ${
    migratePending === true
      ? "OUI — lancer npx prisma migrate deploy"
      : migratePending === false
        ? "non"
        : "impossible à vérifier (DATABASE_URL ?)"
  }`,
);

console.log("\nProchaines étapes : voir DEPLOYMENT.md\n");

const ready =
  requiredFail.length === 0 &&
  forbiddenFail.length === 0 &&
  migratePending !== true;

process.exit(ready ? 0 : 1);
