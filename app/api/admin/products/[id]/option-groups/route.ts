import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import { findCatalogProduct } from "@/lib/server/admin-catalog-repository";
import {
  getOptionGroupsByProductIds,
  setProductOptionGroups,
} from "@/lib/server/option-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Groupes d'options proposés sur **ce** produit.
 *
 * Sans ce réglage, un bouquet de roses se verrait proposer du champagne : les
 * options ne sont pas globales, elles se rattachent produit par produit.
 *
 * Les bornes (`minSelections` / `maxSelections`) se surchargent ici, produit par
 * produit, sans dupliquer le groupe.
 */
const putSchema = z.object({
  links: z
    .array(
      z.object({
        groupId: z.string().trim().min(1).max(60),
        minSelections: z.number().int().min(0).max(50).nullable().optional(),
        maxSelections: z.number().int().min(0).max(50).nullable().optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
      }),
    )
    .max(50),
});

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;
  const product = await findCatalogProduct(id);
  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const map = await getOptionGroupsByProductIds([product.id]);
  return NextResponse.json({ links: map.get(product.id) ?? [] });
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const parsed = putSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const product = await findCatalogProduct(id);
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    await setProductOptionGroups(product.id, parsed.data.links);

    void appendAdminActionLog({
      adminName: await getAdminDisplayNameAsync(),
      source: "manual",
      action: "product_option_groups_set",
      summary:
        `Options du produit « ${product.name} » : ` +
        `${parsed.data.links.length} groupe(s)`,
      details: { productId: product.id, groupIds: parsed.data.links.map((l) => l.groupId) },
    });

    const map = await getOptionGroupsByProductIds([product.id]);
    return NextResponse.json({ links: map.get(product.id) ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enregistrement impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
