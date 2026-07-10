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

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log("TABLES:", tables.map((t) => t.tablename).join(", "));

  const orderCols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Order'
    ORDER BY column_name
  `;
  console.log("ORDER_COLUMNS:", orderCols.map((c) => c.column_name).join(", "));

  const driverExists = tables.some((t) => t.tablename === "Driver");
  console.log("DRIVER_TABLE:", driverExists ? "yes" : "no");

  const realtime = await prisma.$queryRaw`
    SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
  `;
  console.log("REALTIME_TABLES:", realtime.map((r) => r.tablename).join(", ") || "(none)");

  const rls = await prisma.$queryRaw`
    SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname IN ('Order', 'OrderItem', 'Driver', 'Product', 'Menu')
    ORDER BY c.relname
  `;
  console.log("RLS:");
  for (const row of rls) {
    console.log(`  ${row.tablename}: ${row.rowsecurity ? "enabled" : "disabled"}`);
  }

  const counts = {
    Product: await prisma.product.count(),
    Menu: await prisma.menu.count(),
    Driver: driverExists
      ? await prisma.$queryRaw`SELECT COUNT(*)::bigint AS count FROM "Driver"`
      : [{ count: 0n }],
    Order: await prisma.order.count(),
  };
  console.log("ROW_COUNTS:", {
    Product: counts.Product,
    Menu: counts.Menu,
    Driver: Number(counts.Driver[0]?.count ?? 0),
    Order: counts.Order,
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
