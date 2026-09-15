#!/usr/bin/env node
/** Vide TOUTES les données — schéma conservé. Supabase + Prisma. */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const f of ["../.env", "../.env.local"]) {
  const path = join(__dirname, f);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (!process.env[key]) process.env[key] = v;
  }
}

const TABLES = [
  "OrderItem",
  "PaymentAttempt",
  "Order",
  "OrderStatusFeed",
  "OrderIdempotencyKey",
  "RateLimitBucket",
  "CustomerActivity",
  "CustomerDevice",
  "CustomerOtp",
  "Customer",
  "Driver",
  "AdminSession",
  "AdminActionLog",
  "SiteVisitorDay",
  "PushSubscription",
  "PackCombine",
  "Menu",
  "Product",
  "DeliverySchedule",
  "DeliveryZone",
  "DeliveryOptions",
  "SiteSettingsStore",
  "SiteContentStore",
];

const prisma = new PrismaClient();

console.log("\n🗑️  VIDAGE TOTAL — toutes les données\n");

try {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      ${TABLES.map((t) => `"${t}"`).join(",\n      ")}
    RESTART IDENTITY CASCADE
  `);
  console.log("✓ TRUNCATE Prisma OK\n");
} catch (e) {
  console.error("Prisma TRUNCATE:", e.message);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (url && key) {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  console.log(`Supabase API — ${url}\n`);
  for (const table of TABLES) {
    const { error, count } = await sb
      .from(table)
      .delete({ count: "exact" })
      .neq("id", "__impossible__");
    if (error && !error.message.includes("Could not find")) {
      console.log(`  ${table.padEnd(22)} ${error.message}`);
    } else {
      console.log(`  ${table.padEnd(22)} ${count ?? 0} supprimé(s)`);
    }
  }
}

console.log("\n📊 Vérification :\n");
for (const table of TABLES) {
  try {
    const model = table.charAt(0).toLowerCase() + table.slice(1);
    const fn = prisma[model]?.count?.bind(prisma[model]);
    const n = fn ? await fn() : -1;
    if (n >= 0) console.log(`  ${table.padEnd(22)} ${n} ligne(s)`);
  } catch {
    /* table hors Prisma */
  }
}

await prisma.$disconnect();
console.log("\n✅ Terminé.\n");
