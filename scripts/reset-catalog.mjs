/**
 * Réinitialisation du catalogue : vidage + réinsertion
 * Étapes 1bis (vidage) + 2 (vérif) + 3 (insertion)
 * Usage: node scripts/reset-catalog.mjs
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

// Données de réinsertion
const FLOWERS_UNITS = [
  { slug: "lys-royal", name: "Lys royal", price: 3500 },
  { slug: "gypsophile", name: "Gypsophile", price: 2000 },
  { slug: "rose-rouge", name: "Rose rouge", price: 3500 },
  { slug: "rose-rose", name: "Rose rose", price: 3000 },
  { slug: "rose-orange", name: "Rose orange", price: 3000 },
  { slug: "rose-blanche", name: "Rose blanche", price: 3000 },
  { slug: "rose-deux-teintes", name: "Rose deux teintes", price: 3000 },
  { slug: "statice", name: "Statice", price: 1500 },
  { slug: "chrysanthemes", name: "Chrysanthèmes", price: 2500 },
  { slug: "bambou-petit", name: "Bambou Petit", price: 6000 },
  { slug: "bambou-moyen", name: "Bambou Moyen", price: 7000 },
  { slug: "bambou-grand", name: "Bambou Grand", price: 8000 },
];

const BOUQUETS = [
  { slug: "bouquet-1-rose", name: "Bouquet 1 rose", description: "Une rose parfumée, gypsophile et emballage.", price: 5000 },
  { slug: "bouquet-2-roses", name: "Bouquet 2 roses", description: "Deux roses parfumées et gypsophile.", price: 10000 },
  { slug: "bouquet-3-roses", name: "Bouquet 3 roses", description: "Trois roses parfumées, gypsophile et carte.", price: 12000 },
  { slug: "bouquet-5-roses", name: "Bouquet 5 roses", description: "5 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.", price: 20000 },
  { slug: "bouquet-7-roses", name: "Bouquet 7 roses", description: "7 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.", price: 25000 },
  { slug: "bouquet-9-roses", name: "Bouquet 9 roses", description: "9 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.", price: 33000 },
  { slug: "bouquet-10-roses", name: "Bouquet 10 roses", description: "10 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.", price: 35000 },
  { slug: "bouquet-12-roses", name: "Bouquet 12 roses", description: "12 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.", price: 42000 },
  { slug: "bouquet-15-roses", name: "Bouquet 15 roses", description: "15 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.", price: 50000 },
  { slug: "bouquet-20-roses", name: "Bouquet 20 roses", description: "20 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.", price: 70000 },
  { slug: "supplement-chocolats", name: "Supplément chocolats", description: "À ajouter à un bouquet. De quelques chocolats (3 000 F) au paquet complet (10 000 F) — précisez la quantité souhaitée en commentaire.", price: 3000 },
];

const DELIVERY_ZONES = [
  { id: "zone-e", name: "Destinations E", cost: 500 },
  { id: "zone-d", name: "Destinations D", cost: 700 },
  { id: "zone-c", name: "Destinations C", cost: 800 },
  { id: "zone-b", name: "Destinations B", cost: 1000 },
  { id: "zone-a", name: "Destinations A", cost: 1500 },
];

async function main() {
  const now = new Date();

  console.log("\n🗑️  ÉTAPE 1bis : VIDAGE DES 5 TABLES\n");
  try {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "Product", "Menu", "DeliveryZone", "DeliverySchedule", "DeliveryOptions" RESTART IDENTITY`
    );
    console.log("✓ Vidage effectué\n");
  } catch (e) {
    console.error("❌ Erreur vidage:", e.message);
    process.exit(1);
  }

  console.log("🔍 ÉTAPE 2 : VÉRIFICATION (0 LIGNE)\n");
  const counts = {
    Product: await prisma.product.count(),
    Menu: await prisma.menu.count(),
    DeliveryZone: await prisma.deliveryZone.count(),
    DeliverySchedule: await prisma.deliverySchedule.count(),
    DeliveryOptions: await prisma.deliveryOptions.count(),
  };

  for (const [table, count] of Object.entries(counts)) {
    if (count !== 0) {
      console.error(`❌ ${table} : ${count} lignes (devrait être 0)`);
      process.exit(1);
    }
    console.log(`✓ ${table.padEnd(25)} : 0 lignes`);
  }
  console.log();

  console.log("📥 ÉTAPE 3 : RÉINSERTION DES DONNÉES\n");

  // 3a. DeliveryZones
  console.log("  3a. DeliveryZones (A–E)...");
  await prisma.deliveryZone.createMany({
    data: DELIVERY_ZONES.map((z) => ({
      id: z.id,
      name: z.name,
      cost: z.cost,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })),
  });
  console.log(`     ✓ ${DELIVERY_ZONES.length} zones insérées\n`);

  // 3a. DeliverySchedule (7 jours × 2 modes = 14 lignes)
  console.log("  3a. DeliverySchedule (14 créneaux)...");
  const scheduleData = [];
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    scheduleData.push({
      dayOfWeek,
      startTime: "13:00",
      endTime: "19:00",
      slotDuration: 30,
      type: "delivery",
      isActive: true,
    });
    scheduleData.push({
      dayOfWeek,
      startTime: "13:00",
      endTime: "19:00",
      slotDuration: 30,
      type: "pickup",
      isActive: true,
    });
  }
  await prisma.deliverySchedule.createMany({ data: scheduleData });
  console.log(`     ✓ 14 créneaux insérés\n`);

  // 3a. DeliveryOptions
  console.log("  3a. DeliveryOptions (défaut)...");
  await prisma.deliveryOptions.create({
    data: {
      id: "default",
      maxOrdersPerSlot: 5,
      bookingDaysAhead: 7,
      pickupAddress: "Gift & ENTREMETS — Cotonou, Bénin",
      updatedAt: now,
    },
  });
  console.log(`     ✓ Configuration livraison insérée\n`);

  // 3b. Fleurs à l'unité
  console.log("  3b. Fleurs à l'unité (12 produits)...");
  for (const flower of FLOWERS_UNITS) {
    await prisma.product.create({
      data: {
        id: flower.slug,
        slug: flower.slug,
        name: flower.name,
        description: flower.name,
        price: flower.price,
        imageUrl: "/images/produits/bouquet-roses.webp",
        category: "Fleurs",
        stockRemaining: 9999,
        stockMinimum: 0,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  console.log(`     ✓ ${FLOWERS_UNITS.length} produits insérés\n`);

  // 3c. Bouquets de roses
  console.log("  3c. Bouquets de roses (11 produits)...");
  for (const bouquet of BOUQUETS) {
    await prisma.product.create({
      data: {
        id: bouquet.slug,
        slug: bouquet.slug,
        name: bouquet.name,
        description: bouquet.description,
        price: bouquet.price,
        imageUrl: "/images/produits/bouquet-roses.webp",
        category: "Fleurs",
        stockRemaining: 9999,
        stockMinimum: 0,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  console.log(`     ✓ ${BOUQUETS.length} produits insérés\n`);

  console.log("✅ RÉINITIALISATION COMPLÈTE\n");
  console.log("📊 Résumé final :\n");
  console.log(`   Product           : ${await prisma.product.count()} lignes`);
  console.log(`   Menu              : ${await prisma.menu.count()} lignes`);
  console.log(`   DeliveryZone      : ${await prisma.deliveryZone.count()} lignes`);
  console.log(`   DeliverySchedule  : ${await prisma.deliverySchedule.count()} lignes`);
  console.log(`   DeliveryOptions   : ${await prisma.deliveryOptions.count()} lignes\n`);

  console.log(`💐 Catalogue "Fleurs" : ${FLOWERS_UNITS.length + BOUQUETS.length} produits\n`);
  console.log("🎉 Prêt pour le checkout et la gérante !\n");
}

main()
  .catch((e) => {
    console.error("❌ Erreur réinitialisation:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
