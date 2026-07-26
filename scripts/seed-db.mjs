/**
 * Seed démo Postgres (produits, livreurs, menus).
 * Usage :
 *   npm run seed:db
 *   node scripts/seed-db.mjs --force   # réécrit les produits démo
 */
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FORCE = process.argv.includes("--force");

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
    id: "demo-mango-passion",
    slug: "mango-passion",
    name: "Mango Passion",
    description: "Mangue Alphonso, fruit de la passion.",
    price: 5000,
    imageUrl: "/images/produits/gift/mangue-passion-11.20.47-1.webp",
    imageUrls: ["/images/produits/gift/mangue-passion-11.20.47-1.webp"],
    keyword: "Solaire",
    stockRemaining: 12,
    stockMinimum: 3,
    category: "Entremets",
    isNew: true,
    isMenuDuJour: true,
    isPopular: true,
    isGiftCard: false,
  },
  {
    id: "demo-goyave-vanille",
    slug: "goyave-vanille",
    name: "Goyave Vanille",
    description: "Goyave rose, vanille de Madagascar.",
    price: 5000,
    imageUrl: "/images/produits/gift/goyave-vanille-11.20.48.webp",
    imageUrls: ["/images/produits/gift/goyave-vanille-11.20.48.webp"],
    keyword: "Floral",
    stockRemaining: 10,
    stockMinimum: 3,
    category: "Entremets",
    isNew: true,
    isMenuDuJour: true,
    isPopular: false,
    isGiftCard: false,
  },
  {
    id: "demo-tiramisu",
    slug: "tiramisu",
    name: "Tiramisu",
    description: "Mascarpone onctueux, biscuit café.",
    price: 5000,
    imageUrl: "/images/produits/gift/tiramisu-11.20.50.webp",
    imageUrls: ["/images/produits/gift/tiramisu-11.20.50.webp"],
    keyword: "Onctueux",
    stockRemaining: 8,
    stockMinimum: 3,
    category: "Entremets",
    isNew: false,
    isMenuDuJour: true,
    isPopular: true,
    isGiftCard: false,
  },
  {
    id: "demo-fraisier",
    slug: "fraisier",
    name: "Fraisier",
    description: "Fraises fraîches, crème légère.",
    price: 5500,
    imageUrl: "/images/produits/gift/fraisier-11.20.42-1.webp",
    imageUrls: ["/images/produits/gift/fraisier-11.20.42-1.webp"],
    keyword: "Fruité",
    stockRemaining: 9,
    stockMinimum: 3,
    category: "Entremets",
    isNew: false,
    isMenuDuJour: true,
    isPopular: true,
    isGiftCard: false,
  },
  {
    id: "demo-nounours-beige",
    slug: "nounours-beige",
    name: "Nounours beige",
    description: "Peluche douce — toujours disponible.",
    price: 3500,
    imageUrl: "/images/produits/gift/la-corbeille-a-fruits-11.20.44.webp",
    imageUrls: ["/images/produits/gift/la-corbeille-a-fruits-11.20.44.webp"],
    keyword: "Cadeau",
    stockRemaining: 9999,
    stockMinimum: 0,
    category: "Nounours",
    isNew: false,
    isMenuDuJour: false,
    isPopular: true,
    isGiftCard: false,
  },
  {
    id: "demo-nounours-rose",
    slug: "nounours-rose",
    name: "Nounours rose",
    description: "Le compagnon parfait pour un entremets.",
    price: 3500,
    imageUrl: "/images/produits/gift/cheesecake-framboise-11.20.42.webp",
    imageUrls: ["/images/produits/gift/cheesecake-framboise-11.20.42.webp"],
    keyword: "Cadeau",
    stockRemaining: 9999,
    stockMinimum: 0,
    category: "Nounours",
    isNew: true,
    isMenuDuJour: false,
    isPopular: false,
    isGiftCard: false,
  },
  {
    id: "demo-carte-cadeau",
    slug: "carte-cadeau",
    name: "Carte cadeau",
    description: "Un mot doux accompagné de votre commande.",
    price: 1500,
    imageUrl: "/images/produits/gift/foret-blanche-11.20.50-2.webp",
    imageUrls: ["/images/produits/gift/foret-blanche-11.20.50-2.webp"],
    keyword: "Message",
    stockRemaining: 9999,
    stockMinimum: 0,
    category: "Carte",
    isNew: false,
    isMenuDuJour: false,
    isPopular: true,
    isGiftCard: true,
    giftCardMessage: "Une douceur préparée rien que pour toi.",
  },
];

const DEMO_DRIVERS = [
  {
    id: "demo-driver-kossi",
    name: "Kossi Mensah",
    phone: "+22997000001",
    accessToken: "demo-driver-kossi-token",
    isActive: true,
  },
  {
    id: "demo-driver-afi",
    name: "Afi Dossou",
    phone: "+22997000002",
    accessToken: "demo-driver-afi-token",
    isActive: true,
  },
];

function defaultActivateAt(date, hour = 8, minute = 0) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seedProducts() {
  let upserted = 0;
  for (const p of DEMO_PRODUCTS) {
    const { giftCardMessage, ...rest } = p;
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        ...rest,
        giftCardMessage: giftCardMessage ?? null,
        isPromotion: false,
      },
      update: FORCE
        ? {
            name: p.name,
            description: p.description,
            price: p.price,
            imageUrl: p.imageUrl,
            imageUrls: p.imageUrls,
            keyword: p.keyword,
            stockRemaining: p.stockRemaining,
            stockMinimum: p.stockMinimum,
            category: p.category,
            isNew: p.isNew,
            isMenuDuJour: p.isMenuDuJour,
            isPopular: p.isPopular,
            isGiftCard: p.isGiftCard,
            giftCardMessage: giftCardMessage ?? null,
          }
        : {
            category: p.category,
            isGiftCard: p.isGiftCard,
            ...(p.isGiftCard
              ? { giftCardMessage: giftCardMessage ?? null }
              : {}),
          },
    });
    upserted += 1;
  }
  console.log(`OK products (${upserted} démo)`);
  return upserted;
}

async function seedDrivers() {
  for (const d of DEMO_DRIVERS) {
    await prisma.driver.upsert({
      where: { phone: d.phone },
      create: d,
      update: FORCE
        ? { name: d.name, isActive: true, accessToken: d.accessToken }
        : { isActive: true },
    });
  }
  console.log(`OK drivers (${DEMO_DRIVERS.length})`);
}

async function seedMenus() {
  const menuProducts = await prisma.product.findMany({
    where: {
      OR: [{ isMenuDuJour: true }, { category: "Entremets" }],
    },
    take: 8,
    orderBy: { name: "asc" },
    select: { id: true },
  });
  const productIds = menuProducts.map((p) => p.id);
  if (productIds.length === 0) {
    console.log("SKIP menus (aucun entremets)");
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingActive = await prisma.menu.findFirst({
    where: { status: "ACTIVE", date: today },
  });

  if (existingActive && !FORCE) {
    console.log("SKIP menus (menu actif déjà présent)");
    return;
  }

  if (FORCE) {
    await prisma.menu.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "EXPIRED" },
    });
  }

  if (!existingActive || FORCE) {
    await prisma.menu.create({
      data: {
        id: randomUUID(),
        date: today,
        activateAt: defaultActivateAt(today, 8, 0),
        status: "ACTIVE",
        productIds,
        displayOrder: productIds.map((_, i) => i),
      },
    });
    console.log("OK menu du jour (ACTIVE)");
  }
}

async function seedDeliveryBasics() {
  const zones = [
    { id: "zone-a", name: "Zone A", cost: 500 },
    { id: "zone-b", name: "Zone B", cost: 800 },
    { id: "zone-c", name: "Zone C", cost: 1000 },
    { id: "zone-d", name: "Zone D", cost: 1200 },
    { id: "zone-e", name: "Zone E", cost: 1500 },
  ];

  for (const zone of zones) {
    await prisma.deliveryZone.upsert({
      where: { id: zone.id },
      create: { ...zone, isActive: true },
      update: { name: zone.name, cost: zone.cost, isActive: true },
    });
  }

  await prisma.deliveryOptions.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      maxOrdersPerSlot: 8,
      bookingDaysAhead: 7,
      pickupAddress: "Gift & ENTREMETS — Cotonou, Bénin",
    },
    update: {
      maxOrdersPerSlot: 8,
      bookingDaysAhead: 7,
    },
  });

  const scheduleCount = await prisma.deliverySchedule.count();
  if (scheduleCount === 0 || FORCE) {
    if (FORCE && scheduleCount > 0) {
      await prisma.deliverySchedule.deleteMany();
    }
    const rows = [];
    for (let day = 0; day <= 6; day++) {
      rows.push(
        {
          id: randomUUID(),
          dayOfWeek: day,
          startTime: "13:00",
          endTime: "18:30",
          slotDuration: 330,
          type: "delivery",
          isActive: true,
        },
        {
          id: randomUUID(),
          dayOfWeek: day,
          startTime: "13:00",
          endTime: "18:30",
          slotDuration: 330,
          type: "pickup",
          isActive: true,
        },
      );
    }
    await prisma.deliverySchedule.createMany({ data: rows });
  }

  console.log("OK delivery zones + créneaux");
}

async function main() {
  console.log(FORCE ? "SEED mode --force" : "SEED mode soft upsert");
  await seedProducts();
  await seedDrivers();
  await seedMenus();
  await seedDeliveryBasics();

  const summary = {
    Product: await prisma.product.count(),
    Driver: await prisma.driver.count(),
    Menu: await prisma.menu.count(),
    DeliveryZone: await prisma.deliveryZone.count(),
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
