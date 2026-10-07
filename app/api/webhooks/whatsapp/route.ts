import { verifySignature } from "@kapso/whatsapp-cloud-api/server";
import { after } from "next/server";
import { NextResponse } from "next/server";

import { getClientIp } from "@/lib/rate-limit";
import { tryClaimWebhookIdempotencyKey } from "@/lib/whatsapp/bot-log";
import {
  enqueueWhatsAppInbound,
  processWhatsAppInboundJobIds,
} from "@/lib/whatsapp/inbound-queue";
import { sendKapsoWhatsAppText } from "@/lib/whatsapp/kapso-client";
import {
  expandKapsoReceivedPayloads,
  extractInboundFromKapso,
  verifyKapsoWebhookSignature,
} from "@/lib/whatsapp/kapso-webhook";
import {
  isAllowedKapsoPhoneNumberId,
  requireKapsoWebhookSecretInProduction,
} from "@/lib/whatsapp/security";
import { checkWhatsAppWebhookRateLimit } from "@/lib/whatsapp/rate-limit";
import { processWhatsAppMessage } from "@/lib/whatsapp/process-message";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  // Ping monitoring / qa:live (sans exposer de secret).
  if (!mode && !token) {
    return NextResponse.json({
      ok: true,
      service: "whatsapp-webhook",
      kapsoSecret: Boolean(process.env.KAPSO_WEBHOOK_SECRET?.trim()),
      kapsoSend: Boolean(
        process.env.KAPSO_API_KEY?.trim() &&
          process.env.KAPSO_PHONE_NUMBER_ID?.trim(),
      ),
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type MetaWebhookBody = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body: string };
        }>;
      };
    }>;
  }>;
};

function detectKapsoProvider(
  rawBody: string,
  kapsoEvent: string | null,
): boolean {
  if (kapsoEvent) return true;
  try {
    const peek = JSON.parse(rawBody) as { event?: string; message?: unknown };
    return Boolean(peek.event?.startsWith("whatsapp.") || peek.message);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await checkWhatsAppWebhookRateLimit(ip))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await request.text();
  const kapsoEvent = request.headers.get("x-webhook-event");
  const idempotencyKey = request.headers.get("x-idempotency-key")?.trim() ?? "";

  if (detectKapsoProvider(rawBody, kapsoEvent)) {
    if (!requireKapsoWebhookSecretInProduction()) {
      console.error("[whatsapp/security] KAPSO_WEBHOOK_SECRET missing in production");
      return NextResponse.json({ error: "Misconfigured" }, { status: 503 });
    }

    if (
      !verifyKapsoWebhookSignature(
        rawBody,
        request.headers.get("x-webhook-signature"),
      )
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
    }

    const eventName =
      kapsoEvent ??
      (typeof body === "object" &&
      body &&
      "event" in body &&
      typeof (body as { event: unknown }).event === "string"
        ? (body as { event: string }).event
        : null);

    if (idempotencyKey) {
      const claimed = await tryClaimWebhookIdempotencyKey(
        idempotencyKey,
        eventName,
      );
      if (!claimed) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    if (eventName && eventName !== "whatsapp.message.received") {
      return NextResponse.json({ ok: true, ignored: eventName });
    }

    const payloads = expandKapsoReceivedPayloads(body);
    const jobIds: string[] = [];

    for (const payload of payloads) {
      if (!isAllowedKapsoPhoneNumberId(payload.phone_number_id)) {
        console.warn("[whatsapp/security] unexpected phone_number_id");
        continue;
      }
      const inbound = extractInboundFromKapso(payload);
      if (!inbound) continue;

      const jobId = await enqueueWhatsAppInbound({
        fromPhone: inbound.fromPhone,
        text: inbound.text,
        messageId: inbound.messageId,
        phoneNumberId: payload.phone_number_id,
      });
      if (jobId) jobIds.push(jobId);
    }

    if (jobIds.length > 0) {
      after(async () => {
        await processWhatsAppInboundJobIds(jobIds);
      });
    }

    return NextResponse.json({ ok: true, provider: "kapso", queued: jobIds.length });
  }

  if (!verifyMetaSignature(request, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: MetaWebhookBody;
  try {
    body = JSON.parse(rawBody) as MetaWebhookBody;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const messages =
    body.entry?.flatMap((e) =>
      e.changes?.flatMap((c) => c.value?.messages ?? []) ?? [],
    ) ?? [];

  after(async () => {
    for (const msg of messages) {
      if (msg.type !== "text" || !msg.text?.body) continue;
      try {
        const reply = await processWhatsAppMessage({
          fromPhone: msg.from,
          text: msg.text.body,
          providerMessageId: msg.id,
        });
        if (!reply.suppressSend && reply.text.trim()) {
          await sendKapsoWhatsAppText(msg.from, reply.text);
        }
      } catch (err) {
        console.error("[whatsapp/meta-after]", err);
      }
    }
  });

  return NextResponse.json({ ok: true, provider: "meta" });
}

function verifyMetaSignature(request: Request, rawBody: string): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return verifySignature({
    appSecret: secret,
    rawBody,
    signatureHeader: request.headers.get("x-hub-signature-256") ?? undefined,
  });
}
