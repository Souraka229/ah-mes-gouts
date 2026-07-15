import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { listAdminCustomers } from "@/lib/server/crm/admin-customers";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().max(80).optional(),
  sort: z.enum(["totalSpent", "lastOrderAt", "ordersCount"]).optional(),
});

export async function GET(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  try {
    const customers = await listAdminCustomers(parsed.data);
    return NextResponse.json(
      { customers },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur CRM";
    console.error("[admin/customers]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
