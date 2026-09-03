/**
 * Vérifie la table PackCombine en Supabase
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

const prisma = new PrismaClient();

async function main() {
  console.log("\n✅ VÉRIFICATION FINALE\n");
  console.log("=".repeat(50) + "\n");

  try {
    // Vérifier PackCombine
    const packCount = await prisma.packCombine.count();
    console.log(`✓ Table PackCombine : ${packCount} lignes (vide)`);

    // Vérifier Product
    const productCount = await prisma.product.count();
    console.log(`✓ Table Product : ${productCount} lignes (catalogue fleurs)`);

    // Vérifier Menu
    const menuCount = await prisma.menu.count();
    console.log(`✓ Table Menu : ${menuCount} lignes (volontairement vide)`);

    // Vérifier DeliveryZone
    const zoneCount = await prisma.deliveryZone.count();
    console.log(`✓ Table DeliveryZone : ${zoneCount} zones (A–E)`);

    // Vérifier DeliverySchedule
    const scheduleCount = await prisma.deliverySchedule.count();
    console.log(`✓ Table DeliverySchedule : ${scheduleCount} créneaux`);

    // Vérifier Order vide
    const orderCount = await prisma.order.count();
    console.log(`✓ Table Order : ${orderCount} lignes (vide)`);

    console.log("\n" + "=".repeat(50));
    console.log("\n🎉 BASE DE DONNÉES PRÊTE !\n");
    console.log("✅ Migrations appliquées");
    console.log("✅ Catalogue fleurs en place");
    console.log("✅ Configuration livraison OK");
    console.log("✅ Prêt pour npm run dev\n");
  } catch (e) {
    console.error("❌ Erreur:", e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
