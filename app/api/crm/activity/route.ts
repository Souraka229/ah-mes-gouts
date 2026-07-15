import { NextResponse } from "next/server";

import { crmActivitySchema } from "@/lib/crm/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { recordActivity } from "@/lib/server/crm/customer-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(
    `crm:activity:${ip}`,
    60,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = crmActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    await recordActivity({
      deviceKey: parsed.data.deviceKey,
      type: parsed.data.type,
      productId: parsed.data.productId,
      productSlug: parsed.data.productSlug,
      productName: parsed.data.productName,
      metadata: parsed.data.metadata,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur activité";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
