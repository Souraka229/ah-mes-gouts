import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  createDriver,
  listDriversWithTodayCounts,
} from "@/lib/server/driver-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const drivers = await listDriversWithTodayCounts();
  return NextResponse.json({ drivers });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { name?: string; phone?: string };
  try {
    body = (await request.json()) as { name?: string; phone?: string };
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  if (!name || !phone) {
    return NextResponse.json(
      { error: "Nom et téléphone requis." },
      { status: 400 },
    );
  }

  try {
    const driver = await createDriver({ name, phone });
    return NextResponse.json(
      {
        driver: {
          ...driver,
          deliveriesToday: 0,
          totalDeliveries: 0,
          lastOrderAt: null,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Impossible de créer le livreur (téléphone déjà utilisé ?)." },
      { status: 400 },
    );
  }
}
