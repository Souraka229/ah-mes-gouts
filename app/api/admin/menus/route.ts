import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  createMenu,
  duplicateMenu,
  getAllMenus,
} from "@/lib/server/menu-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const menus = await getAllMenus();
  return NextResponse.json(
    { menus },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      date?: string;
      activateAt?: string;
      productIds?: string[];
      displayOrder?: number[];
      duplicateFromId?: string;
    };

    if (body.duplicateFromId) {
      const targetDate = body.date ? new Date(body.date) : undefined;
      const menu = await duplicateMenu(body.duplicateFromId, targetDate);
      return NextResponse.json({ menu }, { status: 201 });
    }

    if (!body.date || !body.activateAt || !body.productIds?.length) {
      return NextResponse.json(
        { error: "date, activateAt et productIds requis" },
        { status: 400 },
      );
    }

    const displayOrder =
      body.displayOrder ??
      body.productIds.map((_, i) => i);

    const menu = await createMenu({
      date: body.date,
      activateAt: body.activateAt,
      productIds: body.productIds,
      displayOrder,
    });

    return NextResponse.json({ menu }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
}
