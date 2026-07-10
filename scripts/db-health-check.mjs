/**
 * Health check DB — tables, RLS, Realtime, écriture test.
 * Usage : npm run db:health
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

const REQUIRED_TABLES = [
  "Order",
  "OrderItem",
  "Driver",
  "Product",
  "Menu",
  "DeliveryZone",
  "DeliverySchedule",
];

const REQUIRED_ORDER_COLS = [
  "driverId",
  "driverStartedAt",
  "driverDeliveredAt",
];

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  const names = tables.map((t) => t.tablename);
  const missingTables = REQUIRED_TABLES.filter((t) => !names.includes(t));

  const orderCols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Order'
  `;
  const colNames = orderCols.map((c) => c.column_name);
  const missingCols = REQUIRED_ORDER_COLS.filter((c) => !colNames.includes(c));

  const realtime = await prisma.$queryRaw`
    SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
  `;
  const realtimeOk = realtime.some((r) => r.tablename === "Order");

  const rls = await prisma.$queryRaw`
    SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname IN ('Order', 'OrderItem', 'Driver')
    ORDER BY c.relname
  `;

  const counts = {
    Product: await prisma.product.count(),
    Driver: await prisma.driver.count(),
    Menu: await prisma.menu.count(),
    Order: await prisma.order.count(),
  };

  // Test écriture livreur + lecture
  const testDriver = await prisma.driver.create({
    data: {
      id: `health-${Date.now()}`,
      name: "Health Check",
      phone: `+22999${Date.now().toString().slice(-6)}`,
      accessToken: `health-${Date.now()}`,
    },
  });
  await prisma.driver.delete({ where: { id: testDriver.id } });

  const ok =
    missingTables.length === 0 &&
    missingCols.length === 0 &&
    realtimeOk &&
    counts.Product > 0 &&
    counts.Driver > 0 &&
    counts.Menu > 0;

  console.log(JSON.stringify({
    ok,
    tables: names,
    missingTables,
    missingOrderColumns: missingCols,
    realtimeOnOrder: realtimeOk,
    rls: rls.map((r) => ({ table: r.tablename, enabled: r.rowsecurity })),
    counts,
    writeTest: "driver_create_delete_ok",
  }, null, 2));

  await prisma.$disconnect();
  if (!ok) process.exit(1);
}

main().catch(async (e) => {
  console.error("HEALTH_ERR", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
