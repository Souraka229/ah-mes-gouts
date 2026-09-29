import { revalidateTag } from "next/cache";

import type {
  MessageCategoryRecord,
  OptionGroupRecord,
  OptionRecord,
  PricingType,
  ProductOptionGroupRecord,
  RequirementMode,
  SelectionType,
} from "@/lib/product-options/options";
import { getPrisma } from "@/lib/prisma";

/**
 * Options & compléments — accès base.
 *
 * Même contrat que `variant-repository.ts` : **source de vérité en base**, le
 * code ne fixe aucun prix, et une panne de base rend une carte vide plutôt que
 * de faire échouer la requête. C'est `priceOrderItems` qui décide ensuite de
 * refuser une ligne non résolue.
 */

const OPTION_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  price: true,
  pricingType: true,
  unitLabel: true,
  subgroupLabel: true,
  imageUrl: true,
  isActive: true,
  sortOrder: true,
  stockRemaining: true,
  maxQuantity: true,
  messageMode: true,
  messageMinLength: true,
  messageMaxLength: true,
  messagePlaceholder: true,
  occasionMode: true,
  allowCustomOccasion: true,
} as const;

const GROUP_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  selectionType: true,
  minSelections: true,
  maxSelections: true,
  isRequired: true,
  isActive: true,
  sortOrder: true,
} as const;

const MESSAGE_CATEGORY_SELECT = {
  id: true,
  slug: true,
  name: true,
  allowsCustomText: true,
  isActive: true,
  sortOrder: true,
  parentId: true,
} as const;

/**
 * Les colonnes sont des `TEXT` libres côté base (souplesse d'évolution) : on
 * ramène ici les seules valeurs que le code sait traiter. Une valeur inconnue
 * retombe sur le défaut le plus sûr — jamais sur un comportement facturant.
 */
function toPricingType(value: string): PricingType {
  return value === "per_unit" ? "per_unit" : "fixed";
}

function toSelectionType(value: string): SelectionType {
  return value === "multiple" ? "multiple" : "single";
}

function toRequirementMode(value: string): RequirementMode {
  return value === "required" || value === "optional" ? value : "none";
}

type RawOptionRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  pricingType: string;
  unitLabel: string | null;
  subgroupLabel: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  stockRemaining: number | null;
  maxQuantity: number;
  messageMode: string;
  messageMinLength: number | null;
  messageMaxLength: number | null;
  messagePlaceholder: string | null;
  occasionMode: string;
  allowCustomOccasion: boolean;
};

function toOptionRecord(row: RawOptionRow): OptionRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price,
    pricingType: toPricingType(row.pricingType),
    unitLabel: row.unitLabel,
    subgroupLabel: row.subgroupLabel,
    imageUrl: row.imageUrl,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    stockRemaining: row.stockRemaining,
    maxQuantity: row.maxQuantity,
    messageMode: toRequirementMode(row.messageMode),
    messageMinLength: row.messageMinLength,
    messageMaxLength: row.messageMaxLength,
    messagePlaceholder: row.messagePlaceholder,
    occasionMode: toRequirementMode(row.occasionMode),
    allowCustomOccasion: row.allowCustomOccasion,
  };
}

type RawGroupRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  selectionType: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  options: RawOptionRow[];
};

function toGroupRecord(row: RawGroupRow): OptionGroupRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    selectionType: toSelectionType(row.selectionType),
    minSelections: row.minSelections,
    maxSelections: row.maxSelections,
    isRequired: row.isRequired,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    options: row.options.map(toOptionRecord),
  };
}

/**
 * Groupes rattachés à chaque produit, en **une** requête pour tout le catalogue.
 * Le catalogue compte quelques dizaines de produits : sur-lire coûte moins cher
 * qu'une requête par fiche.
 */
async function readGroupsByProduct(
  productIds: string[],
  activeOnly: boolean,
): Promise<Map<string, ProductOptionGroupRecord[]>> {
  const byProduct = new Map<string, ProductOptionGroupRecord[]>();
  if (productIds.length === 0) return byProduct;

  try {
    const prisma = getPrisma();
    const rows = await prisma.productOptionGroup.findMany({
      where: {
        productId: { in: productIds },
        ...(activeOnly
          ? { group: { isActive: true, options: { some: { isActive: true } } } }
          : {}),
      },
      select: {
        productId: true,
        groupId: true,
        minSelections: true,
        maxSelections: true,
        sortOrder: true,
        group: {
          select: {
            ...GROUP_SELECT,
            options: {
              where: activeOnly ? { isActive: true } : {},
              select: OPTION_SELECT,
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }],
    });

    for (const row of rows) {
      // Un groupe sans option active ne doit pas s'afficher : il produirait un
      // bloc vide, ou une obligation impossible à satisfaire.
      if (row.group.options.length === 0) continue;

      const list = byProduct.get(row.productId) ?? [];
      list.push({
        productId: row.productId,
        groupId: row.groupId,
        minSelections: row.minSelections,
        maxSelections: row.maxSelections,
        sortOrder: row.sortOrder,
        group: toGroupRecord(row.group),
      });
      byProduct.set(row.productId, list);
    }
  } catch {
    // Base injoignable : carte vide. L'appelant refusera la ligne concernée.
  }

  return byProduct;
}

/** Groupes actifs — usage boutique et facturation. */
export function getActiveOptionGroupsByProductIds(
  productIds: string[],
): Promise<Map<string, ProductOptionGroupRecord[]>> {
  return readGroupsByProduct(productIds, true);
}

/** Tous les groupes, y compris désactivés — usage back-office. */
export function getOptionGroupsByProductIds(
  productIds: string[],
): Promise<Map<string, ProductOptionGroupRecord[]>> {
  return readGroupsByProduct(productIds, false);
}

export async function getActiveOptionGroupsForProduct(
  productId: string,
): Promise<ProductOptionGroupRecord[]> {
  const map = await getActiveOptionGroupsByProductIds([productId]);
  return map.get(productId) ?? [];
}

/** Catalogue complet des groupes, options incluses — back-office. */
export async function getAllOptionGroups(): Promise<OptionGroupRecord[]> {
  try {
    const prisma = getPrisma();
    const rows = await prisma.optionGroup.findMany({
      select: {
        ...GROUP_SELECT,
        options: {
          select: OPTION_SELECT,
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(toGroupRecord);
  } catch {
    return [];
  }
}

export async function getMessageCategories(
  activeOnly = true,
): Promise<MessageCategoryRecord[]> {
  try {
    const prisma = getPrisma();
    return await prisma.messageCategory.findMany({
      where: activeOnly ? { isActive: true } : {},
      select: MESSAGE_CATEGORY_SELECT,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  } catch {
    return [];
  }
}

// ─── Écritures back-office ──────────────────────────────────────────────────

function invalidateOptions(): void {
  revalidateTag("options");
}

export type OptionGroupInput = {
  slug: string;
  name: string;
  description?: string;
  selectionType?: SelectionType;
  minSelections?: number;
  maxSelections?: number;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function createOptionGroup(
  input: OptionGroupInput,
): Promise<OptionGroupRecord> {
  const prisma = getPrisma();
  const slug = normalizeSlug(input.slug);
  if (!slug) throw new Error("Identifiant de groupe requis.");
  if (!input.name.trim()) throw new Error("Nom de groupe requis.");

  const created = await prisma.optionGroup.create({
    data: {
      slug,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      selectionType: input.selectionType ?? "single",
      minSelections: input.minSelections ?? 0,
      maxSelections: input.maxSelections ?? 1,
      isRequired: input.isRequired ?? false,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    select: { ...GROUP_SELECT, options: { select: OPTION_SELECT } },
  });

  invalidateOptions();
  return toGroupRecord(created);
}

export type OptionGroupPatch = Partial<Omit<OptionGroupInput, "slug">>;

export async function updateOptionGroup(
  groupId: string,
  patch: OptionGroupPatch,
): Promise<void> {
  const prisma = getPrisma();
  const data: Record<string, unknown> = {};

  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw new Error("Nom de groupe requis.");
    data.name = patch.name.trim();
  }
  if (patch.description !== undefined) data.description = patch.description.trim();
  if (patch.selectionType !== undefined) data.selectionType = patch.selectionType;
  if (patch.minSelections !== undefined) data.minSelections = patch.minSelections;
  if (patch.maxSelections !== undefined) data.maxSelections = patch.maxSelections;
  if (patch.isRequired !== undefined) data.isRequired = patch.isRequired;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.sortOrder !== undefined) data.sortOrder = patch.sortOrder;

  if (Object.keys(data).length === 0) throw new Error("Aucune modification fournie.");

  await prisma.optionGroup.update({ where: { id: groupId }, data });
  invalidateOptions();
}

export type OptionInput = {
  groupId: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  pricingType?: PricingType;
  unitLabel?: string | null;
  subgroupLabel?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  stockRemaining?: number | null;
  maxQuantity?: number;
  messageMode?: RequirementMode;
  messageMinLength?: number | null;
  messageMaxLength?: number | null;
  messagePlaceholder?: string | null;
  occasionMode?: RequirementMode;
  allowCustomOccasion?: boolean;
};

function assertPrice(price: number): number {
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Prix d'option invalide.");
  }
  return Math.round(price);
}

export async function createOption(input: OptionInput): Promise<OptionRecord> {
  const prisma = getPrisma();
  const slug = normalizeSlug(input.slug);
  if (!slug) throw new Error("Identifiant d'option requis.");
  if (!input.name.trim()) throw new Error("Nom d'option requis.");

  const created = await prisma.option.create({
    data: {
      groupId: input.groupId,
      slug,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      price: assertPrice(input.price),
      pricingType: input.pricingType ?? "fixed",
      unitLabel: input.unitLabel ?? null,
      subgroupLabel: input.subgroupLabel ?? null,
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      stockRemaining: input.stockRemaining ?? null,
      maxQuantity: input.maxQuantity ?? 1,
      messageMode: input.messageMode ?? "none",
      messageMinLength: input.messageMinLength ?? null,
      messageMaxLength: input.messageMaxLength ?? null,
      messagePlaceholder: input.messagePlaceholder ?? null,
      occasionMode: input.occasionMode ?? "none",
      allowCustomOccasion: input.allowCustomOccasion ?? false,
    },
    select: OPTION_SELECT,
  });

  invalidateOptions();
  return toOptionRecord(created);
}

export type OptionPatch = Partial<Omit<OptionInput, "groupId" | "slug">>;

export async function updateOption(
  optionId: string,
  patch: OptionPatch,
): Promise<OptionRecord> {
  const prisma = getPrisma();
  const data: Record<string, unknown> = {};

  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw new Error("Nom d'option requis.");
    data.name = patch.name.trim();
  }
  if (patch.description !== undefined) data.description = patch.description.trim();
  if (patch.price !== undefined) data.price = assertPrice(patch.price);
  if (patch.pricingType !== undefined) data.pricingType = patch.pricingType;
  if (patch.unitLabel !== undefined) data.unitLabel = patch.unitLabel;
  if (patch.subgroupLabel !== undefined) data.subgroupLabel = patch.subgroupLabel;
  if (patch.imageUrl !== undefined) data.imageUrl = patch.imageUrl;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.sortOrder !== undefined) data.sortOrder = patch.sortOrder;
  if (patch.stockRemaining !== undefined) data.stockRemaining = patch.stockRemaining;
  if (patch.maxQuantity !== undefined) data.maxQuantity = patch.maxQuantity;
  if (patch.messageMode !== undefined) data.messageMode = patch.messageMode;
  if (patch.messageMinLength !== undefined) data.messageMinLength = patch.messageMinLength;
  if (patch.messageMaxLength !== undefined) data.messageMaxLength = patch.messageMaxLength;
  if (patch.messagePlaceholder !== undefined) {
    data.messagePlaceholder = patch.messagePlaceholder;
  }
  if (patch.occasionMode !== undefined) data.occasionMode = patch.occasionMode;
  if (patch.allowCustomOccasion !== undefined) {
    data.allowCustomOccasion = patch.allowCustomOccasion;
  }

  if (Object.keys(data).length === 0) throw new Error("Aucune modification fournie.");

  const updated = await prisma.option.update({
    where: { id: optionId },
    data,
    select: OPTION_SELECT,
  });

  invalidateOptions();
  return toOptionRecord(updated);
}

/**
 * Désactive une option : elle disparaît du site et le checkout la refuse, mais
 * **rien n'est effacé** — l'historique des commandes reste intact.
 */
export async function deactivateOption(optionId: string): Promise<void> {
  await updateOption(optionId, { isActive: false });
}

export async function deactivateOptionGroup(groupId: string): Promise<void> {
  await updateOptionGroup(groupId, { isActive: false });
}

export type ProductGroupLink = {
  groupId: string;
  minSelections?: number | null;
  maxSelections?: number | null;
  sortOrder?: number;
};

/**
 * Remplace les groupes rattachés à un produit.
 *
 * On ne supprime que les **rattachements** (lignes de jointure) — jamais les
 * groupes ni les options, qui peuvent servir à d'autres produits.
 */
export async function setProductOptionGroups(
  productId: string,
  links: ProductGroupLink[],
): Promise<void> {
  const prisma = getPrisma();

  await prisma.$transaction([
    prisma.productOptionGroup.deleteMany({
      where: {
        productId,
        groupId: { notIn: links.map((link) => link.groupId) },
      },
    }),
    ...links.map((link, index) =>
      prisma.productOptionGroup.upsert({
        where: {
          productId_groupId: { productId, groupId: link.groupId },
        },
        create: {
          productId,
          groupId: link.groupId,
          minSelections: link.minSelections ?? null,
          maxSelections: link.maxSelections ?? null,
          sortOrder: link.sortOrder ?? index,
        },
        update: {
          minSelections: link.minSelections ?? null,
          maxSelections: link.maxSelections ?? null,
          sortOrder: link.sortOrder ?? index,
        },
      }),
    ),
  ]);

  invalidateOptions();
}

// ─── Catégories de messages ─────────────────────────────────────────────────

export type MessageCategoryInput = {
  slug: string;
  name: string;
  allowsCustomText?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  /** Renseigné pour une sous-occasion (« Noël » sous « Fête spéciale »). */
  parentId?: string | null;
};

export type DeleteResult = { ok: true } | { ok: false; reason: string };

/**
 * Suppression **définitive**, autorisée seulement si aucune commande n'y fait
 * référence. Sinon on refuse avec un message clair et on invite à désactiver.
 *
 * C'est la règle posée pour les variantes, reprise telle quelle : une commande
 * passée ne doit jamais perdre la trace de ce qui a été vendu.
 */
export async function deleteOptionIfUnused(
  optionId: string,
): Promise<DeleteResult> {
  const prisma = getPrisma();

  const referenced = await prisma.orderItemOption.count({
    where: { optionId },
  });

  if (referenced > 0) {
    return {
      ok: false,
      reason:
        `Cette option apparaît dans ${referenced} ligne${referenced > 1 ? "s" : ""} de commande. ` +
        "Désactivez-la plutôt : elle disparaîtra du site sans toucher à l'historique.",
    };
  }

  await prisma.option.delete({ where: { id: optionId } });
  invalidateOptions();
  return { ok: true };
}

export async function deleteOptionGroupIfUnused(
  groupId: string,
): Promise<DeleteResult> {
  const prisma = getPrisma();

  const options = await prisma.option.findMany({
    where: { groupId },
    select: { id: true },
  });

  const referenced = await prisma.orderItemOption.count({
    where: { optionId: { in: options.map((option) => option.id) } },
  });

  if (referenced > 0) {
    return {
      ok: false,
      reason:
        `Ce groupe apparaît dans ${referenced} ligne${referenced > 1 ? "s" : ""} de commande. ` +
        "Désactivez-le plutôt : il disparaîtra du site sans toucher à l'historique.",
    };
  }

  await prisma.optionGroup.delete({ where: { id: groupId } });
  invalidateOptions();
  return { ok: true };
}

/**
 * Une catégorie de message n'est jamais référencée par identifiant dans les
 * commandes — seul son **libellé** est figé. On peut donc la supprimer dès
 * qu'aucune option ne l'utilise plus, sans risquer de trouer un historique.
 */
export async function deleteMessageCategoryIfUnused(
  categoryId: string,
): Promise<DeleteResult> {
  const prisma = getPrisma();

  const children = await prisma.messageCategory.count({
    where: { parentId: categoryId },
  });

  if (children > 0) {
    return {
      ok: false,
      reason:
        `Cette catégorie contient ${children} sous-occasion${children > 1 ? "s" : ""}. ` +
        "Supprimez-les d'abord, ou désactivez la catégorie.",
    };
  }

  await prisma.messageCategory.delete({ where: { id: categoryId } });
  invalidateOptions();
  return { ok: true };
}

export async function createMessageCategory(
  input: MessageCategoryInput,
): Promise<MessageCategoryRecord> {
  const prisma = getPrisma();
  const slug = normalizeSlug(input.slug);
  if (!slug) throw new Error("Identifiant de catégorie requis.");
  if (!input.name.trim()) throw new Error("Nom de catégorie requis.");

  const created = await prisma.messageCategory.create({
    data: {
      slug,
      name: input.name.trim(),
      allowsCustomText: input.allowsCustomText ?? false,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      parentId: input.parentId ?? null,
    },
    select: MESSAGE_CATEGORY_SELECT,
  });

  invalidateOptions();
  return created;
}

export async function updateMessageCategory(
  categoryId: string,
  patch: Partial<Omit<MessageCategoryInput, "slug">>,
): Promise<void> {
  const prisma = getPrisma();
  const data: Record<string, unknown> = {};

  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw new Error("Nom de catégorie requis.");
    data.name = patch.name.trim();
  }
  if (patch.allowsCustomText !== undefined) data.allowsCustomText = patch.allowsCustomText;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.sortOrder !== undefined) data.sortOrder = patch.sortOrder;
  if (patch.parentId !== undefined) data.parentId = patch.parentId;

  if (Object.keys(data).length === 0) throw new Error("Aucune modification fournie.");

  await prisma.messageCategory.update({ where: { id: categoryId }, data });
  invalidateOptions();
}
