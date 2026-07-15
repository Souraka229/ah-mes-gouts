/**
 * Aligne DeliveryZone (Supabase) sur la grille affiches A–E.
 * Usage : node scripts/sync-delivery-zones.mjs
 */
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

const ZONES = [
  { id: "zone-e", name: "Destinations E", cost: 500 },
  { id: "zone-d", name: "Destinations D", cost: 700 },
  { id: "zone-c", name: "Destinations C", cost: 800 },
  { id: "zone-b", name: "Destinations B", cost: 1000 },
  { id: "zone-a", name: "Destinations A", cost: 1500 },
];

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.deliveryZone.deleteMany();
    await tx.deliveryZone.createMany({
      data: ZONES.map((z) => ({
        id: z.id,
        name: z.name,
        cost: z.cost,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })),
    });
    await tx.deliverySchedule.updateMany({
      data: { startTime: "13:00", endTime: "19:00", isActive: true },
    });
  });

  const rows = await prisma.deliveryZone.findMany({ orderBy: { cost: "asc" } });
  console.log(
    "OK zones:",
    rows.map((r) => `${r.id} ${r.name} ${r.cost}F`).join(" | "),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
