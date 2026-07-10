import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminCatalog } from "@/lib/server/admin-catalog-repository";

export const dynamic = "force-dynamic";

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
