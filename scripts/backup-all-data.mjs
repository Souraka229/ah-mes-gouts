/**
 * Backup complet de toutes les tables Supabase en JSON horodaté.
 * Lecture seule — aucune écriture en base.
 * Usage: node scripts/backup-all-data.mjs
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from .env and .env.local
if (existsSync(join(__dirname, "../.env"))) {
  for (const line of readFileSync(join(__dirname, "../.env"), "utf8").split("\n")) {
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

if (existsSync(join(__dirname, "../.env.local"))) {
  for (const line of readFileSync(join(__dirname, "../.env.local"), "utf8").split("\n")) {
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

const TABLES = [
  { name: "DeliveryZone", model: "deliveryZone" },
  { name: "DeliverySchedule", model: "deliverySchedule" },
  { name: "DeliveryOptions", model: "deliveryOptions" },
  { name: "Product", model: "product" },
  { name: "Menu", model: "menu" },
  { name: "Driver", model: "driver" },
  { name: "Customer", model: "customer" },
  { name: "CustomerDevice", model: "customerDevice" },
  { name: "CustomerActivity", model: "customerActivity" },
  { name: "CustomerOtp", model: "customerOtp" },
  { name: "Order", model: "order" },
  { name: "OrderItem", model: "orderItem" },
  { name: "PaymentAttempt", model: "paymentAttempt" },
  { name: "AdminSession", model: "adminSession" },
  { name: "OrderIdempotencyKey", model: "orderIdempotencyKey" },
  { name: "RateLimitBucket", model: "rateLimitBucket" },
  { name: "SiteSettingsStore", model: "siteSettingsStore" },
  { name: "AdminActionLog", model: "adminActionLog" },
  { name: "OrderStatusFeed", model: "orderStatusFeed" },
  { name: "SiteVisitorDay", model: "siteVisitorDay" },
  { name: "PushSubscription", model: "pushSubscription" },
];

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const backupDir = join(__dirname, "..", "backups", timestamp);
  mkdirSync(backupDir, { recursive: true });

  console.log(`\n📦 Sauvegarde complète de Supabase → ${backupDir}\n`);

  const counts = {};
  const totals = { tables: TABLES.length, rowsTotal: 0 };

  for (const table of TABLES) {
    try {
      const data = await prisma[table.model].findMany();
      counts[table.name] = data.length;
      totals.rowsTotal += data.length;

      writeFileSync(
        join(backupDir, `${table.name}.json`),
        JSON.stringify(data, null, 2),
        "utf8"
      );

      console.log(`✓ ${table.name.padEnd(25)} : ${data.length.toString().padStart(6)} lignes`);
    } catch (e) {
      console.error(`✗ ${table.name} : ${e.message}`);
      counts[table.name] = "ERROR";
    }
  }

  // Write summary
  writeFileSync(
    join(backupDir, "_counts.json"),
    JSON.stringify(
      {
        timestamp,
        totalTables: TABLES.length,
        totalRows: totals.rowsTotal,
        counts,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`\n📊 Résumé : ${totals.rowsTotal} lignes, ${TABLES.length} tables\n`);
  console.log(`💾 Backup sauvegardé dans: ${backupDir}\n`);

  // Highlight the 5 tables that will be truncated
  console.log("⚠️  TABLES QUI SERONT VIDÉES :\n");
  const toTruncate = ["Product", "Menu", "DeliveryZone", "DeliverySchedule", "DeliveryOptions"];
  for (const name of toTruncate) {
    console.log(`  ${name.padEnd(25)} : ${counts[name].toString().padStart(6)} lignes`);
  }

  console.log("\n✅ Backup terminé. En attente de votre confirmation avant vidage.\n");
  console.log("Tapez 'confirmé' pour continuer :\n");
}

main()
  .catch((e) => {
    console.error("❌ Erreur backup:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
