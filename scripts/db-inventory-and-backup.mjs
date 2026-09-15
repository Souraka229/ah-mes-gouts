#!/usr/bin/env node
/**
 * Étape 0 — Inventaire + export JSON de toutes les données publiques.
 * Usage: node scripts/db-inventory-and-backup.mjs
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

for (const envFile of ["../.env", "../.env.local"]) {
  const path = join(__dirname, envFile);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

const prisma = new PrismaClient();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupDir = join(__dirname, "../backups", timestamp);

/** Tables Prisma mappées → export complet */
const MODELS = [
  { name: "DeliveryZone", fn: () => prisma.deliveryZone.findMany() },
  { name: "DeliverySchedule", fn: () => prisma.deliverySchedule.findMany() },
  { name: "DeliveryOptions", fn: () => prisma.deliveryOptions.findMany() },
  { name: "Driver", fn: () => prisma.driver.findMany() },
  { name: "Customer", fn: () => prisma.customer.findMany() },
  { name: "CustomerDevice", fn: () => prisma.customerDevice.findMany() },
  { name: "CustomerActivity", fn: () => prisma.customerActivity.findMany() },
  { name: "CustomerOtp", fn: () => prisma.customerOtp.findMany() },
  { name: "Order", fn: () => prisma.order.findMany() },
  { name: "OrderItem", fn: () => prisma.orderItem.findMany() },
  { name: "PaymentAttempt", fn: () => prisma.paymentAttempt.findMany() },
  { name: "AdminSession", fn: () => prisma.adminSession.findMany() },
  { name: "OrderIdempotencyKey", fn: () => prisma.orderIdempotencyKey.findMany() },
  { name: "RateLimitBucket", fn: () => prisma.rateLimitBucket.findMany() },
  { name: "Product", fn: () => prisma.product.findMany() },
  { name: "Menu", fn: () => prisma.menu.findMany() },
  { name: "SiteSettingsStore", fn: () => prisma.siteSettingsStore.findMany() },
  { name: "AdminActionLog", fn: () => prisma.adminActionLog.findMany() },
  { name: "OrderStatusFeed", fn: () => prisma.orderStatusFeed.findMany() },
  { name: "SiteVisitorDay", fn: () => prisma.siteVisitorDay.findMany() },
  { name: "PushSubscription", fn: () => prisma.pushSubscription.findMany() },
  { name: "PackCombine", fn: () => prisma.packCombine.findMany() },
];

async function main() {
  mkdirSync(backupDir, { recursive: true });

  console.log("\n=== INVENTAIRE BASE DE DONNÉES ===\n");
  console.log(`Backup → backups/${timestamp}/\n`);

  const summary = [];
  const allData = {};

  for (const { name, fn } of MODELS) {
    try {
      const rows = await fn();
      allData[name] = rows;
      summary.push({ table: name, count: rows.length });
      writeFileSync(join(backupDir, `${name}.json`), JSON.stringify(rows, null, 2));
    } catch (e) {
      summary.push({ table: name, count: -1, error: e.message });
    }
  }

  // Tables supplémentaires via pg_catalog (RLS, storage, etc.)
  const extraTables = await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN (${MODELS.map((m) => `'${m.name}'`).join(", ")})
    ORDER BY tablename
  `);

  for (const { tablename } of extraTables) {
    try {
      const countResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count FROM "${tablename}"`,
      );
      const count = countResult[0]?.count ?? 0;
      summary.push({ table: tablename, count, extra: true });
      if (count > 0) {
        const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${tablename}"`);
        allData[tablename] = rows;
        writeFileSync(
          join(backupDir, `${tablename}.json`),
          JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2),
        );
      }
    } catch (e) {
      summary.push({ table: tablename, count: -1, extra: true, error: e.message });
    }
  }

  writeFileSync(join(backupDir, "_ALL_DATA.json"), JSON.stringify(allData, null, 2));
  writeFileSync(join(backupDir, "_SUMMARY.json"), JSON.stringify(summary, null, 2));

  console.log("Table".padEnd(28) + "Lignes");
  console.log("-".repeat(40));
  let total = 0;
  for (const s of summary.sort((a, b) => a.table.localeCompare(b.table))) {
    const label = s.extra ? `${s.table} (extra)` : s.table;
    const countStr = s.error ? `ERR: ${s.error}` : String(s.count);
    if (!s.error && s.count > 0) total += s.count;
    console.log(label.padEnd(28) + countStr);
  }
  console.log("-".repeat(40));
  console.log("TOTAL lignes (hors vides)".padEnd(28) + total);
  console.log(`\nBackup complet : backups/${timestamp}/\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
