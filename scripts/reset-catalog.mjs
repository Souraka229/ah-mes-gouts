/**
 * Réinitialisation catalogue — vidage sélectif + insertion complète.
 *
 * CONSERVE : DeliveryZone, DeliverySchedule, DeliveryOptions, SiteSettingsStore, SiteContentStore
 * VIDE     : Product, Menu, AdminActionLog + tables opérationnelles
 *
 * Usage: node scripts/reset-catalog.mjs
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
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

const IMG = {
  fleurs: "/images/produits/bouquet-roses.webp",
  nounours: "/images/produits/nounours-beige.webp",
  entremets: "/images/produits/foret-noire.webp",
  tiramisu: "/images/produits/tiramisu-caramel.webp",
};

const PART_NOTE =
  "Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.";

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
  { slug: "rose-unite", name: "Rose à l'unité", description: "Une rose fraîche, sans emballage.", price: 3500 },
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
  {
    slug: "supplement-chocolats",
    name: "Quelques chocolats",
    description:
      "Une petite sélection de chocolats pour accompagner votre bouquet.",
    price: 3000,
  },
  {
    slug: "supplement-chocolats-paquet",
    name: "Paquet complet de chocolats",
    description:
      "Le paquet complet — une générosité qui se partage, pour un cadeau qui marque.",
    price: 10000,
  },
];

const NOUNOURS = {
  slug: "nounours",
  name: "Nounours",
  description:
    "Nounours en peluche — choisissez la taille (25 à 140 cm) sur la fiche produit.",
  price: 15000,
};

const CLASSIC_CAKES = [
  ["chocolat-vanille", "Chocolat Vanille"],
  ["chocolat-cappuccino", "Chocolat Cappuccino"],
  ["chocolat-baileys", "Chocolat Baileys"],
  ["chocolat-menthe", "Chocolat Menthe"],
  ["chocolat-framboise", "Chocolat Framboise"],
  ["mangue-vanille", "Mangue Vanille"],
  ["framboise-vanille", "Framboise Vanille"],
  ["vanille-cappuccino", "Vanille Cappuccino"],
];

const SIGNATURE_CAKES = [
  ["tropicana", "Tropicana", "Mousse vanille mascarpone, insert bissap et ananas.", 72],
  ["afrodisiak", "Afrodisiak", "Mousse chocolat, crémeux gingembre.", 72],
  ["banoffee", "Banoffee", "Mousse chocolat, crémeux beurre d'arachide, banane flambée et caramélisée.", 72],
  ["mojito", "Mojito", "Mousse vanille, insert menthe-citron.", null],
  ["tiramisu", "Tiramisu", "Mousse tiramisu, insert crémeux cappuccino.", null],
  ["foret-noire", "Forêt-Noire", "Mousse chocolat et vanille, insert compotée de cerise.", null],
  ["vanille-myrtille", "Vanille Myrtille", "Mousse vanille mascarpone, insert gelée de myrtille.", null],
];

function buildCatalog(now) {
  const rows = [];

  for (const f of FLOWERS_UNITS) {
    rows.push({
      id: f.slug,
      slug: f.slug,
      name: f.name,
      description: f.name,
      price: f.price,
      category: "Fleurs",
      imageUrl: IMG.fleurs,
      keyword: "Fleur fraîche",
      stockRemaining: 9999,
      stockMinimum: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const b of BOUQUETS) {
    // Les chocolats ne sont pas des fleurs, et n'ont pas de photo dédiée :
    // emplacement neutre plutôt que la photo d'un autre produit.
    const isChocolat = b.slug.startsWith("supplement-chocolat");
    rows.push({
      id: b.slug,
      slug: b.slug,
      name: b.name,
      description: b.description,
      price: b.price,
      category: isChocolat ? "Chocolats" : "Fleurs",
      imageUrl: isChocolat ? "" : IMG.fleurs,
      keyword: isChocolat ? "Duo" : "Roses fraîches",
      stockRemaining: 9999,
      stockMinimum: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  rows.push({
    id: NOUNOURS.slug,
    slug: NOUNOURS.slug,
    name: NOUNOURS.name,
    description: NOUNOURS.description,
    price: NOUNOURS.price,
    category: "Nounours",
    imageUrl: IMG.nounours,
    keyword: "25 à 140 cm",
    stockRemaining: 9999,
    stockMinimum: 0,
    createdAt: now,
    updatedAt: now,
  });

  for (const [slug, name] of CLASSIC_CAKES) {
    const id = `commande-${slug}`;
    rows.push({
      id,
      slug: id,
      name,
      description: `Grand entremets ${name.toLowerCase()}, monté à la commande. ${PART_NOTE}`,
      price: 3000,
      category: "Sur commande",
      imageUrl: IMG.entremets,
      keyword: "À la part",
      stockRemaining: 9999,
      stockMinimum: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const [slug, name, description, lead] of SIGNATURE_CAKES) {
    const id = `commande-${slug}`;
    rows.push({
      id,
      slug: id,
      name,
      description:
        `${description} ${PART_NOTE}` + (lead ? ` À commander au moins ${lead} h à l'avance.` : ""),
      price: 3500,
      category: "Sur commande",
      imageUrl: slug === "tiramisu" ? IMG.tiramisu : IMG.entremets,
      keyword: "Signature",
      stockRemaining: 9999,
      stockMinimum: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  return rows;
}

async function main() {
  const now = new Date();

  console.log("\n=== ÉTAPE 1 : VIDAGE SÉLECTIF ===\n");
  console.log("Conservé : DeliveryZone, DeliverySchedule, DeliveryOptions, CMS\n");

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
      "PushSubscription",
      "PackCombine",
      "Menu",
      "Product"
    RESTART IDENTITY CASCADE
  `);
  console.log("✓ Vidage effectué\n");

  console.log("=== ÉTAPE 2 : VÉRIFICATION ===\n");
  const wiped = {
    Product: await prisma.product.count(),
    Menu: await prisma.menu.count(),
    AdminActionLog: await prisma.adminActionLog.count(),
    Order: await prisma.order.count(),
  };
  for (const [table, count] of Object.entries(wiped)) {
    if (count !== 0) {
      console.error(`❌ ${table} : ${count} lignes restantes`);
      process.exit(1);
    }
    console.log(`✓ ${table.padEnd(20)} : 0 lignes`);
  }

  const kept = {
    DeliveryZone: await prisma.deliveryZone.count(),
    DeliverySchedule: await prisma.deliverySchedule.count(),
    DeliveryOptions: await prisma.deliveryOptions.count(),
    SiteSettingsStore: await prisma.siteSettingsStore.count(),
  };
  console.log("\nConservé :");
  for (const [table, count] of Object.entries(kept)) {
    console.log(`  ${table.padEnd(20)} : ${count} lignes`);
  }

  console.log("\n=== ÉTAPE 3 : INSERTION CATALOGUE ===\n");
  const catalog = buildCatalog(now);
  await prisma.product.createMany({ data: catalog });
  console.log(`✓ ${catalog.length} produits insérés\n`);

  const byCat = await prisma.product.groupBy({
    by: ["category"],
    _count: true,
    orderBy: { _count: { category: "desc" } },
  });
  console.log("Catalogue par catégorie :");
  for (const row of byCat) {
    console.log(`  ${String(row.category).padEnd(16)} ${row._count}`);
  }

  console.log("\n✅ Réinitialisation terminée — Menu du jour vide, prêt pour la gérante.\n");
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
