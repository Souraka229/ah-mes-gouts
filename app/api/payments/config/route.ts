import { NextResponse } from "next/server";

import { isFeexPayEnabled, isMockPaymentAllowed } from "@/lib/payments/feexpay";

/** Indique au checkout si FeexPay est actif (sans exposer de secrets). */
export async function GET() {
  return NextResponse.json({
    provider: isFeexPayEnabled()
      ? "feexpay"
      : isMockPaymentAllowed()
        ? "mock"
        : "unconfigured",
  });
}
