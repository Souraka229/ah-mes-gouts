#!/usr/bin/env node
/**
 * QA PRODUCTION — LECTURE SEULE.
 *
 * Interroge la vraie base Supabase et décrit le catalogue réel : produits,
 * catégories, menu du jour, images. N'écrit RIEN en base : uniquement des
 * `findMany` / `count`.
 *
 * Usage : node scripts/qa-prod-readonly.mjs
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

// .env.production.local d'abord : c'est la cible de production. On ne bascule
// pas sur .env.local, qui pointe vers le Docker local éteint.
for (const file of [".env.production.local", ".env"]) {
  const path = join(ROOT, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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

// On garde le pooler (6543) : le direct (5432) accepte le TCP mais le
// handshake Postgres échoue depuis ce poste (protocole filtré).
const prisma = new PrismaClient();

function host() {
  try {
    return new URL(process.env.DATABASE_URL).hostname;
  } catch {
    return "(inconnu)";
  }
}

function hasLocalFile(url) {
  if (!url || /^https?:\/\//.test(url)) return null; // distant : non vérifiable ici
  return existsSync(join(ROOT, "public", url.replace(/^\//, "")));
}

async function main() {
  console.log("\n==================================================");
  console.log(" QA PRODUCTION — LECTURE SEULE");
  console.log("==================================================");
  console.log(`Base       : ${host()}`);
  console.log(`Site       : ${process.env.NEXT_PUBLIC_SITE_URL ?? "(non défini)"}`);

  const [productCount, menuCount, orderCount] = await Promise.all([
    prisma.product.count(),
    prisma.menu.count(),
    prisma.order.count(),
  ]);

  console.log(`\nProduct    : ${productCount}`);
  console.log(`Menu       : ${menuCount}`);
  console.log(`Order      : ${orderCount}`);

  // ---- PRODUITS -----------------------------------------------------------
  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { price: "asc" }],
  });

  console.log("\n--- PRODUITS RÉELS PAR CATÉGORIE ---");
  const byCategory = new Map();
  for (const p of products) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }
  for (const [category, list] of [...byCategory].sort((a, b) =>
    a[0].localeCompare(b[0], "fr"),
  )) {
    console.log(`\n[${category}]  ${list.length} produit(s)`);
    for (const p of list) {
      const flags = [
        p.isMenuDuJour ? "MENU" : null,
        p.isPromotion ? `PROMO→${p.promotionPrice ?? "?"}` : null,
        p.isGiftCard ? "CARTE" : null,
        p.stockRemaining <= 0 ? "STOCK 0" : null,
      ]
        .filter(Boolean)
        .join(" ");
      console.log(
        `  ${p.slug.padEnd(30)} ${String(p.price).padStart(7)} F  ${p.name}${flags ? `  « ${flags} »` : ""}`,
      );
    }
  }

  // ---- IMAGES -------------------------------------------------------------
  console.log("\n--- IMAGES ---");
  const noImage = products.filter((p) => !p.imageUrl?.trim());
  const localMissing = [];
  for (const p of products) {
    const primary = hasLocalFile(p.imageUrl);
    if (primary === false) localMissing.push({ slug: p.slug, url: p.imageUrl });
    for (const extra of p.imageUrls ?? []) {
      if (hasLocalFile(extra) === false) {
        localMissing.push({ slug: p.slug, url: extra });
      }
    }
  }

  console.log(`Sans image (imageUrl vide) : ${noImage.length}`);
  for (const p of noImage) console.log(`  ⚠ ${p.slug}  « ${p.name} »`);

  console.log(`Chemins locaux introuvables (404) : ${localMissing.length}`);
  for (const item of localMissing) console.log(`  ⚠ ${item.slug} → ${item.url}`);

  // Une même image partagée par plusieurs produits = signal d'attribution
  // douteuse (photo d'un produit servie pour un autre).
  const imageToSlugs = new Map();
  for (const p of products) {
    for (const url of p.imageUrls?.length ? p.imageUrls : [p.imageUrl]) {
      if (!url) continue;
      const list = imageToSlugs.get(url) ?? [];
      list.push(p.slug);
      imageToSlugs.set(url, list);
    }
  }
  const shared = [...imageToSlugs].filter(([, slugs]) => slugs.length > 1);
  console.log(`Images partagées par plusieurs produits : ${shared.length}`);
  for (const [url, slugs] of shared) {
    console.log(`  ⚠ ${url}\n      → ${slugs.join(", ")}`);
  }

  // ---- DOUBLONS -----------------------------------------------------------
  console.log("\n--- DOUBLONS ---");
  const byName = new Map();
  for (const p of products) {
    const key = p.name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), p.slug]);
  }
  const dupNames = [...byName].filter(([, slugs]) => slugs.length > 1);
  console.log(`Noms identiques : ${dupNames.length}`);
  for (const [name, slugs] of dupNames) console.log(`  ⚠ « ${name} » → ${slugs.join(", ")}`);

  // ---- MENU DU JOUR -------------------------------------------------------
  console.log("\n--- MENU DU JOUR : CONTENU DÉTAILLÉ ---");
  const menus = await prisma.menu.findMany({ orderBy: { date: "desc" } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const now = Date.now();
  for (const menu of menus) {
    const resolved = menu.productIds.map(
      (id) => byId.get(id) ?? bySlug.get(id) ?? null,
    );
    const broken = menu.productIds.filter((id, i) => !resolved[i]);

    console.log(`\n  ─────────────────────────────────────────────`);
    console.log(`  id          : ${menu.id}`);
    console.log(`  date        : ${new Date(menu.date).toISOString()}`);
    console.log(`  activateAt  : ${new Date(menu.activateAt).toISOString()}`);
    console.log(`  status      : ${menu.status}`);
    console.log(`  createdAt   : ${new Date(menu.createdAt).toISOString()}`);
    console.log(
      `  date passée : ${new Date(menu.date).getTime() < now ? "OUI" : "non"}`,
    );
    console.log(`  produits    : ${menu.productIds.length}`);

    const pairs = menu.productIds
      .map((id, i) => ({
        id,
        order: menu.displayOrder[i] ?? i,
        targetStock: menu.dailyStock[i] ?? 0,
        product: byId.get(id) ?? bySlug.get(id) ?? null,
      }))
      .sort((a, b) => a.order - b.order);

    for (const { id, order, targetStock, product } of pairs) {
      if (product) {
        console.log(
          `      #${String(order).padStart(2)} ${product.slug.padEnd(26)} ` +
            `prix ${String(product.price).padStart(6)} F  ` +
            `stock jour ${String(targetStock).padStart(4)}  ` +
            `stock actuel ${String(product.stockRemaining).padStart(4)}`,
        );
      } else {
        console.log(`      #${String(order).padStart(2)} ⚠ id NON RÉSOLU : ${id}`);
      }
    }
    if (broken.length) console.log(`      ⚠ ${broken.length} id(s) non résolu(s)`);
  }

  const active = menus.find((m) => m.status === "ACTIVE");
  const scheduled = menus.filter((m) => m.status === "SCHEDULED");
  console.log(
    `\n  RÉSUMÉ : ACTIVE=${active ? 1 : 0}  SCHEDULED=${scheduled.length}  ` +
      `EXPIRED=${menus.filter((m) => m.status === "EXPIRED").length}`,
  );

  // ---- INTÉGRITÉ COMMANDES (lecture seule) --------------------------------
  console.log("\n--- INTÉGRITÉ COMMANDES ---");
  const items = await prisma.orderItem.findMany({
    select: { slug: true, name: true, unitPrice: true },
  });
  const orphans = items.filter((i) => !i.slug || (!bySlug.has(i.slug) && !byId.has(i.slug)));
  console.log(`OrderItem : ${items.length}`);
  console.log(`OrderItem sans produit catalogue correspondant : ${orphans.length}`);
  for (const o of orphans.slice(0, 15)) {
    console.log(`  • slug=${o.slug ?? "(null)"}  ${o.name}  ${o.unitPrice} F`);
  }

  console.log("\n==================================================\n");
}

main()
  .catch((error) => {
    console.error("\nERREUR :", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
