#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";

for (const f of [".env", ".env.local"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (!process.env[key]) process.env[key] = v;
  }
}

const prisma = new PrismaClient();
const localProducts = await prisma.product.findMany({
  select: { slug: true, name: true, category: true, price: true },
  orderBy: { slug: "asc" },
});
const local = {
  Product: await prisma.product.count(),
  Menu: await prisma.menu.count(),
  Order: await prisma.order.count(),
  DeliveryZone: await prisma.deliveryZone.count(),
  DeliverySchedule: await prisma.deliverySchedule.count(),
  Customer: await prisma.customer.count(),
};
await prisma.$disconnect();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function sbCount(table) {
  const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
  if (error) return `ERR: ${error.message}`;
  return count ?? 0;
}

const supabase = {
  Product: await sbCount("Product"),
  Menu: await sbCount("Menu"),
  Order: await sbCount("Order"),
  DeliveryZone: await sbCount("DeliveryZone"),
  DeliverySchedule: await sbCount("DeliverySchedule"),
  Customer: await sbCount("Customer"),
};

const dbTarget = process.env.DATABASE_URL?.includes("localhost")
  ? "Docker local (localhost:5433)"
  : "Supabase (Prisma)";

console.log("\n=== ÉTAT DES BASES ===\n");
console.log(`Prisma (.env.local) → ${dbTarget}`);
console.log(JSON.stringify(local, null, 2));
if (localProducts.length) {
  console.log("\nProduits locaux :");
  for (const p of localProducts) {
    console.log(`  • ${p.slug.padEnd(22)} ${String(p.price).padStart(6)} F  [${p.category}] ${p.name}`);
  }
}

console.log(`\nSupabase prod (${process.env.NEXT_PUBLIC_SUPABASE_URL})`);
console.log(JSON.stringify(supabase, null, 2));
console.log("");
