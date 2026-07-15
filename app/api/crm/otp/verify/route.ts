import { NextResponse } from "next/server";

import { crmOtpVerifySchema } from "@/lib/crm/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyCustomerOtp } from "@/lib/server/crm/customer-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(
    `crm:otp-verify:${ip}`,
    10,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives" },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = crmOtpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    const result = await verifyCustomerOtp(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vérification échouée";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
