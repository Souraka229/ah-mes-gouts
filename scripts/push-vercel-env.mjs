/**
 * Push env vars to Vercel project gift-entremets (Production + Preview).
 * Usage: node scripts/push-vercel-env.mjs
 * Never logs secret values.
 */
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://gift-entremets.vercel.app";

const envMap = {
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_ACCESS_TOKENS: process.env.ADMIN_ACCESS_TOKENS,
  NEXT_PUBLIC_SITE_URL: siteUrl,
  CRON_SECRET: process.env.CRON_SECRET || randomBytes(24).toString("hex"),
  CRM_OTP_PEPPER: process.env.CRM_OTP_PEPPER || randomBytes(24).toString("hex"),
  NEXT_PUBLIC_INSTAGRAM_URL:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/ahmesgouts",
  NEXT_PUBLIC_INSTAGRAM_HANDLE:
    process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "@ahmesgouts",
};

const missing = Object.entries(envMap)
  .filter(([, v]) => !v?.trim())
  .map(([k]) => k);

if (missing.length) {
  console.error("Missing required env:", missing.join(", "));
  process.exit(1);
}

const vercelDir = join(root, ".vercel");
mkdirSync(vercelDir, { recursive: true });
writeFileSync(
  join(vercelDir, "env-production.json"),
  JSON.stringify(envMap, null, 2),
);

const targets = ["production", "preview"];
let ok = 0;
let fail = 0;

for (const [key, value] of Object.entries(envMap)) {
  for (const target of targets) {
    // Remove existing then add (idempotent)
    spawnSync("npx", ["vercel", "env", "rm", key, target, "-y"], {
      cwd: root,
      encoding: "utf8",
      shell: true,
    });

    const add = spawnSync(
      "npx",
      ["vercel", "env", "add", key, target, "--force"],
      {
        cwd: root,
        encoding: "utf8",
        shell: true,
        input: value + "\n",
      },
    );

    if (add.status === 0) {
      ok += 1;
      console.log(`✓ ${key} → ${target}`);
    } else {
      fail += 1;
      console.error(
        `✗ ${key} → ${target}`,
        (add.stderr || add.stdout || "").slice(0, 200),
      );
    }
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
console.log("SITE_URL:", siteUrl);
console.log("ADMIN_DEV_OPEN intentionally NOT pushed");
process.exit(fail > 0 ? 1 : 0);
