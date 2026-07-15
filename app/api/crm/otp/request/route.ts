import { NextResponse } from "next/server";

import { crmOtpRequestSchema } from "@/lib/crm/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { requestCustomerOtp } from "@/lib/server/crm/customer-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(
    `crm:otp-request:${ip}`,
    5,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez dans une minute." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = crmOtpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Numéro invalide" }, { status: 400 });
  }

  try {
    const result = await requestCustomerOtp(parsed.data.phone);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Envoi impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
