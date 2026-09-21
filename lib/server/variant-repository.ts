import { getPrisma } from "@/lib/prisma";

/**
 * Variantes produit — tailles de nounours, formats de bouquet, nombre de
 * personnes d'un entremets.
 *
 * Source de vérité **en base**. Le code ne fixe plus aucun prix de variante :
 * il lit, il valide, il facture. Une panne de base renvoie une carte vide
 * plutôt que de faire échouer la requête — c'est `priceOrderItems` qui décide
 * ensuite de refuser une ligne non résolue.
 */
export type VariantRecord = {
  id: string;
  productId: string;
  /** Identifiant envoyé par le client : "150", "petit", "6". */
  code: string;
  /** Libellé affiché : "150 cm", "Petit", "6 personnes". */
  label: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
  /** `null` = le stock est porté par le produit, pas par la variante. */
  stockRemaining: number | null;
};

const VARIANT_SELECT = {
  id: true,
  productId: true,
  code: true,
  label: true,
  price: true,
  sortOrder: true,
  isActive: true,
  stockRemaining: true,
} as const;

function sortVariants(variants: VariantRecord[]): VariantRecord[] {
  return [...variants].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );
}

async function readVariants(
  productIds: string[],
  activeOnly: boolean,
): Promise<Map<string, VariantRecord[]>> {
  const byProduct = new Map<string, VariantRecord[]>();
  if (productIds.length === 0) return byProduct;

  try {
    const prisma = getPrisma();
    const rows = await prisma.productVariant.findMany({
      where: {
        productId: { in: productIds },
        ...(activeOnly ? { isActive: true } : {}),
      },
      select: VARIANT_SELECT,
    });

    for (const row of rows) {
      const list = byProduct.get(row.productId) ?? [];
      list.push(row);
      byProduct.set(row.productId, list);
    }
    for (const [productId, list] of byProduct) {
      byProduct.set(productId, sortVariants(list));
    }
  } catch {
    // Base injoignable : carte vide. L'appelant refuse la ligne concernée.
  }

  return byProduct;
}

/** Toutes les variantes, actives ou non — usage back-office. */
export function getVariantsByProductIds(
  productIds: string[],
): Promise<Map<string, VariantRecord[]>> {
  return readVariants(productIds, false);
}

/** Variantes actives uniquement — usage boutique et facturation. */
export function getActiveVariantsByProductIds(
  productIds: string[],
): Promise<Map<string, VariantRecord[]>> {
  return readVariants(productIds, true);
}

export async function getVariantsForProduct(
  productId: string,
): Promise<VariantRecord[]> {
  const map = await getVariantsByProductIds([productId]);
  return map.get(productId) ?? [];
}

export async function getActiveVariantsForProduct(
  productId: string,
): Promise<VariantRecord[]> {
  const map = await getActiveVariantsByProductIds([productId]);
  return map.get(productId) ?? [];
}

/** Résout une variante par le code envoyé par le client. */
export function findVariantByCode(
  variants: VariantRecord[],
  code: string,
): VariantRecord | undefined {
  return variants.find((variant) => variant.code === code);
}

export type VariantInput = {
  code: string;
  label: string;
  price: number;
  sortOrder?: number;
  isActive?: boolean;
  stockRemaining?: number | null;
};

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

export async function createVariant(
  productId: string,
  input: VariantInput,
): Promise<VariantRecord> {
  const prisma = getPrisma();
  const code = normalizeCode(input.code);
  if (!code) throw new Error("Code de variante requis.");
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error("Prix de variante invalide.");
  }

  const existing = await prisma.productVariant.findUnique({
    where: { productId_code: { productId, code } },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`La variante « ${code} » existe déjà pour ce produit.`);
  }

  return prisma.productVariant.create({
    data: {
      productId,
      code,
      label: input.label.trim() || code,
      price: Math.round(input.price),
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      stockRemaining: input.stockRemaining ?? null,
    },
    select: VARIANT_SELECT,
  });
}

export type VariantPatch = Partial<
  Pick<VariantInput, "label" | "price" | "sortOrder" | "isActive" | "stockRemaining">
>;

export async function updateVariant(
  variantId: string,
  patch: VariantPatch,
): Promise<VariantRecord> {
  const prisma = getPrisma();
  const data: Record<string, unknown> = {};

  if (patch.label !== undefined) data.label = patch.label.trim();
  if (patch.price !== undefined) {
    if (!Number.isFinite(patch.price) || patch.price <= 0) {
      throw new Error("Prix de variante invalide.");
    }
    data.price = Math.round(patch.price);
  }
  if (patch.sortOrder !== undefined) data.sortOrder = patch.sortOrder;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.stockRemaining !== undefined) {
    data.stockRemaining = patch.stockRemaining;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Aucune modification fournie.");
  }

  return prisma.productVariant.update({
    where: { id: variantId },
    data,
    select: VARIANT_SELECT,
  });
}

/**
 * Désactive une variante : elle disparaît du site et le checkout la refuse,
 * mais **rien n'est effacé** — la base et les commandes passées restent intactes.
 * C'est l'action par défaut du back-office.
 */
export async function deactivateVariant(
  variantId: string,
): Promise<VariantRecord> {
  return updateVariant(variantId, { isActive: false });
}

export type DeleteVariantResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Suppression **définitive**, autorisée seulement si aucune commande n'y fait
 * référence. Sinon on refuse avec un message clair et on invite à désactiver :
 * une commande passée ne doit jamais perdre la trace de ce qui a été vendu.
 */
export async function deleteVariantIfUnused(
  variantId: string,
): Promise<DeleteVariantResult> {
  const prisma = getPrisma();

  const referenced = await prisma.orderItem.count({
    where: { variantId },
  });

  if (referenced > 0) {
    return {
      ok: false,
      reason:
        `Cette variante apparaît dans ${referenced} commande${referenced > 1 ? "s" : ""}. ` +
        "Désactivez-la plutôt : elle disparaîtra du site sans toucher à l'historique.",
    };
  }

  await prisma.productVariant.delete({ where: { id: variantId } });
  return { ok: true };
}

/** Réordonnancement — l'ordre reçu fait foi, les absents gardent leur place. */
export async function reorderVariants(
  productId: string,
  orderedIds: string[],
): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.productVariant.updateMany({
        where: { id, productId },
        data: { sortOrder: index },
      }),
    ),
  );
}
