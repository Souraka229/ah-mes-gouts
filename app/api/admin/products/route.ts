import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

import { PRODUCT_CATEGORIES } from "@/lib/admin/categories";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import {
  createCatalogProduct,
  getAdminCatalog,
} from "@/lib/server/admin-catalog-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  price: z.number().int().positive().max(10_000_000),
  category: z.string().trim().optional(),
  description: z.string().max(2000).optional(),
  stock: z.number().int().min(0).max(100_000).optional(),
  stockMinimum: z.number().int().min(0).max(10_000).optional(),
  keyword: z.string().max(80).optional(),
  imageUrl: z.string().max(500).optional(),
  imageUrls: z.array(z.string().max(500)).max(12).optional(),
  slug: z.string().max(120).optional(),
  importGift: z.literal(true).optional(),
});

export async function GET() {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const products = await getAdminCatalog();
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const raw: unknown = await request.json();
    const parsed = createProductSchema.safeParse(raw);
    if (!parsed.success && !(raw && typeof raw === "object" && "importGift" in raw && (raw as { importGift?: boolean }).importGift)) {
      return NextResponse.json({ error: "Données produit invalides" }, { status: 400 });
    }

    const body = (raw ?? {}) as {
      name?: string;
      price?: number;
      category?: string;
      description?: string;
      stock?: number;
      stockMinimum?: number;
      keyword?: string;
      imageUrl?: string;
      imageUrls?: string[];
      slug?: string;
      importGift?: boolean;
    };

    if (body.importGift) {
      const manifestPath = path.join(
        process.cwd(),
        "data",
        "gift-import-manifest.json",
      );
      if (!existsSync(manifestPath)) {
        return NextResponse.json(
          {
            error:
              "Manifest introuvable. Lancez d'abord : node scripts/import-gift-images.mjs",
          },
          { status: 400 },
        );
      }

      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        products: Array<{
          slug: string;
          name: string;
          price: number;
          description: string;
          keyword: string;
          category: string;
          imageUrl: string;
          imageUrls: string[];
          stockRemaining: number;
          stockMinimum: number;
        }>;
      };

      const existing = await getAdminCatalog();
      const existingSlugs = new Set(existing.map((p) => p.slug));
      const created = [];
      const skipped = [];

      for (const item of manifest.products) {
        if (existingSlugs.has(item.slug)) {
          skipped.push(item.slug);
          continue;
        }
        const product = await createCatalogProduct({
          name: item.name,
          price: item.price,
          category: item.category || "Entremets",
          description: item.description,
          keyword: item.keyword,
          imageUrl: item.imageUrl,
          imageUrls: item.imageUrls,
          slug: item.slug,
          stock: item.stockRemaining,
          stockMinimum: item.stockMinimum,
        });
        existingSlugs.add(product.slug);
        created.push(product);
      }

      void appendAdminActionLog({
        adminName: await getAdminDisplayNameAsync(),
        source: "manual",
        action: "product_import",
        summary: `Import gift : ${created.length} créé(s), ${skipped.length} ignoré(s)`,
      });

      return NextResponse.json({
        created: created.length,
        skipped: skipped.length,
        products: created,
      });
    }

    if (!parsed.success) {
      return NextResponse.json({ error: "Données produit invalides" }, { status: 400 });
    }

    const data = parsed.data;
    const category = data.category?.trim() || "Entremets";

    if (
      !PRODUCT_CATEGORIES.includes(
        category as (typeof PRODUCT_CATEGORIES)[number],
      )
    ) {
      return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
    }

    const product = await createCatalogProduct({
      name: data.name,
      price: data.price,
      category,
      description: data.description,
      stock: data.stock,
      stockMinimum: data.stockMinimum,
      keyword: data.keyword,
      imageUrl: data.imageUrl,
      imageUrls: data.imageUrls,
      slug: data.slug,
    });

    void appendAdminActionLog({
      adminName: await getAdminDisplayNameAsync(),
      source: "manual",
      action: "product_create",
      summary: `Création produit ${product.name} (${product.price} F)`,
      details: { productId: product.id, price: product.price },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Création impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

