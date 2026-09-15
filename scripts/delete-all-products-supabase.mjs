#!/usr/bin/env node
/**
 * Supprime TOUS les produits via l'API Supabase (service_role).
 * Usage: node scripts/delete-all-products-supabase.mjs
 */
import { createClient } from "@supabase/supabase-js";
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function count(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function deleteAll(table) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .neq("id", "__impossible__");
  if (error) throw new Error(`${table} delete: ${error.message}`);
  return count ?? 0;
}

console.log("\n=== Suppression via Supabase (service_role) ===\n");
console.log(`Projet : ${url}\n`);

const beforeProducts = await count("Product");
const beforeMenus = await count("Menu");

console.log(`Avant — Product: ${beforeProducts}, Menu: ${beforeMenus}`);

const deletedMenus = await deleteAll("Menu");
const deletedProducts = await deleteAll("Product");

const afterProducts = await count("Product");
const afterMenus = await count("Menu");

console.log(`\nSupprimé — Product: ${deletedProducts}, Menu: ${deletedMenus}`);
console.log(`Après — Product: ${afterProducts}, Menu: ${afterMenus}\n`);

if (afterProducts !== 0) {
  console.error("❌ Des produits restent en base.");
  process.exit(1);
}

console.log("✅ Catalogue vide confirmé via Supabase.\n");
