import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  getMenuById,
  updateMenu,
} from "@/lib/server/menu-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;
  const menu = await getMenuById(id);
  if (!menu) {
    return NextResponse.json({ error: "Menu introuvable" }, { status: 404 });
  }
  return NextResponse.json({ menu });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      date?: string;
      activateAt?: string;
      productIds?: string[];
      displayOrder?: number[];
      forceActiveEdit?: boolean;
    };

    const menu = await updateMenu(
      id,
      {
        date: body.date,
        activateAt: body.activateAt,
        productIds: body.productIds,
        displayOrder: body.displayOrder,
      },
      { forceActiveEdit: body.forceActiveEdit },
    );

    return NextResponse.json({ menu });
  } catch (error) {
    if (error instanceof Error && error.message === "MENU_ACTIVE_LOCKED") {
      return NextResponse.json(
        {
          error: "MENU_ACTIVE_LOCKED",
          message:
            "Ce menu est déjà actif. Confirmez la modification pour continuer.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Modification impossible" }, { status: 400 });
  }
}
