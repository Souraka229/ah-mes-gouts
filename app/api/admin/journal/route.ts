import { NextResponse } from "next/server";

import { isAdministratorAsync } from "@/lib/server/admin-role";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminActionLog } from "@/lib/server/admin-action-log";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthorizedAsync()) || !await isAdministratorAsync()) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const source = searchParams.get("source");

  let log = await getAdminActionLog();
  if (q) {
    log = log.filter(
      (e) =>
        e.summary.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.adminName.toLowerCase().includes(q),
    );
  }
  if (source === "manual" || source === "ai_assistant") {
    log = log.filter((e) => e.source === source);
  }

  return NextResponse.json({ entries: log }, { headers: { "Cache-Control": "no-store" } });
}
