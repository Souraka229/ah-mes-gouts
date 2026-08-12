#!/usr/bin/env node
/**
 * Injecte le catalogue maison (grands entremets à la part, nounours, fleurs)
 * et nettoie les scories de la base.
 *
 * Idempotent : relançable sans créer de doublon — chaque produit est
 * identifié par son slug. Les prix et descriptions sont réalignés à chaque
 * passage sur lib/constants/catalogue-maison.ts, qui reste la source.
 *
 * Usage : node scripts/run-with-prod-env.mjs node scripts/seed-catalogue-maison.mjs
 *         node scripts/seed-catalogue-maison.mjs --dry   (aucune écriture)
 */
import { writeFileSync } from "node:fs";

const DRY = process.argv.includes("--dry");
/**
 * Mode SQL : émet un script au lieu d'écrire via Prisma.
 *
 * Nécessaire là où le protocole Postgres est filtré (TCP passe, le handshake
 * échoue) : le SQL part alors par l'API Management de Supabase.
 */
const SQL_OUT = process.argv.includes("--sql");

// Les constantes sont en TypeScript : on les redéclare ici pour que le script
// tourne sans étape de compilation. Toute modification se fait dans
// lib/constants/catalogue-maison.ts PUIS ici — un test garde les deux alignés.
const CLASSIC_PART_PRICE = 3000;
const SIGNATURE_PART_PRICE = 3500;

const CLASSIC = [
  ["chocolat-vanille", "Chocolat Vanille"],
  ["chocolat-cappuccino", "Chocolat Cappuccino"],
  ["chocolat-baileys", "Chocolat Baileys"],
  ["chocolat-menthe", "Chocolat Menthe"],
  ["chocolat-framboise", "Chocolat Framboise"],
  ["mangue-vanille", "Mangue Vanille"],
  ["framboise-vanille", "Framboise Vanille"],
  ["vanille-cappuccino", "Vanille Cappuccino"],
];

const SIGNATURES = [
  ["tropicana", "Tropicana", "Mousse vanille mascarpone, insert bissap et ananas.", 72],
  ["afrodisiak", "Afrodisiak", "Mousse chocolat, crémeux gingembre.", 72],
  ["banoffee", "Banoffee", "Mousse chocolat, crémeux beurre d'arachide, banane flambée et caramélisée.", 72],
  ["mojito", "Mojito", "Mousse vanille, insert menthe-citron.", null],
  ["tiramisu", "Tiramisu", "Mousse tiramisu, insert crémeux cappuccino.", null],
  ["foret-noire", "Forêt-Noire", "Mousse chocolat et vanille, insert compotée de cerise.", null],
  ["vanille-myrtille", "Vanille Myrtille", "Mousse vanille mascarpone, insert gelée de myrtille.", null],
];

const NOUNOURS = [
  [20, 10000], [25, 15000], [30, 25000], [80, 35000], [90, 40000],
  [100, 45000], [120, 50000], [130, 70000], [140, 90000],
];

const BOUQUETS = [
  ["rose-unite", "Rose à l'unité", "Une rose fraîche, sans emballage.", 3500],
  ["bouquet-1-rose", "Bouquet 1 rose", "Une rose parfumée, gypsophile et emballage.", 5000],
  ["bouquet-2-roses", "Bouquet 2 roses", "Deux roses parfumées et gypsophile.", 10000],
  ["bouquet-3-roses", "Bouquet 3 roses", "Trois roses parfumées, gypsophile et carte.", 12000],
  ...[[5, 20000], [7, 25000], [9, 33000], [10, 35000], [12, 42000], [15, 50000], [20, 70000]].map(
    ([n, p]) => [
      `bouquet-${n}-roses`,
      `Bouquet ${n} roses`,
      `${n} roses parfumées, gypsophile, carte et emballage. Sacoche offerte.`,
      p,
    ],
  ),
];

/** Visuels existants réutilisés — aucun produit ne part sans image. */
const IMG = {
  entremets: "/images/produits/foret-noire.webp",
  tiramisu: "/images/produits/tiramisu-caramel.webp",
  nounours: "/images/produits/nounours-beige.webp",
  fleurs: "/images/produits/bouquet-roses.webp",
};

const PART_NOTE =
  "Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.";

function rows() {
  const out = [];

  for (const [slug, name] of CLASSIC) {
    out.push({
      slug: `commande-${slug}`,
      name,
      description: `Grand entremets ${name.toLowerCase()}, monté à la commande. ${PART_NOTE}`,
      price: CLASSIC_PART_PRICE,
      category: "Sur commande",
      imageUrl: IMG.entremets,
      keyword: "À la part",
    });
  }

  for (const [slug, name, description, lead] of SIGNATURES) {
    out.push({
      slug: `commande-${slug}`,
      name,
      description:
        `${description} ${PART_NOTE}` +
        (lead ? ` À commander au moins ${lead} h à l'avance.` : ""),
      price: SIGNATURE_PART_PRICE,
      category: "Sur commande",
      imageUrl: slug === "tiramisu" ? IMG.tiramisu : IMG.entremets,
      keyword: "Signature",
    });
  }

  for (const [cm, price] of NOUNOURS) {
    out.push({
      slug: `nounours-${cm}cm`,
      name: `Nounours ${cm} cm`,
      description: `Nounours en peluche, ${cm} cm.`,
      price,
      category: "Nounours",
      imageUrl: IMG.nounours,
      keyword: `${cm} cm`,
    });
  }

  for (const [slug, name, description, price] of BOUQUETS) {
    out.push({
      slug,
      name,
      description,
      price,
      category: "Fleurs",
      imageUrl: IMG.fleurs,
      keyword: "Roses fraîches",
    });
  }

  out.push({
    slug: "supplement-chocolats",
    name: "Supplément chocolats",
    description:
      "À ajouter à un bouquet. De quelques chocolats (3 000 F) au paquet complet (10 000 F) — précisez la quantité souhaitée en commentaire.",
    price: 3000,
    category: "Fleurs",
    imageUrl: IMG.fleurs,
    keyword: "Duo",
  });

  return out;
}

/** Produits de test laissés en base — jamais vendus, stock à zéro. */
const JUNK_SLUGS = ["test", "test-2", "restafy"];

/** Noms abîmés par un double encodage UTF-8. */
const MOJIBAKE = [
  ["ForÃªt Blanche", "Forêt Blanche"],
  ["ForÃªt Noire", "Forêt Noire"],
  ["La Corbeille Ã  Fruits", "La Corbeille à Fruits"],
  ["Le CafÃ©", "Le Café"],
];

const q = (v) =>
  v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

function buildSql() {
  const out = [
    "-- Catalogue maison — genere par scripts/seed-catalogue-maison.mjs",
    "-- Idempotent : relançable sans creer de doublon.",
    "begin;",
    "",
    "-- 1. Noms abimes par un double encodage UTF-8",
  ];

  for (const [broken, fixed] of MOJIBAKE) {
    out.push(`update "Product" set name = ${q(fixed)} where name = ${q(broken)};`);
  }

  out.push("", "-- 2. Produits de test laisses en base");
  out.push(
    `delete from "Product" where slug in (${JUNK_SLUGS.map(q).join(", ")});`,
  );

  out.push("", "-- 3. Catalogue maison (upsert par slug)");
  for (const r of rows()) {
    out.push(
      [
        `insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")`,
        `values (${q(r.slug)}, ${q(r.slug)}, ${q(r.name)}, ${q(r.description)}, ${r.price}, ${q(r.category)}, ${q(r.imageUrl)}, ${q(r.keyword)}, 9999, 0, now(), now())`,
        `on conflict (slug) do update set`,
        `  name = excluded.name, description = excluded.description, price = excluded.price,`,
        `  category = excluded.category, "imageUrl" = excluded."imageUrl",`,
        `  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,`,
        `  "updatedAt" = now();`,
      ].join("\n"),
    );
  }

  out.push("", "commit;");
  return out.join("\n");
}

async function main() {
  if (SQL_OUT) {
    const sql = buildSql();
    const dest = "scripts/seed-catalogue-maison.sql";
    writeFileSync(dest, sql);
    const items = rows();
    console.log(`${dest} — ${items.length} produits`);
    const byCat = items.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1;
      return acc;
    }, {});
    for (const [cat, n] of Object.entries(byCat)) {
      console.log(`  ${cat.padEnd(16)} ${n}`);
    }
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    console.log(DRY ? "── SIMULATION (aucune écriture) ──\n" : "── ÉCRITURE ──\n");

    // 1. Noms illisibles
    for (const [broken, fixed] of MOJIBAKE) {
      const found = await prisma.product.findMany({
        where: { name: broken },
        select: { slug: true },
      });
      for (const p of found) {
        console.log(`  nom corrigé  ${p.slug.padEnd(30)} « ${broken} » → « ${fixed} »`);
        if (!DRY) {
          await prisma.product.update({ where: { slug: p.slug }, data: { name: fixed } });
        }
      }
    }

    // 2. Scories
    for (const slug of JUNK_SLUGS) {
      const p = await prisma.product.findUnique({
        where: { slug },
        select: { slug: true, name: true, stockRemaining: true },
      });
      if (!p) continue;
      console.log(`  supprimé     ${p.slug.padEnd(30)} « ${p.name} » (stock ${p.stockRemaining})`);
      if (!DRY) {
        await prisma.product.delete({ where: { slug } }).catch(() => null);
      }
    }

    // 3. Catalogue maison
    let created = 0;
    let updated = 0;

    for (const row of rows()) {
      const existing = await prisma.product.findUnique({
        where: { slug: row.slug },
        select: { slug: true, price: true },
      });

      const data = {
        name: row.name,
        description: row.description,
        price: row.price,
        category: row.category,
        imageUrl: row.imageUrl,
        keyword: row.keyword,
        // Catégories à stock non suivi : la valeur ne sert qu'à ne jamais bloquer.
        stockRemaining: 9999,
        stockMinimum: 0,
      };

      if (existing) {
        const changed = existing.price !== row.price;
        console.log(
          `  ${changed ? "prix ajusté " : "à jour      "} ${row.slug.padEnd(30)} ${row.price} F`,
        );
        if (!DRY) {
          await prisma.product.update({ where: { slug: row.slug }, data });
        }
        updated += 1;
      } else {
        console.log(`  créé         ${row.slug.padEnd(30)} ${row.price} F  [${row.category}]`);
        if (!DRY) {
          await prisma.product.create({
            data: { id: row.slug, slug: row.slug, ...data },
          });
        }
        created += 1;
      }
    }

    console.log(`\n${created} créé(s), ${updated} mis à jour.`);

    const total = await prisma.product.groupBy({
      by: ["category"],
      _count: true,
      orderBy: { _count: { category: "desc" } },
    });
    console.log("\nCatalogue par catégorie :");
    for (const t of total) {
      console.log(`  ${String(t.category).padEnd(16)} ${t._count}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
