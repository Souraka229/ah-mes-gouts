#!/usr/bin/env node
/** Fusionne les 9 fiches nounours en une seule + supprime les anciennes. */
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
const now = new Date();

const SINGLE = {
  id: "nounours",
  slug: "nounours",
  name: "Nounours",
  description:
    "Nounours en peluche — choisissez la taille (20 à 140 cm) sur la fiche produit.",
  price: 10000,
  imageUrl: "/images/produits/nounours-beige.webp",
  keyword: "20 à 140 cm",
};

async function main() {
  const removed = await prisma.product.deleteMany({
    where: {
      OR: [
        { slug: { startsWith: "nounours-" } },
        { slug: "nounours-beige" },
        { slug: "nounours-rose" },
      ],
    },
  });

  await prisma.product.upsert({
    where: { slug: "nounours" },
    create: {
      ...SINGLE,
      category: "Nounours",
      stockRemaining: 9999,
      stockMinimum: 0,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      name: SINGLE.name,
      description: SINGLE.description,
      price: SINGLE.price,
      category: "Nounours",
      imageUrl: SINGLE.imageUrl,
      keyword: SINGLE.keyword,
      stockRemaining: 9999,
      stockMinimum: 0,
      updatedAt: now,
    },
  });

  const count = await prisma.product.count({ where: { category: "Nounours" } });
  console.log(`✓ ${removed.count} ancienne(s) fiche(s) supprimée(s)`);
  console.log(`✓ 1 fiche « Nounours » — ${count} en base (catégorie Nounours)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
