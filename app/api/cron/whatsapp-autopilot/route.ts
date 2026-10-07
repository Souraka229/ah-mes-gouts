import { NextResponse } from "next/server";

import { runWhatsAppAutopilot } from "@/lib/whatsapp/autopilot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!secret?.trim()) {
      return NextResponse.json(
        { error: "CRON_SECRET non configuré" },
        { status: 503 },
      );
    }
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const result = await runWhatsAppAutopilot();
  return NextResponse.json({ ok: true, ...result });
}
