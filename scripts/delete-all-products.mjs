#!/usr/bin/env node
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

const before = await prisma.product.count();
await prisma.menu.deleteMany();
const result = await prisma.product.deleteMany();
const after = await prisma.product.count();

console.log(`Produits avant : ${before}`);
console.log(`Produits supprimés : ${result.count}`);
console.log(`Produits restants : ${after}`);
console.log(`Menus vidés (références produits obsolètes)`);

await prisma.$disconnect();
