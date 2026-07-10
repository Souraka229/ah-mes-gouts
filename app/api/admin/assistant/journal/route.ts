import { NextResponse } from "next/server";

import { getAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdministratorAsync } from "@/lib/server/admin-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await isAdministratorAsync()) {
    return NextResponse.json(
      { error: "Réservé aux administrateurs." },
      { status: 403 },
    );
  }

  const log = await getAdminActionLog();
  return NextResponse.json({ entries: log.slice(0, 20) });
}
