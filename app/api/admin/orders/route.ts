import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getServerOrdersForAdmin } from "@/lib/server/order-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "100");
  const days = Number(searchParams.get("days") ?? "7");

  const orders = await getServerOrdersForAdmin({ limit, days });

  return NextResponse.json({ orders }, {
    headers: { "Cache-Control": "no-store" },
  });
}
