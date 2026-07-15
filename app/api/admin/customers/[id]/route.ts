import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  getAdminDisplayNameAsync,
  isAdministratorAsync,
} from "@/lib/server/admin-role";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { getAdminCustomerDetail } from "@/lib/server/crm/admin-customers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!(await isAdministratorAsync())) {
    return NextResponse.json(
      { error: "Réservé à l'administrateur" },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Id requis" }, { status: 400 });
  }

  try {
    const customer = await getAdminCustomerDetail(id);
    if (!customer) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    void appendAdminActionLog({
      adminName: await getAdminDisplayNameAsync(),
      source: "manual",
      action: "customer_view",
      summary: `Consultation fiche client ${id}`,
      details: { customerId: id },
    });

    return NextResponse.json(
      { customer },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur CRM";
    console.error("[admin/customers/:id]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
