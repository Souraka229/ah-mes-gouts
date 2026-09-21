import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import { findCatalogProduct } from "@/lib/server/admin-catalog-repository";
import {
  deactivateVariant,
  deleteVariantIfUnused,
  getVariantsForProduct,
  updateVariant,
} from "@/lib/server/variant-repository";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; variantId: string }>;
};

const patchSchema = z
  .object({
    label: z.string().trim().min(1).max(60).optional(),
    price: z.number().int().positive().max(10_000_000).optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
    isActive: z.boolean().optional(),
    stockRemaining: z.number().int().min(0).max(100_000).nullable().optional(),
    /** Raccourci : désactiver sans effacer. */
    deactivate: z.boolean().optional(),
  })
  .strict();

/**
 * Vérifie que la variante appartient bien au produit visé.
 * Empêche d'agir sur la variante d'un autre produit en forgeant l'URL.
 */
async function findOwnedVariant(productRef: string, variantId: string) {
  const product = await findCatalogProduct(productRef);
  if (!product) return { product: undefined, variant: undefined };

  const variants = await getVariantsForProduct(product.id);
  return {
    product,
    variant: variants.find((entry) => entry.id === variantId),
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id, variantId } = await context.params;

  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { product, variant } = await findOwnedVariant(id, variantId);
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }
    if (!variant) {
      return NextResponse.json({ error: "Variante introuvable" }, { status: 404 });
    }

    const body = parsed.data;

    if (body.deactivate) {
      const deactivated = await deactivateVariant(variant.id);
      void appendAdminActionLog({
        adminName: await getAdminDisplayNameAsync(),
        source: "manual",
        action: "variant_deactivate",
        summary: `Variante désactivée ${variant.label} — ${product.name}`,
        details: { productId: product.id, variantId: variant.id },
      });
      return NextResponse.json({ variant: deactivated });
    }

    const updated = await updateVariant(variant.id, {
      label: body.label,
      price: body.price,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      stockRemaining: body.stockRemaining,
    });

    void appendAdminActionLog({
      adminName: await getAdminDisplayNameAsync(),
      source: "manual",
      action: "variant_update",
      summary: `Variante ${updated.label} (${updated.price} F) — ${product.name}`,
      details: {
        productId: product.id,
        variantId: variant.id,
        label: body.label,
        price: body.price,
        isActive: body.isActive,
        stockRemaining: body.stockRemaining,
      },
    });

    return NextResponse.json({ variant: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Modification impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Suppression **définitive** — refusée si une commande référence la variante.
 * Dans ce cas on invite à la désactiver, ce qui préserve l'historique.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id, variantId } = await context.params;

  try {
    const { product, variant } = await findOwnedVariant(id, variantId);
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }
    if (!variant) {
      return NextResponse.json({ error: "Variante introuvable" }, { status: 404 });
    }

    const result = await deleteVariantIfUnused(variant.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 409 });
    }

    void appendAdminActionLog({
      adminName: await getAdminDisplayNameAsync(),
      source: "manual",
      action: "variant_delete",
      summary: `Variante supprimée ${variant.label} — ${product.name}`,
      details: { productId: product.id, variantId: variant.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suppression impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
