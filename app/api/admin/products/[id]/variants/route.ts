import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import { findCatalogProduct } from "@/lib/server/admin-catalog-repository";
import {
  createVariant,
  getVariantsForProduct,
  reorderVariants,
  updateVariant,
} from "@/lib/server/variant-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const variantInputSchema = z.object({
  code: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  price: z.number().int().positive().max(10_000_000),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
  stockRemaining: z.number().int().min(0).max(100_000).nullable().optional(),
});

const createSchema = variantInputSchema;

const reorderSchema = z.object({ order: z.array(z.string()).min(1) });

/**
 * Application d'un modèle de variantes (ex. « Taille nounours 20 → 150 cm »).
 * Upsert par code : un palier déjà présent est mis à jour, jamais dupliqué.
 * Aucune suppression — un palier absent du modèle reste en place.
 */
const bulkSchema = z.object({
  variants: z.array(variantInputSchema).min(1).max(50),
  variantLabel: z.string().trim().max(40).optional(),
});

/** Résout la référence (id, slug ou nom) en produit réel du catalogue. */
async function resolveProduct(ref: string) {
  return findCatalogProduct(ref);
}

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;
  const product = await resolveProduct(id);
  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const variants = await getVariantsForProduct(product.id);
  return NextResponse.json({ variants });
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const product = await resolveProduct(id);
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const variant = await createVariant(product.id, parsed.data);
    void appendAdminActionLog({
      adminName: await getAdminDisplayNameAsync(),
      source: "manual",
      action: "variant_create",
      summary: `Variante ${variant.label} (${variant.price} F) — ${product.name}`,
      details: { productId: product.id, variantId: variant.id },
    });

    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Création impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const product = await resolveProduct(id);
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    await reorderVariants(product.id, parsed.data.order);
    const variants = await getVariantsForProduct(product.id);
    return NextResponse.json({ variants });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Réordonnancement impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Applique un modèle : upsert de chaque palier par code.
 * N'efface rien — un palier absent du modèle est conservé tel quel.
 */
export async function PUT(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const parsed = bulkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const product = await resolveProduct(id);
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const existing = await getVariantsForProduct(product.id);
    const byCode = new Map(existing.map((variant) => [variant.code, variant]));

    let created = 0;
    let updated = 0;

    for (const [index, entry] of parsed.data.variants.entries()) {
      const code = entry.code.trim().toLowerCase();
      const current = byCode.get(code);

      if (current) {
        await updateVariant(current.id, {
          label: entry.label,
          price: entry.price,
          sortOrder: entry.sortOrder ?? index,
          isActive: entry.isActive ?? current.isActive,
          stockRemaining: entry.stockRemaining ?? null,
        });
        updated += 1;
      } else {
        await createVariant(product.id, {
          ...entry,
          code,
          sortOrder: entry.sortOrder ?? index,
        });
        created += 1;
      }
    }

    void appendAdminActionLog({
      adminName: await getAdminDisplayNameAsync(),
      source: "manual",
      action: "variant_apply_template",
      summary: `Modèle de variantes appliqué — ${product.name} (${created} créée(s), ${updated} mise(s) à jour)`,
      details: { productId: product.id, created, updated },
    });

    const variants = await getVariantsForProduct(product.id);
    return NextResponse.json({ variants, created, updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Application impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
