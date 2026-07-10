import { NextResponse } from "next/server";

import {
  getAdminContextAsync,
  isAdminAuthorizedAsync,
} from "@/lib/server/admin-auth";
import { getAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdministratorAsync } from "@/lib/server/admin-role";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const context = await getAdminContextAsync();
  const log = (await isAdministratorAsync())
    ? (await getAdminActionLog()).slice(0, 10)
    : [];

  return NextResponse.json({
    role: context?.role ?? null,
    isAdministrator: context?.role === "administrateur",
    adminName: context?.name ?? "Administrateur",
    recentActions: log,
  });
}
