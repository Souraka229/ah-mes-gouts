/**
 * Wipe complète : vider TOUTES les données (pas les tables)
 * Conserve le schéma intact pour repartir de zéro
 * Usage: node scripts/wipe-all-data.mjs
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
if (existsSync(join(__dirname, "../.env"))) {
  for (const line of readFileSync(join(__dirname, "../.env"), "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log("\n🗑️  WIPE COMPLET : VIDAGE DE TOUTES LES DONNÉES\n");
  console.log("⚠️  ATTENTION : Toutes les données seront supprimées !\n");

  try {
    // L'ordre est important pour les contraintes FK
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
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
        "PushSubscription"
      RESTART IDENTITY CASCADE
    `);

    console.log("✓ Données supprimées (tables conservées)\n");

    // Vérification
    const counts = {
      Order: await prisma.order.count(),
      OrderItem: await prisma.orderItem.count(),
      Customer: await prisma.customer.count(),
      Driver: await prisma.driver.count(),
      OrderStatusFeed: await prisma.orderStatusFeed.count(),
      CustomerDevice: await prisma.customerDevice.count(),
      CustomerActivity: await prisma.customerActivity.count(),
      AdminActionLog: await prisma.adminActionLog.count(),
    };

    console.log("📊 VÉRIFICATION :\n");
    for (const [table, count] of Object.entries(counts)) {
      const status = count === 0 ? "✓" : "✗";
      console.log(`${status} ${table.padEnd(25)} : ${count} lignes`);
    }

    const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
    if (totalRows === 0) {
      console.log("\n✅ BASE DE DONNÉES VIDE — Prête pour repartir de zéro !\n");
    } else {
      console.log(`\n❌ Erreur : ${totalRows} lignes restantes\n`);
      process.exit(1);
    }
  } catch (e) {
    console.error("❌ Erreur wipe:", e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
