import { NextResponse } from "next/server";
import { z } from "zod";

import { validateCartStockWithCatalog } from "@/lib/validate-cart-stock";
import {
  attachVariants,
  getFullCatalog,
} from "@/lib/server/shop-catalog";

const bodySchema = z.object({
  items: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      quantity: z.number().int().positive(),
      variantCode: z.string().min(1).max(40).optional(),
    }),
  ),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Panier invalide" }, { status: 400 });
  }

  const catalog = await attachVariants(await getFullCatalog());
  const issues = validateCartStockWithCatalog(parsed.data.items, catalog);

  return NextResponse.json({ issues });
}
