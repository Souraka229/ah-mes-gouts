#!/usr/bin/env node
/**
 * QA smoke test — site live (lecture seule).
 * Usage: SITE_URL=https://giftentremets.com npm run qa:live
 */
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

const BASE =
  process.env.SITE_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://giftentremets.com";

const checks = [];

async function probe(name, url, expectStatus, opts = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: opts.headers,
      body: opts.body,
      redirect: opts.followRedirect === false ? "manual" : "follow",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
    });
    const ms = Date.now() - started;
    const ok = Array.isArray(expectStatus)
      ? expectStatus.includes(res.status)
      : res.status === expectStatus;
    let snippet = "";
    if (opts.readJson) {
      try {
        snippet = JSON.stringify(await res.json()).slice(0, 200);
      } catch {
        snippet = "(non-json)";
      }
    }
    checks.push({
      name,
      url,
      ok,
      status: res.status,
      ms,
      snippet: snippet || undefined,
    });
  } catch (e) {
    checks.push({
      name,
      url,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

console.log(`\n=== QA live — ${BASE} ===\n`);

await probe("Accueil", `${BASE}/`, 200);
await probe("Catalogue", `${BASE}/catalogue`, 200);
await probe("Checkout", `${BASE}/checkout`, 200);
await probe("Zones livraison", `${BASE}/zones-de-livraison`, 200);
await probe("API health", `${BASE}/api/health`, 200, { readJson: true });
await probe("API delivery config", `${BASE}/api/delivery/config`, 200);
await probe("API créneaux pickup", `${BASE}/api/delivery/slots?type=pickup`, 200);
await probe("API créneaux delivery", `${BASE}/api/delivery/slots?type=delivery`, 200);

await probe("Webhook WhatsApp GET (ping)", `${BASE}/api/webhooks/whatsapp`, [
  200,
  403,
]);
await probe("Webhook WhatsApp POST (sans sig)", `${BASE}/api/webhooks/whatsapp`, [
  401,
  403,
  400,
  429,
], {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});

await probe("Cron WhatsApp autopilot (sans auth)", `${BASE}/api/cron/whatsapp-autopilot`, [
  401,
  403,
]);

await probe("Admin WhatsApp (redirect auth)", `${BASE}/admin/whatsapp`, [200, 307, 308], {
  followRedirect: false,
});

const failed = checks.filter((c) => !c.ok);
const whatsappMissing = checks.filter(
  (c) =>
    c.url.includes("/api/webhooks/whatsapp") ||
    c.url.includes("whatsapp-autopilot"),
).every((c) => c.status === 404);

for (const c of checks) {
  const mark = c.ok ? "✓" : "✗";
  const detail = c.error
    ? c.error
    : `HTTP ${c.status}${c.ms != null ? ` (${c.ms}ms)` : ""}${c.snippet ? ` — ${c.snippet}` : ""}`;
  console.log(`  ${mark} ${c.name}: ${detail}`);
}

if (whatsappMissing) {
  console.log(
    "\n⚠ WhatsApp non déployé en prod (404 webhook + cron). Pousser main + migrations Supabase.",
  );
}

console.log(
  `\nRésultat: ${checks.length - failed.length}/${checks.length} OK\n`,
);

const coreFailed = failed.filter(
  (c) =>
    !c.url.includes("/api/webhooks/whatsapp") &&
    !c.url.includes("whatsapp-autopilot"),
);
const strict = process.env.QA_STRICT === "1";
if (strict && failed.length > 0) process.exit(1);
if (coreFailed.length > 0) process.exit(1);
process.exit(0);
