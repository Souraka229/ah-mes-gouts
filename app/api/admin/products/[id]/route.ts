import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import {
  findCatalogProduct,
  updateCatalogProduct,
  updateCatalogStock,
  type CatalogProductPatch,
} from "@/lib/server/admin-catalog-repository";
import { notifyTelegramSafe } from "@/lib/notifications/telegram";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    price: z.number().int().positive().max(10_000_000).optional(),
    description: z.string().max(2000).optional(),
    category: z.string().trim().max(80).optional(),
    keyword: z.string().max(80).optional(),
    stockMinimum: z.number().int().min(0).max(10_000).optional(),
    imageUrl: z.string().max(500).optional(),
    imageUrls: z.array(z.string().max(500)).max(12).optional(),
    isPromotion: z.boolean().optional(),
    promotionPrice: z.number().int().positive().nullable().optional(),
    stockRemaining: z.number().int().min(0).max(100_000).optional(),
    toggleAvailable: z.boolean().optional(),
  })
  .strict();

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;
  const adminName = await getAdminDisplayNameAsync();

  try {
    const json: unknown = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const body = parsed.data;

    if (body.toggleAvailable) {
      const product = await findCatalogProduct(id);
      if (!product) {
        return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
      }
      const nextStock = product.stockRemaining > 0 ? 0 : 10;
      const updated = await updateCatalogStock(id, nextStock);
      void appendAdminActionLog({
        adminName,
        source: "manual",
        action: "product_toggle",
        summary: `Disponibilité ${product.name} → stock ${nextStock}`,
        details: { productId: id, stock: nextStock },
      });
      return NextResponse.json({ product: updated });
    }

    if (body.stockRemaining !== undefined) {
      const updated = await updateCatalogStock(id, body.stockRemaining);
      void appendAdminActionLog({
        adminName,
        source: "manual",
        action: "stock_update",
        summary: `Réassort ${updated?.name ?? id} → ${body.stockRemaining}`,
        details: { productId: id, stock: body.stockRemaining },
      });

      if (
        updated &&
        updated.stockRemaining <= updated.stockMinimum
      ) {
        notifyTelegramSafe(
          `⚠️ Stock bas — ${updated.name}\nReste : ${updated.stockRemaining} (seuil ${updated.stockMinimum})`,
        );
      }

      return NextResponse.json({ product: updated });
    }

    const patch: CatalogProductPatch = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.price !== undefined) patch.price = body.price;
    if (body.description !== undefined) patch.description = body.description;
    if (body.category !== undefined) patch.category = body.category;
    if (body.keyword !== undefined) patch.keyword = body.keyword || undefined;
    if (body.stockMinimum !== undefined) patch.stockMinimum = body.stockMinimum;
    if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl;
    if (body.imageUrls !== undefined) patch.imageUrls = body.imageUrls;
    if (body.isPromotion !== undefined) patch.isPromotion = body.isPromotion;
    if (body.promotionPrice !== undefined) {
      patch.promotionPrice =
        body.promotionPrice === null ? undefined : body.promotionPrice;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    const updated = await updateCatalogProduct(id, patch);
    void appendAdminActionLog({
      adminName,
      source: "manual",
      action: body.price !== undefined ? "price_update" : "product_update",
      summary: `Modification produit ${updated?.name ?? id}`,
      details: { productId: id, patch },
    });

    return NextResponse.json({ product: updated });
  } catch {
    return NextResponse.json({ error: "Modification impossible" }, { status: 400 });
  }
}
