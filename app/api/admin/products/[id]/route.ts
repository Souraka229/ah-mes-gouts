import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  findCatalogProduct,
  updateCatalogProduct,
  updateCatalogStock,
  type CatalogProductPatch,
} from "@/lib/server/admin-catalog-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as CatalogProductPatch & {
      stockRemaining?: number;
      toggleAvailable?: boolean;
    };

    if (body.toggleAvailable) {
      const product = await findCatalogProduct(id);
      if (!product) {
        return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
      }
      const nextStock = product.stockRemaining > 0 ? 0 : 10;
      const updated = await updateCatalogStock(id, nextStock);
      return NextResponse.json({ product: updated });
    }

    if (body.stockRemaining !== undefined) {
      const updated = await updateCatalogStock(id, body.stockRemaining);
      return NextResponse.json({ product: updated });
    }

    const patch: CatalogProductPatch = {};
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.price !== undefined) patch.price = Math.round(body.price);
    if (body.description !== undefined) patch.description = body.description;
    if (body.category !== undefined) patch.category = body.category;
    if (body.keyword !== undefined) patch.keyword = body.keyword.trim() || undefined;
    if (body.stockMinimum !== undefined) patch.stockMinimum = body.stockMinimum;
    if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl;
    if (body.imageUrls !== undefined) patch.imageUrls = body.imageUrls;
    if (body.isPromotion !== undefined) patch.isPromotion = body.isPromotion;
    if (body.promotionPrice !== undefined) {
      patch.promotionPrice =
        body.promotionPrice === null ? undefined : Math.round(body.promotionPrice);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    const updated = await updateCatalogProduct(id, patch);
    return NextResponse.json({ product: updated });
  } catch {
    return NextResponse.json({ error: "Modification impossible" }, { status: 400 });
  }
}
