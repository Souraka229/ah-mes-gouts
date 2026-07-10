/**
 * Seed minimal Postgres (produits, livreurs démo, menus).
 * Usage : npm run seed:db
 */
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

loadEnvFile(join(__dirname, "../.env"));
loadEnvFile(join(__dirname, "../.env.local"));

const prisma = new PrismaClient();

const DEMO_PRODUCTS = [
  {
    id: "seed-1",
    slug: "mango-passion",
    name: "Mango Passion",
    description: "Mangue Alphonso, fruit de la passion.",
    price: 5000,
    imageUrl: "/images/produits/mangue-passion.webp",
    imageUrls: ["/images/produits/mangue-passion.webp"],
    keyword: "Solaire",
    stockRemaining: 12,
    stockMinimum: 5,
    category: "Glaces",
    isNew: true,
    isMenuDuJour: true,
    isPopular: true,
  },
  {
    id: "seed-2",
    slug: "goyave-vanille",
    name: "Goyave Vanille",
    description: "Goyave rose, vanille de Madagascar.",
    price: 5000,
    imageUrl: "/images/produits/goyave-vanille.webp",
    imageUrls: ["/images/produits/goyave-vanille.webp"],
    keyword: "Floral",
    stockRemaining: 10,
    stockMinimum: 5,
    category: "Glaces",
    isNew: true,
    isMenuDuJour: true,
    isPopular: false,
  },
  {
    id: "seed-3",
    slug: "tiramisu",
    name: "Tiramisu",
    description: "Mascarpone onctueux, biscuit café.",
    price: 5000,
    imageUrl: "/images/produits/tiramisu-rose.webp",
    imageUrls: ["/images/produits/tiramisu-rose.webp"],
    keyword: "Onctueux",
    stockRemaining: 8,
    stockMinimum: 5,
    category: "Entremets",
    isNew: false,
    isMenuDuJour: false,
    isPopular: true,
  },
];

const DEMO_DRIVERS = [
  {
    id: randomUUID(),
    name: "Kossi Mensah",
    phone: "+22997000001",
    accessToken: randomUUID(),
    isActive: true,
  },
  {
    id: randomUUID(),
    name: "Afi Dossou",
    phone: "+22997000002",
    accessToken: randomUUID(),
    isActive: true,
  },
];

function defaultActivateAt(date, hour = 8, minute = 0) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seedProducts() {
  const count = await prisma.product.count();
  if (count > 0) {
    console.log(`SKIP products (${count} déjà en base)`);
    return count;
  }

  for (const p of DEMO_PRODUCTS) {
    await prisma.product.create({
      data: {
        ...p,
        isPromotion: false,
        isGiftCard: false,
      },
    });
  }
  console.log(`OK products (${DEMO_PRODUCTS.length} insérés)`);
  return DEMO_PRODUCTS.length;
}

async function seedDrivers() {
  const count = await prisma.driver.count();
  if (count > 0) {
    console.log(`SKIP drivers (${count} déjà en base)`);
    return prisma.driver.findMany({ take: 2 });
  }

  const created = [];
  for (const d of DEMO_DRIVERS) {
    const row = await prisma.driver.create({ data: d });
    created.push(row);
  }
  console.log(`OK drivers (${created.length} insérés)`);
  return created;
}

async function seedMenus(productIds) {
  const count = await prisma.menu.count();
  if (count > 0) {
    console.log(`SKIP menus (${count} déjà en base)`);
    return count;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const displayOrder = productIds.map((_, i) => i);

  await prisma.menu.createMany({
    data: [
      {
        id: randomUUID(),
        date: today,
        activateAt: defaultActivateAt(today, 8, 0),
        status: "ACTIVE",
        productIds,
        displayOrder,
      },
      {
        id: randomUUID(),
        date: tomorrow,
        activateAt: defaultActivateAt(tomorrow, 20, 0),
        status: "SCHEDULED",
        productIds,
        displayOrder,
      },
    ],
  });
  console.log("OK menus (2 insérés : actif + programmé)");
  return 2;
}

async function main() {
  await seedProducts();
  const products = await prisma.product.findMany({
    take: 8,
    orderBy: { name: "asc" },
    select: { id: true },
  });
  await seedDrivers();
  await seedMenus(products.map((p) => p.id));

  const summary = {
    Product: await prisma.product.count(),
    Driver: await prisma.driver.count(),
    Menu: await prisma.menu.count(),
    Order: await prisma.order.count(),
  };
  console.log("SEED_DONE", summary);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("SEED_ERR", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
