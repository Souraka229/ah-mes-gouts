import { NextResponse } from "next/server";

import { buildAdminKpis } from "@/lib/admin/kpis";
import {
  formatDailySummary,
  sendTelegramMessage,
} from "@/lib/notifications/telegram";
import { getAllServerOrders } from "@/lib/server/order-repository";
import { getVisitStats } from "@/lib/server/site-visits";

export const dynamic = "force-dynamic";

/** Résumé quotidien Telegram — 19h (cron Vercel). Jamais bloquant. */
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
    const [orders, visits] = await Promise.all([
      getAllServerOrders(),
      getVisitStats(),
    ]);
    const kpis = buildAdminKpis(orders);
    const sent = await sendTelegramMessage(
      formatDailySummary({
        revenue: kpis.revenueToday,
        orders: kpis.ordersToday,
        visitors: visits.todayUnique,
        alerts: kpis.attentionCount,
      }),
    );
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[cron/telegram-daily]", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
