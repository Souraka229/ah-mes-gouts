/**
 * Crée la table PackCombine en Supabase
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
  console.log("\n🚀 Création table PackCombine en Supabase...\n");

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PackCombine" (
        "id" TEXT NOT NULL,
        "productAId" TEXT NOT NULL,
        "productBId" TEXT NOT NULL,
        "packPrice" INTEGER NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PackCombine_pkey" PRIMARY KEY ("id")
      )
    `);

    console.log("✅ Table PackCombine créée en Supabase\n");
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log("ℹ️  Table PackCombine existe déjà ✓\n");
    } else {
      console.error("❌ Erreur:", e.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
