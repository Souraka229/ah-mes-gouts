import { NextResponse } from "next/server";

import { crmLinkSchema } from "@/lib/crm/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { linkDeviceToCustomer } from "@/lib/server/crm/customer-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `crm:link:${ip}`,
    20,
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

  const parsed = crmLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    const { customer } = await linkDeviceToCustomer(parsed.data);
    return NextResponse.json({
      ok: true,
      customerId: customer.id,
      phone: customer.phone,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Liaison impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
