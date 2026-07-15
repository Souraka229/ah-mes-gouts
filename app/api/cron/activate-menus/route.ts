import { NextResponse } from "next/server";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { activateDueMenus } from "@/lib/server/menu-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!secret?.trim()) {
      return NextResponse.json(
        { error: "CRON_SECRET non configuré en production" },
        { status: 503 },
      );
    }
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  } else if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const activated = await activateDueMenus();

    return NextResponse.json({
      ok: true,
      activatedCount: activated.length,
      activated: activated.map((m) => ({ id: m.id, date: m.date })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Activation menu échouée";

    console.error("[cron/activate-menus]", message, error);

    try {
      await appendAdminActionLog({
        adminName: "Système",
        source: "manual",
        action: "menu_activation_failed",
        summary: `Échec activation menu programmé : ${message}`,
        details: {
          at: new Date().toISOString(),
          error: message,
        },
      });
    } catch (logErr) {
      console.error("[cron/activate-menus] Journal admin inaccessible:", logErr);
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint: "Vérifiez la base menus (Prisma) et le journal admin — le menu actif précédent reste en place.",
      },
      { status: 500 },
    );
  }
}
