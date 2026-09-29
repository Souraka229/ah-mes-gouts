#!/usr/bin/env node
/**
 * SEED DES OPTIONS & COMPLÉMENTS — ADDITIF UNIQUEMENT, PÉRIMÈTRE MINIMAL.
 *
 * ─── POURQUOI CE SCRIPT EST AUSSI PETIT ─────────────────────────────────────
 *
 * L'inventaire de la production (29/09/2026) a montré que le catalogue couvre
 * DÉJÀ, en produits, tout ce qu'un seed « complet » aurait recréé :
 *
 *   carte-cadeau                  variantes « message court » 1 000 / « message long » 1 500
 *   champagne-sans-alcool         variantes « pour enfant » 3 000 / « adulte » 10 000
 *   topper-happy-birthday-50f     produit à 50 F
 *
 * Ces fiches sont publiées et `carte-cadeau` apparaît dans 9 commandes. Créer en
 * plus des options aux mêmes prix aurait donné **une troisième façon d'acheter
 * la même chose**. Ce script ne sème donc QUE ce qui manque réellement :
 *
 *   1. les types de carte (occasions) — n'existaient nulle part ;
 *   2. un groupe « Votre message » porté par les fiches carte existantes, qui
 *      recueille le type de carte et le texte libre ;
 *   3. un groupe « Vin / Spiritueux » — le vin n'existait nulle part.
 *
 * Le groupe « Votre message » est à **0 F, volontairement** : le prix du message
 * court / long est déjà porté par les variantes de `carte-cadeau`. Le facturer
 * ici le compterait deux fois.
 *
 * ─── GARANTIES ──────────────────────────────────────────────────────────────
 *   - aucun `delete`, aucun `deleteMany`, aucun reseed, aucun TRUNCATE ;
 *   - aucun produit créé, aucun produit supprimé ;
 *   - **une seule exception** au « on ne touche pas aux produits » : la
 *     correction de prix du topper, demandée explicitement le 29/09/2026 et
 *     isolée plus bas dans CORRECTIONS_PRODUIT. Elle est gardée par un contrôle
 *     de valeur : rejouer le script ne la réapplique pas ;
 *   - **crée uniquement ce qui manque** : ce qui existe est laissé intact, ce
 *     qui permet de relancer le script après avoir modifié un prix au
 *     back-office sans perdre la modification ;
 *   - les rattachements produit ne sont qu'**ajoutés**.
 *
 * Usage :
 *   node scripts/seed-product-options.mjs --dry-run
 *   node scripts/seed-product-options.mjs
 */

import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");

/** Fiches carte qui reçoivent le groupe « Votre message ». */
const CARD_PRODUCT_SLUGS = ["carte-cadeau", "carte-message-personnalisee"];

const categoriesArg = process.argv.find((arg) => arg.startsWith("--categories="));

/**
 * Catégories qui reçoivent le groupe « Vin / Spiritueux ».
 *
 * Ce sont les créations de fête : un entremets, un nounours. Les bouquets de
 * roses en sont exclus — c'est le choix du fondateur, et le groupe s'ajoute ou
 * se retire produit par produit depuis le back-office.
 */
const CELEBRATION_CATEGORIES = categoriesArg
  ? categoriesArg.slice("--categories=".length).split(",").map((c) => c.trim()).filter(Boolean)
  : ["Entremets", "Menu du jour", "Nounours"];

/**
 * Correction de prix demandée sur un produit existant.
 *
 * Isolée et gardée par un contrôle de valeur : si le prix est déjà le bon, la
 * correction est ignorée. Rien d'autre sur la fiche n'est touché — ni le nom, ni
 * le slug (`topper-happy-birthday-50f`, conservé pour ne casser aucune adresse
 * web), ni l'image.
 */
const CORRECTIONS_PRODUIT = [
  { slug: "topper-happy-birthday-50f", from: 50, to: 500, raison: "Topper à 500 F" },
];

/**
 * Cartes / occasions — **système distinct des catégories de produits**.
 *
 * `parent` désigne le slug du parent : « Fête spéciale » est extensible, l'admin
 * y ajoute Noël, Saint-Valentin, Nouvel An, Ramadan… sans passer par le code.
 */
const MESSAGE_CATEGORIES = [
  { slug: "anniversaire", name: "Anniversaire", sortOrder: 0 },
  { slug: "amour", name: "Amour", sortOrder: 1 },
  { slug: "felicitations", name: "Félicitations", sortOrder: 2 },
  { slug: "occasion-speciale", name: "Occasion spéciale", allowsCustomText: true, sortOrder: 3 },
  { slug: "fete-des-peres", name: "Fête des Pères", sortOrder: 4 },
  { slug: "fete-des-meres", name: "Fête des Mères", sortOrder: 5 },
  { slug: "fete-speciale", name: "Fête spéciale", sortOrder: 6 },
  { slug: "autre", name: "Autre", allowsCustomText: true, sortOrder: 7 },

  // Sous-occasions de « Fête spéciale » — le back-office en ajoute d'autres.
  { slug: "noel", name: "Noël", parent: "fete-speciale", sortOrder: 0 },
  { slug: "saint-valentin", name: "Saint-Valentin", parent: "fete-speciale", sortOrder: 1 },
  { slug: "nouvel-an", name: "Nouvel An", parent: "fete-speciale", sortOrder: 2 },
];

const GROUPS = [
  {
    slug: "votre-message",
    name: "Votre message",
    description: "Le mot que nous écrirons à la main sur la carte.",
    selectionType: "single",
    minSelections: 0,
    maxSelections: 1,
    isRequired: false,
    sortOrder: 0,
    associateToSlugs: CARD_PRODUCT_SLUGS,
    options: [
      {
        slug: "carte-personnalisee",
        name: "Écrire un message sur la carte",
        description: "Choisissez le type de carte, puis écrivez votre mot.",
        /**
         * 0 F : le prix du message court / long est porté par les **variantes**
         * de la fiche carte (1 000 / 1 500 F). Le facturer aussi ici le
         * compterait deux fois.
         */
        price: 0,
        pricingType: "fixed",
        sortOrder: 0,
        maxQuantity: 1,
        messageMode: "required",
        messageMaxLength: 500,
        messagePlaceholder: "Joyeux anniversaire maman, je t'aime…",
        occasionMode: "required",
        allowCustomOccasion: true,
      },
    ],
  },
  {
    slug: "vin-spiritueux",
    /**
     * Libellé exact demandé — « Vin / Spiritueux ». Ni « Vin / Champagne », ni
     * « Vins & Spiritueux ». Repris tel quel dans le back-office et sur la fiche.
     */
    name: "Vin / Spiritueux",
    description: "Une bouteille à ajouter à votre création.",
    selectionType: "single",
    minSelections: 0,
    maxSelections: 1,
    isRequired: false,
    sortOrder: 1,
    /** Rattachement par catégorie, pas par slug : voir CELEBRATION_CATEGORIES. */
    associateToCategories: true,
    options: [
      {
        slug: "vin-rouge",
        name: "Vin rouge",
        description: "Bouteille de vin rouge.",
        price: 6000,
        sortOrder: 0,
      },
      {
        slug: "vin-blanc",
        name: "Vin blanc",
        description: "Bouteille de vin blanc.",
        price: 9000,
        sortOrder: 1,
      },
      /**
       * La famille court de 6 000 à 9 000 F. D'autres références peuvent être
       * créées depuis le back-office — avec leur nom, leur prix, leur image et
       * leur ordre — sans toucher à ce fichier.
       */
    ],
  },
];

const prisma = new PrismaClient();

function formatFcfa(value) {
  return `${value.toLocaleString("fr-FR")} F`;
}

/** Produits auxquels rattacher un groupe — par slug, ou par catégorie. */
async function resolveTargets(definition) {
  if (definition.associateToCategories) {
    return prisma.product.findMany({
      where: { category: { in: CELEBRATION_CATEGORIES } },
      select: { id: true, slug: true, name: true },
      orderBy: { slug: "asc" },
    });
  }
  return prisma.product.findMany({
    where: { slug: { in: definition.associateToSlugs ?? [] } },
    select: { id: true, slug: true, name: true },
    orderBy: { slug: "asc" },
  });
}

async function seedGroup(definition) {
  console.log(`\n── Groupe « ${definition.name} » (${definition.slug})`);

  const existingGroup = await prisma.optionGroup.findUnique({
    where: { slug: definition.slug },
    select: { id: true, options: { select: { slug: true } } },
  });

  console.log(
    existingGroup
      ? `   AVANT : présent — ${existingGroup.options.length} option(s)`
      : "   AVANT : absent",
  );

  if (DRY_RUN) {
    console.log(
      `   APRÈS : ${definition.options.length} option(s) — ` +
        definition.options
          .map((o) => `${o.slug}/${formatFcfa(o.price)}`)
          .join(", "),
    );
    const targets = await resolveTargets(definition);
    console.log(
      `   Rattachement à ${targets.length} produit(s) : ` +
        (targets.map((t) => t.slug).join(", ") || "aucun produit trouvé"),
    );
    return { created: definition.options.length, kept: 0, links: targets.length };
  }

  // Le groupe n'est créé que s'il manque. Sinon il est laissé tel quel : un nom
  // ou une borne modifiés au back-office ne doivent pas être réécrits ici.
  const groupRecord =
    existingGroup ??
    (await prisma.optionGroup.create({
      data: {
        slug: definition.slug,
        name: definition.name,
        description: definition.description,
        selectionType: definition.selectionType,
        minSelections: definition.minSelections,
        maxSelections: definition.maxSelections,
        isRequired: definition.isRequired,
        sortOrder: definition.sortOrder,
        isActive: true,
      },
      select: { id: true },
    }));

  const existingSlugs = new Set(
    (
      await prisma.option.findMany({
        where: { groupId: groupRecord.id },
        select: { slug: true },
      })
    ).map((option) => option.slug),
  );

  let created = 0;
  let kept = 0;

  for (const option of definition.options) {
    if (existingSlugs.has(option.slug)) {
      kept += 1;
      continue;
    }

    await prisma.option.create({
      data: {
        groupId: groupRecord.id,
        slug: option.slug,
        name: option.name,
        description: option.description ?? "",
        price: option.price,
        pricingType: option.pricingType ?? "fixed",
        unitLabel: option.unitLabel ?? null,
        subgroupLabel: option.subgroupLabel ?? null,
        // `imageUrl` volontairement absent : le champ reste vide, à remplir
        // depuis le back-office.
        sortOrder: option.sortOrder ?? 0,
        maxQuantity: option.maxQuantity ?? 1,
        messageMode: option.messageMode ?? "none",
        messageMaxLength: option.messageMaxLength ?? null,
        messagePlaceholder: option.messagePlaceholder ?? null,
        occasionMode: option.occasionMode ?? "none",
        allowCustomOccasion: option.allowCustomOccasion ?? false,
        isActive: true,
      },
    });
    created += 1;
  }

  console.log(
    `   APRÈS : ${created} créée(s), ${kept} déjà présente(s) et laissée(s) intacte(s)`,
  );

  // ─── Rattachement aux produits (ajout seulement) ──────────────────────────
  const products = await resolveTargets(definition);

  for (const [index, product] of products.entries()) {
    await prisma.productOptionGroup.upsert({
      where: {
        productId_groupId: { productId: product.id, groupId: groupRecord.id },
      },
      update: {},
      create: {
        productId: product.id,
        groupId: groupRecord.id,
        sortOrder: index,
      },
    });
  }

  console.log(
    `   Rattachement : ${products.map((p) => `${p.name} (${p.slug})`).join(", ") || "aucun"}`,
  );

  return { created, kept, links: products.length };
}

async function seedMessageCategories() {
  console.log("\n── Cartes / occasions");
  console.log(`   AVANT : ${await prisma.messageCategory.count()} catégorie(s)`);

  let created = 0;
  let kept = 0;
  const idBySlug = new Map();

  // Premier passage : les catégories de premier niveau, pour disposer des
  // identifiants avant de rattacher les sous-occasions.
  for (const category of MESSAGE_CATEGORIES.filter((item) => !item.parent)) {
    const existing = await prisma.messageCategory.findUnique({
      where: { slug: category.slug },
      select: { id: true },
    });

    if (existing) {
      kept += 1;
      idBySlug.set(category.slug, existing.id);
      continue;
    }
    if (DRY_RUN) {
      created += 1;
      continue;
    }

    const record = await prisma.messageCategory.create({
      data: {
        slug: category.slug,
        name: category.name,
        allowsCustomText: category.allowsCustomText ?? false,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      select: { id: true },
    });
    created += 1;
    idBySlug.set(category.slug, record.id);
  }

  // Second passage : les sous-occasions.
  for (const category of MESSAGE_CATEGORIES.filter((item) => item.parent)) {
    const existing = await prisma.messageCategory.findUnique({
      where: { slug: category.slug },
      select: { id: true },
    });

    if (existing) {
      kept += 1;
      continue;
    }
    if (DRY_RUN) {
      created += 1;
      continue;
    }

    const parentId = idBySlug.get(category.parent);
    if (!parentId) {
      console.warn(`   ⚠  ${category.slug} : parent « ${category.parent} » introuvable — ignoré.`);
      continue;
    }

    await prisma.messageCategory.create({
      data: {
        slug: category.slug,
        name: category.name,
        allowsCustomText: category.allowsCustomText ?? false,
        sortOrder: category.sortOrder,
        isActive: true,
        parentId,
      },
    });
    created += 1;
  }

  const total = DRY_RUN ? null : await prisma.messageCategory.count();
  console.log(
    `   APRÈS : ${created} créée(s), ${kept} déjà présente(s)` +
      (total === null ? "" : ` — total ${total}`),
  );

  return { created, kept };
}

/**
 * Corrections de prix demandées sur des produits existants.
 *
 * Garde de valeur : si la fiche ne porte plus le prix attendu, on **ne touche à
 * rien** et on le dit. Cela évite d'écraser une modification faite entre-temps
 * au back-office, et rend le script rejouable sans effet.
 */
async function applyProductCorrections() {
  console.log("\n── Corrections de prix demandées");

  for (const correction of CORRECTIONS_PRODUIT) {
    const product = await prisma.product.findUnique({
      where: { slug: correction.slug },
      select: { id: true, name: true, price: true },
    });

    if (!product) {
      console.log(`   ⚠  ${correction.slug} : fiche introuvable — ignorée.`);
      continue;
    }

    if (product.price === correction.to) {
      console.log(
        `   ${correction.slug} : déjà à ${formatFcfa(correction.to)} — inchangé.`,
      );
      continue;
    }

    if (product.price !== correction.from) {
      console.log(
        `   ⚠  ${correction.slug} : prix actuel ${formatFcfa(product.price)}, ` +
          `attendu ${formatFcfa(correction.from)} — NON modifié. ` +
          "Corrigez-le au back-office si nécessaire.",
      );
      continue;
    }

    console.log(
      `   ${product.name} : ${formatFcfa(product.price)} → ${formatFcfa(correction.to)} (${correction.raison})`,
    );

    if (DRY_RUN) continue;

    // Seul le prix est écrit : ni le nom, ni le slug, ni l'image.
    await prisma.product.update({
      where: { id: product.id },
      data: { price: correction.to },
    });
  }
}

async function main() {
  console.log(
    DRY_RUN
      ? "=== SEED OPTIONS (PÉRIMÈTRE MINIMAL) — SIMULATION ==="
      : "=== SEED OPTIONS (PÉRIMÈTRE MINIMAL) — ÉCRITURE ===",
  );
  console.log(
    "Rappel : le champagne et les suppléments ne sont PAS touchés — ils existent\n" +
      "déjà en produits. Seul le topper reçoit la correction de prix demandée.",
  );

  const before = {
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
    groups: await prisma.optionGroup.count(),
    options: await prisma.option.count(),
  };

  await applyProductCorrections();

  const results = [];
  for (const definition of GROUPS) {
    results.push(await seedGroup(definition));
  }
  const categories = await seedMessageCategories();

  const after = await prisma.product.count();
  const orderCount = await prisma.order.count();

  console.log("\n=== RÉCAPITULATIF ===");
  console.log(
    `Produits : ${before.products} → ${after}` +
      (before.products === after ? "  ✅ inchangés" : "  ⚠️  ÉCART INATTENDU"),
  );
  console.log(
    `Commandes : ${before.orders} → ${orderCount}` +
      (before.orders === orderCount ? "  ✅ inchangées" : "  ⚠️  ÉCART INATTENDU"),
  );
  console.log(`Groupes d'options : ${before.groups} → ${await prisma.optionGroup.count()}`);
  console.log(`Options : ${before.options} → ${await prisma.option.count()}`);
  console.log(`Cartes / occasions : ${categories.created} créée(s), ${categories.kept} intacte(s)`);
  for (const result of results) {
    console.log(
      `  · ${result.created} option(s) créée(s), ${result.kept} intacte(s), ${result.links} produit(s) rattaché(s)`,
    );
  }
  if (DRY_RUN) console.log("\nSimulation : rien n'a été écrit.");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("❌ Échec du seed :", error);
  await prisma.$disconnect();
  process.exit(1);
});
