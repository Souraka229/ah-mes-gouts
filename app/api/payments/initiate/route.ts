import { NextResponse } from "next/server";
import { z } from "zod";

import { initiateOrderPayment } from "@/lib/payments/initiate-order-payment";
import { isMockPaymentAllowed } from "@/lib/payments/feexpay";
import { settlePaymentByReference } from "@/lib/payments/settle-payment";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 30;

const bodySchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(["mtn_momo", "moov_money", "celtiis_cash", "card"]),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `payments:initiate:${ip}`,
    10,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques instants." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const { orderId, method } = parsed.data;
  const deviceKey = request.headers.get("x-amg-device-key")?.trim() || null;

  try {
    const result = await initiateOrderPayment({
      orderId,
      method,
      deviceKey,
      salesChannel: "web",
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.httpStatus },
      );
    }

    return NextResponse.json({
      status: result.status,
      reference: result.reference,
      orderId: result.orderId,
      message: result.message,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    console.error("[payments/initiate] POST échoué:", error);
    return NextResponse.json(
      {
        error:
          "Le paiement n'a pas pu être traité pour le moment. Réessayez dans un instant.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim();

  if (!reference) {
    return NextResponse.json({ error: "reference requise" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `payments:status:${ip}`,
    60,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  try {
    if (isMockPaymentAllowed()) {
      return NextResponse.json({ status: "SUCCESS", reference });
    }

    const settled = await settlePaymentByReference(reference);

    if (settled.ok) {
      return NextResponse.json({
        status: "SUCCESS",
        reference,
        orderId: settled.orderId,
      });
    }

    if (settled.status === 202) {
      return NextResponse.json({ status: "PENDING", reference });
    }

    if (settled.status === 402) {
      return NextResponse.json({
        status: "FAILED",
        reference,
        error: settled.error,
      });
    }

    return NextResponse.json(
      { error: settled.error },
      { status: settled.status },
    );
  } catch (error) {
    console.error("[payments/initiate] GET échoué:", error);
    return NextResponse.json(
      {
        error: "Statut de paiement indisponible pour le moment.",
        status: "PENDING",
      },
      { status: 200 },
    );
  }
}
